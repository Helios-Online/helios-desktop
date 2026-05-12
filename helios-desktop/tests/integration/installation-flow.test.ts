import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import {
  installHermesAgent,
  isAgentInstalled,
  uninstallHermesAgent,
} from '../../src/shared/installer';

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  rmSync: vi.fn(),
  unlinkSync: vi.fn(),
  createReadStream: vi.fn(),
  createWriteStream: vi.fn(),
  ReadStream: vi.fn(),
  WriteStream: vi.fn(),
}));

vi.mock('child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    on: vi.fn(),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  }),
  exec: vi.fn((cmd, cb) => cb(null, '', '')),
  execSync: vi.fn().mockReturnValue(''),
}));

vi.mock('../../src/shared/platform', () => ({
  detectPlatform: vi.fn().mockReturnValue({ platform: 'linux', arch: 'x64' }),
  getInstallationPaths: vi.fn().mockReturnValue({
    base: '/home/user/.local/share/helios/hermes-agent',
    agent: '/home/user/.local/share/helios/hermes-agent',
    logs: '/home/user/.local/share/helios/hermes-agent/logs',
    serviceName: 'hermes-agent',
  }),
  ensureDirectoryExists: vi.fn(),
  getHermesReleaseInfo: vi.fn().mockReturnValue({
    filename: 'hermes-agent-linux-x64.tar.gz',
    checksumFilename: 'hermes-agent-linux-x64.tar.gz.sha256',
  }),
}));

vi.mock('../../src/shared/downloader', () => ({
  downloadFile: vi.fn().mockResolvedValue({ success: true, checksumMatch: true }),
  fetchJson: vi.fn().mockResolvedValue({
    tag_name: 'v1.0.0',
    assets: [
      { name: 'hermes-agent-linux-x64.tar.gz', browser_download_url: 'https://example.com/download' },
      { name: 'hermes-agent-linux-x64.tar.gz.sha256', browser_download_url: 'https://example.com/checksum' },
    ],
  }),
  fetchText: vi.fn().mockResolvedValue('abc123  hermes-agent-linux-x64.tar.gz'),
}));

describe('Installation Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  it('should complete installation successfully', async () => {
    const result = await installHermesAgent({});

    expect(result.success).toBe(true);
    expect(result.version).toBe('1.0.0');
  });

  it('should report failure on download error', async () => {
    const { downloadFile } = await import('../../src/shared/downloader');
    vi.mocked(downloadFile).mockResolvedValueOnce({ success: false, error: 'Network error' });

    const result = await installHermesAgent({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle checksum mismatch', async () => {
    const { downloadFile } = await import('../../src/shared/downloader');
    vi.mocked(downloadFile).mockResolvedValueOnce({ success: true, checksumMatch: false });

    const result = await installHermesAgent({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Checksum verification failed');
  });

  it('should detect installed agent', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = isAgentInstalled();
    expect(result).toBe(true);
  });

  it('should uninstall agent', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await uninstallHermesAgent();

    expect(fs.rmSync).toHaveBeenCalled();
  });
});
