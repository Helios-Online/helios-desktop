interface AgentInfo {
  status: 'running' | 'stopped' | 'installing' | 'error' | 'not_installed';
  version: string | null;
  port?: number;
  error?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

interface InstallationProgress {
  stage: 'downloading' | 'verifying' | 'installing' | 'configuring';
  percent?: number;
  message?: string;
}

const installBtn = document.getElementById('installBtn') as HTMLButtonElement;
const deployBtn = document.getElementById('deployBtn');
const stopBtn = document.getElementById('stopBtn');
const restartBtn = document.getElementById('restartBtn');
const refreshLogsBtn = document.getElementById('refreshLogsBtn');
const statusDot = document.getElementById('statusDot') as HTMLDivElement;
const statusTitle = document.getElementById('statusTitle') as HTMLHeadingElement;
const statusDescription = document.getElementById('statusDescription') as HTMLParagraphElement;
const headerStatusDot = document.getElementById('headerStatusDot') as HTMLSpanElement;
const headerStatusText = document.getElementById('headerStatusText') as HTMLSpanElement;
const portInfo = document.getElementById('portInfo') as HTMLDivElement;
const portNumber = document.getElementById('portNumber') as HTMLSpanElement;
const logsPanel = document.getElementById('logsPanel') as HTMLDivElement;
const progressModal = document.getElementById('progressModal') as HTMLDivElement;
const progressTitle = document.getElementById('progressTitle') as HTMLHeadingElement;
const progressBar = document.getElementById('progressBar') as HTMLDivElement;
const progressInfo = document.getElementById('progressInfo') as HTMLParagraphElement;

let currentStatus: AgentInfo = { status: 'not_installed', version: null };

function updateUI(status: AgentInfo): void {
  currentStatus = status;
  const statusClass = status.status;

  statusDot.className = `large-status-dot ${statusClass}`;
  headerStatusDot.className = `status-dot ${statusClass}`;

  const statusTitles: Record<string, string> = {
    running: 'Agent Running',
    stopped: 'Agent Stopped',
    installing: 'Installing...',
    error: 'Error',
    not_installed: 'Not Installed',
  };

  const statusDescriptions: Record<string, string> = {
    running: `Version ${status.version || 'unknown'}`,
    stopped: 'Click Deploy to start the agent',
    installing: 'Please wait while Hermes Agent is being installed',
    error: status.error || 'An error occurred',
    not_installed: 'Click Install to download and set up Hermes Agent',
  };

  statusTitle.textContent = statusTitles[status.status] || 'Unknown';
  statusDescription.textContent = statusDescriptions[status.status] || '';
  headerStatusText.textContent = statusTitles[status.status] || 'Unknown';

  if (status.port) {
    portInfo.style.display = 'block';
    portNumber.textContent = String(status.port);
  } else {
    portInfo.style.display = 'none';
  }

  updateButtons(status.status);
}

function updateButtons(status: string): void {
  const buttonGroup = document.getElementById('buttonGroup') as HTMLDivElement;

  switch (status) {
    case 'not_installed':
      buttonGroup.innerHTML = '<button class="btn-primary" id="installBtn">Install Hermes Agent</button>';
      document.getElementById('installBtn')?.addEventListener('click', handleInstall);
      break;
    case 'stopped':
      buttonGroup.innerHTML = `
        <button class="btn-success" id="deployBtn">Deploy</button>
        <button class="btn-secondary" id="installBtn">Reinstall</button>
      `;
      document.getElementById('deployBtn')?.addEventListener('click', handleDeploy);
      document.getElementById('installBtn')?.addEventListener('click', handleInstall);
      break;
    case 'running':
      buttonGroup.innerHTML = `
        <button class="btn-danger" id="stopBtn">Stop</button>
        <button class="btn-secondary" id="restartBtn">Restart</button>
      `;
      document.getElementById('stopBtn')?.addEventListener('click', handleStop);
      document.getElementById('restartBtn')?.addEventListener('click', handleRestart);
      break;
    case 'installing':
      buttonGroup.innerHTML = '<button class="btn-secondary" disabled>Installing...</button>';
      break;
    case 'error':
      buttonGroup.innerHTML = `
        <button class="btn-primary" id="installBtn">Retry Install</button>
        <button class="btn-secondary" id="deployBtn">Deploy</button>
      `;
      document.getElementById('installBtn')?.addEventListener('click', handleInstall);
      document.getElementById('deployBtn')?.addEventListener('click', handleDeploy);
      break;
  }
}

async function handleInstall(): Promise<void> {
  progressModal.classList.add('active');
  progressTitle.textContent = 'Installing Hermes Agent';
  progressBar.style.width = '0%';
  progressInfo.textContent = 'Starting download...';

  updateUI({ ...currentStatus, status: 'installing' });

  const result = await window.helios.installAgent();

  if (!result.success) {
    const dialogResult = await window.helios.showErrorDialog({
      title: 'Installation Failed',
      message: result.error || 'An unknown error occurred during installation.',
    });

    if (dialogResult.response === 0) {
      handleInstall();
    } else {
      progressModal.classList.remove('active');
      updateUI({ ...currentStatus, status: 'error', error: result.error });
    }
  } else {
    progressModal.classList.remove('active');
    updateUI({ status: 'stopped', version: null });
  }
}

async function handleDeploy(): Promise<void> {
  const result = await window.helios.deployAgent();
  if (!result.success) {
    await window.helios.showErrorDialog({
      title: 'Deployment Failed',
      message: result.error || 'Failed to deploy agent.',
    });
  }
}

async function handleStop(): Promise<void> {
  const result = await window.helios.stopAgent();
  if (!result.success) {
    await window.helios.showErrorDialog({
      title: 'Stop Failed',
      message: result.error || 'Failed to stop agent.',
    });
  }
}

async function handleRestart(): Promise<void> {
  const result = await window.helios.restartAgent();
  if (!result.success) {
    await window.helios.showErrorDialog({
      title: 'Restart Failed',
      message: result.error || 'Failed to restart agent.',
    });
  }
}

async function loadLogs(): Promise<void> {
  const logs = await window.helios.getAgentLogs(100);
  logsPanel.textContent = logs.length > 0 ? logs.join('\n') : 'No logs available';
}

async function initialize(): Promise<void> {
  const status = await window.helios.getAgentStatus();
  updateUI(status);

  window.helios.onDownloadProgress((progress: DownloadProgress) => {
    progressBar.style.width = `${progress.percent}%`;
    const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(2);
    progressInfo.textContent = `Downloading... ${speed} MB/s (${Math.round(progress.percent)}%)`;
  });

  window.helios.onInstallationProgress((progress: InstallationProgress) => {
    const stageMessages: Record<string, string> = {
      downloading: 'Downloading...',
      verifying: 'Verifying checksum...',
      installing: 'Installing files...',
      configuring: 'Configuring service...',
    };
    progressTitle.textContent = 'Installing Hermes Agent';
    progressInfo.textContent = progress.message || stageMessages[progress.stage] || 'Processing...';
    if (progress.percent !== undefined) {
      progressBar.style.width = `${progress.percent}%`;
    }
  });

  window.helios.onAgentStatusChange((status: AgentInfo) => {
    updateUI(status);
  });

  refreshLogsBtn?.addEventListener('click', loadLogs);
}

initialize();
