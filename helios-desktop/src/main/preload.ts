import { contextBridge, ipcRenderer } from 'electron';

export interface AgentStatus {
  status: 'running' | 'stopped' | 'installing' | 'error' | 'not_installed';
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

contextBridge.exposeInMainWorld('helios', {
  getAgentStatus: (): Promise<AgentStatus> => ipcRenderer.invoke('get-agent-status'),

  updateTrayStatus: (status: 'running' | 'stopped' | 'installing' | 'error'): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('update-tray-status', status),

  showErrorDialog: (options: { title: string; message: string }): Promise<{ response: number }> =>
    ipcRenderer.invoke('show-error-dialog', options),

  installAgent: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('install-agent'),

  deployAgent: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('deploy-agent'),

  stopAgent: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('stop-agent'),

  restartAgent: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('restart-agent'),

  getAgentLogs: (lines: number): Promise<string[]> =>
    ipcRenderer.invoke('get-agent-logs', lines),

  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const subscription = (_: any, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },

  onInstallationProgress: (callback: (progress: InstallationProgress) => void) => {
    const subscription = (_: any, progress: InstallationProgress) => callback(progress);
    ipcRenderer.on('installation-progress', subscription);
    return () => ipcRenderer.removeListener('installation-progress', subscription);
  },

  onAgentStatusChange: (callback: (status: AgentStatus) => void) => {
    const subscription = (_: any, status: AgentStatus) => callback(status);
    ipcRenderer.on('agent-status-change', subscription);
    return () => ipcRenderer.removeListener('agent-status-change', subscription);
  },
});
