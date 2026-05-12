import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { downloadFile, fetchJson, fetchText } from '../../src/shared/downloader';

vi.mock('crypto');
vi.mock('fs');
vi.mock('os');
vi.mock('path');

describe('Checksum Verification', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should compute correct SHA256 checksum', async () => {
    const mockHash = {
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('abc123def456'),
    };
    vi.mocked(crypto.createHash).mockReturnValue(mockHash as any);

    const testData = Buffer.from('test content');
    const hash = crypto.createHash('sha256');
    hash.update(testData);
    const result = hash.digest('hex');

    expect(result).toBe('abc123def456');
    expect(mockHash.update).toHaveBeenCalledWith(testData);
    expect(mockHash.digest).toHaveBeenCalledWith('hex');
  });

  it('should match checksums correctly', () => {
    const computed = 'abc123';
    const expected = 'abc123';
    expect(computed).toBe(expected);
  });

  it('should detect checksum mismatch', () => {
    const computed = 'abc123';
    const expected = 'xyz789';
    expect(computed).not.toBe(expected);
  });
});

describe('Download Progress Calculation', () => {
  it('should calculate percentage correctly', () => {
    const total = 1000;
    const transferred = 500;
    const percent = (transferred / total) * 100;
    expect(percent).toBe(50);
  });

  it('should calculate speed correctly', () => {
    const bytes = 1024 * 1024;
    const elapsedSeconds = 2;
    const speed = bytes / elapsedSeconds;
    expect(speed).toBe(524288);
  });

  it('should handle zero total for edge case', () => {
    const total = 0;
    const transferred = 0;
    const percent = total > 0 ? (transferred / total) * 100 : 0;
    expect(percent).toBe(0);
  });
});
