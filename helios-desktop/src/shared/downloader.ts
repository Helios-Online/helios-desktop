import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { URL } from 'url';
import log from 'electron-log';
import type { DownloadProgress } from './types';

export interface DownloadOptions {
  url: string;
  destination: string;
  expectedChecksum?: string;
  onProgress?: (progress: DownloadProgress) => void;
  onCancel?: () => boolean;
}

export interface DownloadResult {
  success: boolean;
  error?: string;
  checksumMatch?: boolean;
}

export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
  const { url, destination, expectedChecksum, onProgress } = options;

  log.info(`Downloading from ${url} to ${destination}`);

  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const req = protocol.get(url, { headers: { 'User-Agent': 'Helios-Desktop/1.0' } }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        log.info(`Redirect to ${response.headers.location}`);
        downloadFile({ ...options, url: response.headers.location }).then(resolve);
        return;
      }

      if (response.statusCode !== 200) {
        resolve({ success: false, error: `HTTP ${response.statusCode}: ${response.statusMessage}` });
        return;
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;
      let lastUpdate = Date.now();
      let bytesPerSecond = 0;

      const fileStream = fs.createWriteStream(destination);
      const hash = expectedChecksum ? crypto.createHash('sha256') : null;

      response.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        if (hash) hash.update(chunk);

        const now = Date.now();
        const elapsed = (now - lastUpdate) / 1000;
        if (elapsed >= 0.5) {
          bytesPerSecond = chunk.length / elapsed;
          lastUpdate = now;

          if (onProgress && totalSize > 0) {
            onProgress({
              percent: (downloadedSize / totalSize) * 100,
              bytesPerSecond,
              total: totalSize,
              transferred: downloadedSize,
            });
          }
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();

        if (onProgress && totalSize > 0) {
          onProgress({
            percent: 100,
            bytesPerSecond: 0,
            total: totalSize,
            transferred: downloadedSize,
          });
        }

        if (hash && expectedChecksum) {
          const computedChecksum = hash.digest('hex');
          const checksumMatch = computedChecksum === expectedChecksum;

          log.info(`Checksum: computed=${computedChecksum}, expected=${expectedChecksum}, match=${checksumMatch}`);

          if (!checksumMatch) {
            fs.unlinkSync(destination);
            resolve({ success: false, error: 'Checksum verification failed', checksumMatch: false });
            return;
          }
        }

        resolve({ success: true, checksumMatch: true });
      });

      response.on('error', (err) => {
        log.error(`Response error: ${err.message}`);
        fs.unlinkSync(destination);
        resolve({ success: false, error: err.message });
      });
    });

    req.on('error', (err) => {
      log.error(`Request error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      if (fs.existsSync(destination)) {
        fs.unlinkSync(destination);
      }
      resolve({ success: false, error: 'Download timed out' });
    });
  });
}

export async function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const req = protocol.get(url, { headers: { 'User-Agent': 'Helios-Desktop/1.0' } }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

export async function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const req = protocol.get(url, { headers: { 'User-Agent': 'Helios-Desktop/1.0' } }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}
