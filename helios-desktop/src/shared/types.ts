export type AgentStatus = 'running' | 'stopped' | 'installing' | 'error' | 'not_installed';

export interface AgentInfo {
  status: AgentStatus;
  version: string | null;
  port?: number;
  error?: string;
}

export interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

export interface InstallationProgress {
  stage: 'downloading' | 'verifying' | 'installing' | 'configuring';
  percent?: number;
  message?: string;
}

export interface PlatformInfo {
  platform: 'windows' | 'mac' | 'linux';
  arch: 'x64' | 'arm64';
}

export interface InstallationPaths {
  base: string;
  agent: string;
  logs: string;
  serviceName: string;
}

declare global {
  interface Window {
    helios: {
      getAgentStatus: () => Promise<AgentInfo>;
      updateTrayStatus: (status: 'running' | 'stopped' | 'installing' | 'error') => Promise<{ success: boolean }>;
      showErrorDialog: (options: { title: string; message: string }) => Promise<{ response: number }>;
      installAgent: () => Promise<{ success: boolean; error?: string }>;
      deployAgent: () => Promise<{ success: boolean; error?: string }>;
      stopAgent: () => Promise<{ success: boolean; error?: string }>;
      restartAgent: () => Promise<{ success: boolean; error?: string }>;
      getAgentLogs: (lines: number) => Promise<string[]>;
      onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
      onInstallationProgress: (callback: (progress: InstallationProgress) => void) => () => void;
      onAgentStatusChange: (callback: (status: AgentInfo) => void) => () => void;
    };
  }
}

export {};
