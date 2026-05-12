import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import type { PlatformInfo, InstallationPaths } from './types';

export function detectPlatform(): PlatformInfo {
  const platform = process.platform;
  const arch = os.arch();

  let resultPlatform: 'windows' | 'mac' | 'linux';
  switch (platform) {
    case 'win32':
      resultPlatform = 'windows';
      break;
    case 'darwin':
      resultPlatform = 'mac';
      break;
    case 'linux':
      resultPlatform = 'linux';
      break;
    default:
      log.warn(`Unknown platform ${platform}, defaulting to linux`);
      resultPlatform = 'linux';
  }

  let resultArch: 'x64' | 'arm64';
  switch (arch) {
    case 'x64':
    case 'amd64':
      resultArch = 'x64';
      break;
    case 'arm64':
    case 'aarch64':
      resultArch = 'arm64';
      break;
    default:
      log.warn(`Unknown arch ${arch}, defaulting to x64`);
      resultArch = 'x64';
  }

  return { platform: resultPlatform, arch: resultArch };
}

export function getInstallationPaths(platformInfo: PlatformInfo): InstallationPaths {
  const homeDir = os.homedir();
  let base: string;
  let agent: string;
  let logs: string;
  let serviceName: string;

  switch (platformInfo.platform) {
    case 'windows':
      base = path.join(process.env.APPDATA || homeDir, 'Helios', 'HermesAgent');
      agent = base;
      logs = path.join(base, 'logs');
      serviceName = 'HermesAgent';
      break;
    case 'mac':
      base = path.join(homeDir, 'Library', 'Application Support', 'Helios', 'HermesAgent');
      agent = base;
      logs = path.join(base, 'logs');
      serviceName = 'ai.helios.hermesagent';
      break;
    case 'linux':
      base = path.join(homeDir, '.local', 'share', 'helios', 'hermes-agent');
      agent = base;
      logs = path.join(base, 'logs');
      serviceName = 'hermes-agent';
      break;
  }

  return { base, agent, logs, serviceName };
}

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log.info(`Created directory: ${dirPath}`);
  }
}

export function getHermesReleaseInfo(platformInfo: PlatformInfo): { filename: string; checksumFilename: string } {
  const ext = platformInfo.platform === 'windows' ? 'zip' : 'tar.gz';
  const archSuffix = platformInfo.arch === 'arm64' ? '-arm64' : '';

  const filename = `hermes-agent-${platformInfo.platform}${archSuffix}.${ext}`;
  const checksumFilename = `${filename}.sha256`;

  return { filename, checksumFilename };
}
