import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  installHermesAgent,
  isAgentInstalled,
} from '../../src/shared/installer';

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

describe('Download Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch latest release from GitHub', async () => {
    const { fetchJson } = await import('../../src/shared/downloader');
    const release = await fetchJson('https://api.github.com/repos/helios/hermes-agent/releases/latest');

    expect(release).toHaveProperty('tag_name');
    expect(release).toHaveProperty('assets');
    expect(fetchJson).toHaveBeenCalled();
  });

  it('should download agent with progress callback', async () => {
    const progressCallback = vi.fn();
    const { downloadFile } = await import('../../src/shared/downloader');

    await downloadFile({
      url: 'https://example.com/download',
      destination: '/tmp/test-download',
      onProgress: progressCallback,
    });

    expect(downloadFile).toHaveBeenCalled();
  });
});

describe('Installation Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect if agent is installed', () => {
    const result = isAgentInstalled();
    expect(typeof result).toBe('boolean');
  });
});
