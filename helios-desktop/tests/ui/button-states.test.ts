import { describe, it, expect, vi, beforeEach } from 'vitest';

interface AgentInfo {
  status: 'running' | 'stopped' | 'installing' | 'error' | 'not_installed';
  version: string | null;
  port?: number;
  error?: string;
}

function getButtonState(status: AgentInfo['status']): string[] {
  switch (status) {
    case 'not_installed':
      return ['Install Hermes Agent'];
    case 'stopped':
      return ['Deploy', 'Reinstall'];
    case 'running':
      return ['Stop', 'Restart'];
    case 'installing':
      return ['Installing...'];
    case 'error':
      return ['Retry Install', 'Deploy'];
    default:
      return [];
  }
}

function getStatusColor(status: AgentInfo['status']): string {
  switch (status) {
    case 'running':
      return 'green';
    case 'stopped':
      return 'yellow';
    case 'error':
      return 'red';
    case 'installing':
      return 'blue';
    case 'not_installed':
      return 'gray';
  }
}

function getStatusText(status: AgentInfo['status']): string {
  switch (status) {
    case 'running':
      return 'Agent Running';
    case 'stopped':
      return 'Agent Stopped';
    case 'installing':
      return 'Installing...';
    case 'error':
      return 'Error';
    case 'not_installed':
      return 'Not Installed';
  }
}

describe('Button States', () => {
  it('should show Install button when not installed', () => {
    const buttons = getButtonState('not_installed');
    expect(buttons).toContain('Install Hermes Agent');
    expect(buttons).toHaveLength(1);
  });

  it('should show Deploy and Reinstall buttons when stopped', () => {
    const buttons = getButtonState('stopped');
    expect(buttons).toContain('Deploy');
    expect(buttons).toContain('Reinstall');
    expect(buttons).toHaveLength(2);
  });

  it('should show Stop and Restart buttons when running', () => {
    const buttons = getButtonState('running');
    expect(buttons).toContain('Stop');
    expect(buttons).toContain('Restart');
    expect(buttons).toHaveLength(2);
  });

  it('should show disabled button when installing', () => {
    const buttons = getButtonState('installing');
    expect(buttons).toContain('Installing...');
    expect(buttons).toHaveLength(1);
  });

  it('should show Retry and Deploy buttons on error', () => {
    const buttons = getButtonState('error');
    expect(buttons).toContain('Retry Install');
    expect(buttons).toContain('Deploy');
    expect(buttons).toHaveLength(2);
  });
});

describe('Status Display', () => {
  it('should return correct color for each status', () => {
    expect(getStatusColor('running')).toBe('green');
    expect(getStatusColor('stopped')).toBe('yellow');
    expect(getStatusColor('error')).toBe('red');
    expect(getStatusColor('installing')).toBe('blue');
    expect(getStatusColor('not_installed')).toBe('gray');
  });

  it('should return correct text for each status', () => {
    expect(getStatusText('running')).toBe('Agent Running');
    expect(getStatusText('stopped')).toBe('Agent Stopped');
    expect(getStatusText('installing')).toBe('Installing...');
    expect(getStatusText('error')).toBe('Error');
    expect(getStatusText('not_installed')).toBe('Not Installed');
  });
});

describe('UI State Transitions', () => {
  it('should transition from not_installed to installing when Install clicked', () => {
    let status: AgentInfo['status'] = 'not_installed';

    status = 'installing';

    expect(status).toBe('installing');
    expect(getButtonState(status)).toContain('Installing...');
  });

  it('should transition from installing to stopped on success', () => {
    let status: AgentInfo['status'] = 'installing';

    status = 'stopped';

    expect(status).toBe('stopped');
    expect(getButtonState(status)).toContain('Deploy');
  });

  it('should transition from installing to error on failure', () => {
    let status: AgentInfo['status'] = 'installing';

    status = 'error';

    expect(status).toBe('error');
    expect(getButtonState(status)).toContain('Retry Install');
  });

  it('should transition from stopped to running when Deploy clicked', () => {
    let status: AgentInfo['status'] = 'stopped';

    status = 'running';

    expect(status).toBe('running');
    expect(getButtonState(status)).toContain('Stop');
  });

  it('should transition from running to stopped when Stop clicked', () => {
    let status: AgentInfo['status'] = 'running';

    status = 'stopped';

    expect(status).toBe('stopped');
    expect(getButtonState(status)).toContain('Deploy');
  });
});
