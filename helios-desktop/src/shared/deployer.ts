import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { spawn, ChildProcess } from 'child_process';
import log from 'electron-log';
import { detectPlatform, getInstallationPaths } from './platform';
import type { AgentInfo } from './types';

let healthCheckInterval: NodeJS.Timeout | null = null;
let currentProcess: ChildProcess | null = null;

export interface DeployerResult {
  success: boolean;
  error?: string;
  port?: number;
}

export async function deployAgent(): Promise<DeployerResult> {
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);
  const executableName = platformInfo.platform === 'windows' ? 'hermes-agent.exe' : 'hermes-agent';
  const executablePath = path.join(installPaths.agent, executableName);

  if (!fs.existsSync(executablePath)) {
    return { success: false, error: 'Agent not installed. Please install first.' };
  }

  log.info(`Deploying Hermes Agent from ${executablePath}`);

  try {
    switch (platformInfo.platform) {
      case 'windows':
        return await deployWindows(installPaths);
      case 'mac':
        return await deployMac(installPaths);
      case 'linux':
        return await deployLinux(installPaths);
    }
  } catch (err) {
    log.error('Deploy failed:', err);
    return { success: false, error: String(err) };
  }
}

async function deployWindows(installPaths: { serviceName: string; logs: string }): Promise<DeployerResult> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');

    exec(`net start "${installPaths.serviceName}"`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        log.error('Failed to start Windows service:', stderr);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      log.info('Windows service started');
      resolve({ success: true });
    });
  });
}

async function deployMac(installPaths: { serviceName: string }): Promise<DeployerResult> {
  return new Promise((resolve) => {
    const plistPath = path.join(process.env.HOME || '', 'Library', 'LaunchAgents', `${installPaths.serviceName}.plist`);

    const { exec } = require('child_process');
    exec(`launchctl load "${plistPath}"`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        log.error('Failed to load macOS service:', stderr);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      log.info('macOS service loaded');
      resolve({ success: true });
    });
  });
}

async function deployLinux(installPaths: { serviceName: string }): Promise<DeployerResult> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`systemctl --user start ${installPaths.serviceName}`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        log.error('Failed to start Linux service:', stderr);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      log.info('Linux service started');
      resolve({ success: true });
    });
  });
}

export async function stopAgent(): Promise<DeployerResult> {
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);

  log.info('Stopping Hermes Agent');

  try {
    switch (platformInfo.platform) {
      case 'windows':
        return await stopWindows(installPaths);
      case 'mac':
        return await stopMac(installPaths);
      case 'linux':
        return await stopLinux(installPaths);
    }
  } catch (err) {
    log.error('Stop failed:', err);
    return { success: false, error: String(err) };
  }
}

async function stopWindows(installPaths: { serviceName: string }): Promise<DeployerResult> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`net stop "${installPaths.serviceName}"`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        log.error('Failed to stop Windows service:', stderr);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      log.info('Windows service stopped');
      resolve({ success: true });
    });
  });
}

async function stopMac(installPaths: { serviceName: string }): Promise<DeployerResult> {
  return new Promise((resolve) => {
    const plistPath = path.join(process.env.HOME || '', 'Library', 'LaunchAgents', `${installPaths.serviceName}.plist`);

    const { exec } = require('child_process');
    exec(`launchctl unload "${plistPath}"`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        log.error('Failed to unload macOS service:', stderr);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      log.info('macOS service unloaded');
      resolve({ success: true });
    });
  });
}

async function stopLinux(installPaths: { serviceName: string }): Promise<DeployerResult> {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec(`systemctl --user stop ${installPaths.serviceName}`, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        log.error('Failed to stop Linux service:', stderr);
        resolve({ success: false, error: stderr || error.message });
        return;
      }
      log.info('Linux service stopped');
      resolve({ success: true });
    });
  });
}

export async function restartAgent(): Promise<DeployerResult> {
  log.info('Restarting Hermes Agent');
  const stopResult = await stopAgent();
  if (!stopResult.success) {
    return stopResult;
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));

  return await deployAgent();
}

export function getAgentStatus(): AgentInfo {
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);
  const executableName = platformInfo.platform === 'windows' ? 'hermes-agent.exe' : 'hermes-agent';
  const executablePath = path.join(installPaths.agent, executableName);

  if (!fs.existsSync(executablePath)) {
    return { status: 'not_installed', version: null };
  }

  if (isServiceRunning(platformInfo, installPaths)) {
    return { status: 'running', version: null, port: 8080 };
  }

  return { status: 'stopped', version: null };
}

function isServiceRunning(platformInfo: { platform: string }, installPaths: { serviceName: string }): boolean {
  const { execSync } = require('child_process');

  try {
    switch (platformInfo.platform) {
      case 'windows': {
        const output = execSync(`sc query "${installPaths.serviceName}"`, { encoding: 'utf8' });
        return output.includes('RUNNING');
      }
      case 'mac': {
        const plistPath = path.join(process.env.HOME || '', 'Library', 'LaunchAgents', `${installPaths.serviceName}.plist`);
        const output = execSync(`launchctl list | grep ${installPaths.serviceName}`, { encoding: 'utf8' });
        return output.includes(installPaths.serviceName);
      }
      case 'linux': {
        const output = execSync(`systemctl --user is-active ${installPaths.serviceName}`, { encoding: 'utf8' });
        return output.trim() === 'active';
      }
    }
  } catch {
    return false;
  }

  return false;
}

export async function getAgentLogs(lineCount: number = 100): Promise<string[]> {
  const platformInfo = detectPlatform();
  const installPaths = getInstallationPaths(platformInfo);

  const logFile = path.join(installPaths.logs, platformInfo.platform === 'windows' ? 'hermes-agent.log' : 'stdout.log');

  if (!fs.existsSync(logFile)) {
    return [];
  }

  return new Promise((resolve) => {
    const lines: string[] = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(logFile),
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      lines.push(line);
      if (lines.length > lineCount) {
        lines.shift();
      }
    });

    rl.on('close', () => {
      resolve(lines);
    });

    rl.on('error', () => {
      resolve([]);
    });
  });
}

export function startHealthCheck(onStatusChange: (status: AgentInfo) => void): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(() => {
    const status = getAgentStatus();
    onStatusChange(status);
  }, 5000);

  log.info('Health check started (5 second interval)');
}

export function stopHealthCheck(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    log.info('Health check stopped');
  }
}
