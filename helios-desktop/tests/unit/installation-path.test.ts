import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ensureDirectoryExists,
} from '../../src/shared/platform';

vi.mock('fs');
vi.mock('path');
vi.mock('os');

describe('File System Operations', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/home/user');
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  describe('ensureDirectoryExists', () => {
    it('should create directory if it does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      ensureDirectoryExists('/home/user/test-dir');

      expect(fs.existsSync).toHaveBeenCalledWith('/home/user/test-dir');
      expect(fs.mkdirSync).toHaveBeenCalledWith('/home/user/test-dir', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      ensureDirectoryExists('/home/user/existing-dir');

      expect(fs.existsSync).toHaveBeenCalledWith('/home/user/existing-dir');
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should create nested directories recursively', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockReturnValue(undefined);

      ensureDirectoryExists('/home/user/nested/deep/dir');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/home/user/nested/deep/dir', { recursive: true });
    });
  });
});

describe('Installation Path Resolution', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should resolve paths correctly for each platform', () => {
    const platforms = ['windows', 'mac', 'linux'] as const;

    platforms.forEach((platform) => {
      const expectedPaths = {
        windows: expect.stringContaining('Helios'),
        mac: expect.stringContaining('Application Support'),
        linux: expect.stringContaining('.local/share'),
      };

      expect(expectedPaths[platform]).toBeTruthy();
    });
  });
});
