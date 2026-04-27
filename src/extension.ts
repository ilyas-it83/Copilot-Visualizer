/**
 * Copilot Visualizer — Extension Entry Point
 * Real-time monitoring mode: starts watching Copilot logs immediately on activation.
 */

import * as vscode from 'vscode';
import { EventStore } from './services/eventStore';
import { MessageBridge } from './services/messageBridge';
import { FileWatcher } from './services/fileWatcher';
import { OfficeViewProvider } from './providers/officeViewProvider';

let officeViewProvider: OfficeViewProvider;
let fileWatcher: FileWatcher;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  console.log('[Copilot Visualizer] Activating (real-time mode)...');

  // Initialize services
  const eventStore = new EventStore();
  const messageBridge = new MessageBridge();
  fileWatcher = new FileWatcher();

  // Create webview provider
  officeViewProvider = new OfficeViewProvider(
    context.extensionUri,
    messageBridge,
    eventStore,
    fileWatcher,
  );

  // Register commands
  const openOfficeCmd = vscode.commands.registerCommand(
    'copilot-visualizer.openOffice',
    () => {
      officeViewProvider.openPanel();
    }
  );

  const toggleMonitoringCmd = vscode.commands.registerCommand(
    'copilot-visualizer.toggleMonitoring',
    () => {
      if (fileWatcher.isRunning) {
        officeViewProvider.stopMonitoring();
        updateStatusBar(false, eventStore.count);
        vscode.window.showInformationMessage('Copilot monitoring paused.');
      } else {
        officeViewProvider.startMonitoring();
        updateStatusBar(true, eventStore.count);
        vscode.window.showInformationMessage('Copilot monitoring resumed.');
      }
    }
  );

  // Status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'copilot-visualizer.openOffice';
  statusBarItem.text = '$(eye) Copilot Live';
  statusBarItem.tooltip = 'Open Copilot Visualizer (real-time monitoring)';
  statusBarItem.show();

  // Register disposables
  context.subscriptions.push(
    openOfficeCmd,
    toggleMonitoringCmd,
    statusBarItem,
    { dispose: () => messageBridge.dispose() },
    { dispose: () => officeViewProvider.dispose() },
    { dispose: () => fileWatcher.dispose() },
  );

  // Start monitoring immediately on activation
  officeViewProvider.startMonitoring();

  // Update status bar with live event count periodically
  const statusUpdateInterval = setInterval(() => {
    if (fileWatcher.isRunning) {
      updateStatusBar(true, eventStore.count);
    }
  }, 3000);
  context.subscriptions.push({ dispose: () => clearInterval(statusUpdateInterval) });

  console.log('[Copilot Visualizer] Activated — real-time monitoring started.');
}

export function deactivate(): void {
  if (fileWatcher) {
    fileWatcher.dispose();
  }
  console.log('[Copilot Visualizer] Deactivated.');
}

function updateStatusBar(monitoring: boolean, eventCount: number): void {
  if (monitoring) {
    const countStr = eventCount > 0 ? ` (${eventCount})` : '';
    statusBarItem.text = `$(eye) Copilot Live${countStr}`;
    statusBarItem.tooltip = `Monitoring Copilot — ${eventCount} events captured`;
  } else {
    statusBarItem.text = '$(eye-closed) Copilot Paused';
    statusBarItem.tooltip = 'Copilot monitoring paused — click to open';
  }
}
