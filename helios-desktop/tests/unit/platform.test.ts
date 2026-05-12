import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as os from 'os';
import {
  detectPlatform,
  getInstallationPaths,
  getHermesReleaseInfo,
} from '../../src/shared/platform';

vi.mock('os');

describe('Platform Detection', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should detect Windows platform correctly', () => {
    vi.mocked(os.platform).mockReturnValue('win32');
    vi.mocked(os.arch).mockReturnValue('x64');

    const result = detectPlatform();
    expect(result.platform).toBe('windows');
    expect(result.arch).toBe('x64');
  });

  it('should detect macOS platform correctly', () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(os.arch).mockReturnValue('arm64');

    const result = detectPlatform();
    expect(result.platform).toBe('mac');
    expect(result.arch).toBe('arm64');
  });

  it('should detect Linux platform correctly', () => {
    vi.mocked(os.platform).mockReturnValue('linux');
    vi.mocked(os.arch).mockReturnValue('x64');

    const result = detectPlatform();
    expect(result.platform).toBe('linux');
    expect(result.arch).toBe('x64');
  });

  it('should handle amd64 arch as x64', () => {
    vi.mocked(os.platform).mockReturnValue('linux');
    vi.mocked(os.arch).mockReturnValue('amd64');

    const result = detectPlatform();
    expect(result.arch).toBe('x64');
  });

  it('should handle aarch64 arch as arm64', () => {
    vi.mocked(os.platform).mockReturnValue('linux');
    vi.mocked(os.arch).mockReturnValue('aarch64');

    const result = detectPlatform();
    expect(result.arch).toBe('arm64');
  });

  it('should default unknown platform to linux', () => {
    vi.mocked(os.platform).mockReturnValue('freebsd');
    vi.mocked(os.arch).mockReturnValue('x64');

    const result = detectPlatform();
    expect(result.platform).toBe('linux');
  });
});

describe('Installation Paths', () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue('/home/user');
    vi.mocked(os.platform).mockReturnValue('linux');
    vi.mocked(process.env).mockReturnValue({} as any);
  });

  it('should return correct Windows paths', () => {
    vi.mocked(os.platform).mockReturnValue('win32');
    vi.mocked(process.env).mockReturnValue({ APPDATA: 'C:\\Users\\user\\AppData\\Roaming' } as any);

    const platformInfo = { platform: 'windows' as const, arch: 'x64' as const };
    const paths = getInstallationPaths(platformInfo);

    expect(paths.base).toContain('Helios');
    expect(paths.base).toContain('HermesAgent');
    expect(paths.serviceName).toBe('HermesAgent');
  });

  it('should return correct macOS paths', () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(os.homedir).mockReturnValue('/Users/user');

    const platformInfo = { platform: 'mac' as const, arch: 'x64' as const };
    const paths = getInstallationPaths(platformInfo);

    expect(paths.base).toContain('Library/Application Support');
    expect(paths.base).toContain('Helios');
    expect(paths.serviceName).toBe('ai.helios.hermesagent');
  });

  it('should return correct Linux paths', () => {
    vi.mocked(os.platform).mockReturnValue('linux');
    vi.mocked(os.homedir).mockReturnValue('/home/user');

    const platformInfo = { platform: 'linux' as const, arch: 'x64' as const };
    const paths = getInstallationPaths(platformInfo);

    expect(paths.base).toContain('.local/share/helios');
    expect(paths.serviceName).toBe('hermes-agent');
  });
});

describe('Hermes Release Info', () => {
  it('should return correct filename for Windows x64', () => {
    const info = getHermesReleaseInfo({ platform: 'windows', arch: 'x64' });
    expect(info.filename).toBe('hermes-agent-windows-x64.zip');
    expect(info.checksumFilename).toBe('hermes-agent-windows-x64.zip.sha256');
  });

  it('should return correct filename for macOS arm64', () => {
    const info = getHermesReleaseInfo({ platform: 'mac', arch: 'arm64' });
    expect(info.filename).toBe('hermes-agent-mac-arm64.tar.gz');
    expect(info.checksumFilename).toBe('hermes-agent-mac-arm64.tar.gz.sha256');
  });

  it('should return correct filename for Linux x64', () => {
    const info = getHermesReleaseInfo({ platform: 'linux', arch: 'x64' });
    expect(info.filename).toBe('hermes-agent-linux-x64.tar.gz');
  });
});
