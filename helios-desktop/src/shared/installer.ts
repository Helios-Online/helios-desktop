import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import log from 'electron-log';
import * as unzipper from 'unzipper';
import * as tar from 'tar-fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  detectPlatform,
  getInstallationPaths,
  ensureDirectoryExists,
  getHermesReleaseInfo,
} from './platform';
import { downloadFile, fetchText, fetchJson } from './downloader';
import type { PlatformInfo, InstallationPaths, InstallationProgress } from './types';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_REPO = 'helios/hermes-agent';
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;

export interface InstallerOptions {
  onProgress?: (progress: InstallationProgress) => void;
}

export interface InstallerResult {
  success: boolean;
  error?: string;
  version?: string;
}

async function getLatestRelease(): Promise<{ tagName: string; assets: { name: string; browserDownloadUrl: string }[] }> {
  const url = `${GITHUB_API_URL}/repos/${GITHUB_REPO}/releases/latest`;
  const release = await fetchJson<{ tag_name: string; assets: { name: string; browser_download_url: string }[] }>(url);
  return {
    tagName: release.tag_name,
    assets: release.assets.map((a) => ({ name: a.name, browserDownloadUrl: a.browser_download_url })),
  };
}

async function extractArchive(
  archivePath: string,
  destination: string,
  platform: 'windows' | 'mac' | 'linux',
  onProgress?: (stage: string) => void
): Promise<void> {
  ensureDirectoryExists(destination);

  if (platform === 'windows') {
    onProgress?.('Extracting archive...');
    const directory = await unzipper.Open.file(archivePath);
    await directory.extract({ path: destination });
  } else {
    onProgress?.('Extracting archive...');
    await new Promise<void>((resolve, reject) => {
      createReadStream(archivePath)
        .pipe(tar.extract({ path: destination }))
        .on('finish', () => resolve())
        .on('error', reject);
    });
  }
}

function cleanupFiles(...files: string[]): void {
  for (const file of files) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        log.info(`Cleaned up: ${file}`);
      } catch (err) {
        log.warn(`Failed to clean up ${file}: ${err}`);
      }
    }
  }
}

export async function installHermesAgent(options: InstallerOptions = {}): Promise<InstallerResult> {
  const { onProgress } = options;
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);
  const releaseInfo = getHermesReleaseInfo(platformInfo);

  log.info('Starting Hermes Agent installation');
  log.info(`Platform: ${platformInfo.platform} ${platformInfo.arch}`);
  log.info(`Install path: ${installPaths.base}`);

  try {
    onProgress?.({ stage: 'downloading', message: 'Fetching release information...' });

    const release = await getLatestRelease();
    const version = release.tagName.replace(/^v/, '');
    log.info(`Latest version: ${version}`);

    const asset = release.assets.find((a) => a.name === releaseInfo.filename);
    if (!asset) {
      return { success: false, error: `Asset not found: ${releaseInfo.filename}` };
    }

    const checksumAsset = release.assets.find((a) => a.name === releaseInfo.checksumFilename);
    let expectedChecksum: string | undefined;

    if (checksumAsset) {
      onProgress?.({ stage: 'verifying', message: 'Fetching checksum...' });
      try {
        const checksumContent = await fetchText(checksumAsset.browserDownloadUrl);
        const checksumLine = checksumContent.split('\n').find((line) => line.includes(releaseInfo.filename));
        if (checksumLine) {
          expectedChecksum = checksumLine.split(/\s+/)[0];
        }
      } catch (err) {
        log.warn(`Failed to fetch checksum: ${err}`);
      }
    }

    const tempDir = path.join(os.tmpdir(), 'helios-desktop-install');
    ensureDirectoryExists(tempDir);
    const archivePath = path.join(tempDir, releaseInfo.filename);

    onProgress?.({ stage: 'downloading', percent: 0, message: 'Downloading Hermes Agent...' });

    const downloadResult = await downloadFile({
      url: asset.browserDownloadUrl,
      destination: archivePath,
      expectedChecksum,
      onProgress: (progress) => {
        onProgress?.({
          stage: 'downloading',
          percent: progress.percent,
          message: `Downloading... ${(progress.bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`,
        });
      },
    });

    if (!downloadResult.success) {
      cleanupFiles(archivePath);
      return { success: false, error: downloadResult.error };
    }

    if (downloadResult.checksumMatch === false) {
      cleanupFiles(archivePath);
      return { success: false, error: 'Checksum verification failed' };
    }

    onProgress?.({ stage: 'installing', message: 'Installing files...' });
    await extractArchive(archivePath, installPaths.base, platformInfo.platform, (stage) => {
      onProgress?.({ stage: 'installing', message: stage });
    });

    cleanupFiles(archivePath);

    onProgress?.({ stage: 'configuring', message: 'Setting up service...' });
    await registerService(platformInfo, installPaths);

    log.info('Installation completed successfully');
    return { success: true, version };
  } catch (err) {
    log.error('Installation failed:', err);
    return { success: false, error: String(err) };
  }
}

async function registerService(platformInfo: PlatformInfo, installPaths: InstallationPaths): Promise<void> {
  const executablePath = path.join(installPaths.agent, getExecutableName(platformInfo.platform));
  ensureDirectoryExists(installPaths.logs);

  log.info(`Registering service: ${installPaths.serviceName}`);
  log.info(`Executable: ${executablePath}`);

  switch (platformInfo.platform) {
    case 'windows':
      await registerWindowsService(installPaths, executablePath);
      break;
    case 'mac':
      await registerMacService(installPaths, executablePath);
      break;
    case 'linux':
      await registerLinuxService(installPaths, executablePath);
      break;
  }
}

function getExecutableName(platform: 'windows' | 'mac' | 'linux'): string {
  switch (platform) {
    case 'windows':
      return 'hermes-agent.exe';
    case 'mac':
    case 'linux':
      return 'hermes-agent';
  }
}

async function registerWindowsService(installPaths: InstallationPaths, executablePath: string): Promise<void> {
  const { exec } = await import('child_process');
  const Service = await import('node-windows');

  return new Promise((resolve, reject) => {
    const service = new Service({
      name: installPaths.serviceName,
      description: 'Hermes Agent for Helios Desktop',
      script: executablePath,
      nodeOptions: ['--harmony'],
      logpath: installPaths.logs,
    });

    service.on('installed', () => {
      log.info('Windows service installed');
      resolve();
    });

    service.on('error', (err) => {
      log.error('Windows service error:', err);
      reject(err);
    });

    exec(`nssm install ${installPaths.serviceName} "${executablePath}"`, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function registerMacService(installPaths: InstallationPaths, executablePath: string): Promise<void> {
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${installPaths.serviceName}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${executablePath}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${path.join(installPaths.logs, 'stdout.log')}</string>
  <key>StandardErrorPath</key>
  <string>${path.join(installPaths.logs, 'stderr.log')}</string>
</dict>
</plist>`;

  const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${installPaths.serviceName}.plist`);
  const plistDir = path.dirname(plistPath);
  ensureDirectoryExists(plistDir);
  fs.writeFileSync(plistPath, plistContent);
  log.info(`macOS plist written to ${plistPath}`);
}

async function registerLinuxService(installPaths: InstallationPaths, executablePath: string): Promise<void> {
  const serviceContent = `[Unit]
Description=Hermes Agent for Helios Desktop
After=network.target

[Service]
Type=simple
ExecStart=${executablePath}
Restart=always
RestartSec=5
StandardOutput=append:${path.join(installPaths.logs, 'stdout.log')}
StandardError=append:${path.join(installPaths.logs, 'stderr.log')}

[Install]
WantedBy=default.target`;

  const serviceDir = path.join(os.homedir(), '.config', 'systemd', 'user');
  ensureDirectoryExists(serviceDir);
  const servicePath = path.join(serviceDir, `${installPaths.serviceName}.service`);
  fs.writeFileSync(servicePath, serviceContent);
  log.info(`Linux service written to ${servicePath}`);
}

export function isAgentInstalled(): boolean {
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);
  const executablePath = path.join(installPaths.agent, getExecutableName(platformInfo.platform));
  return fs.existsSync(executablePath);
}

export async function uninstallHermesAgent(): Promise<void> {
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);

  if (fs.existsSync(installPaths.base)) {
    fs.rmSync(installPaths.base, { recursive: true, force: true });
    log.info(`Removed installation directory: ${installPaths.base}`);
  }
}
