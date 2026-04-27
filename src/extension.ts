/**
 * Copilot Visualizer — Extension Entry Point
 * Registers commands, initializes services, and sets up the webview provider.
 */

import * as vscode from 'vscode';
import { LogDiscoveryService } from './services/logDiscovery';
import { EventStore } from './services/eventStore';
import { MessageBridge } from './services/messageBridge';
import { OfficeViewProvider } from './providers/officeViewProvider';
import { parseSession } from './parsers';

let officeViewProvider: OfficeViewProvider;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  console.log('[Copilot Visualizer] Activating...');

  // Initialize services
  const logDiscovery = new LogDiscoveryService();
  const eventStore = new EventStore();
  const messageBridge = new MessageBridge();

  // Create webview provider
  officeViewProvider = new OfficeViewProvider(
    context.extensionUri,
    messageBridge,
    eventStore,
    logDiscovery,
  );

  // Register commands
  const openOfficeCmd = vscode.commands.registerCommand(
    'copilot-visualizer.openOffice',
    () => {
      officeViewProvider.openPanel();
    }
  );

  const selectSessionCmd = vscode.commands.registerCommand(
    'copilot-visualizer.selectSession',
    async () => {
      const sessions = await logDiscovery.discoverSessions();

      if (sessions.length === 0) {
        vscode.window.showInformationMessage('No Copilot sessions found.');
        return;
      }

      const items = sessions.map(s => ({
        label: s.name,
        description: `${s.source} — ${s.logPath}`,
        detail: s.eventCount > 0 ? `${s.eventCount} events` : undefined,
        sessionId: s.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a Copilot session to visualize',
      });

      if (selected) {
        const session = sessions.find(s => s.id === selected.sessionId);
        if (session) {
          // Parse and load
          const events = await parseSession(session);
          eventStore.loadEvents(events);
          session.eventCount = events.length;

          // Open panel and send data
          officeViewProvider.openPanel();
          messageBridge.sendSession(session);
          await messageBridge.sendEventsInChunks(events);

          updateStatusBar(session.name, events.length);
        }
      }
    }
  );

  const refreshLogsCmd = vscode.commands.registerCommand(
    'copilot-visualizer.refreshLogs',
    async () => {
      const sessions = await logDiscovery.discoverSessions();
      vscode.window.showInformationMessage(
        `Found ${sessions.length} Copilot session(s).`
      );
      messageBridge.sendSessionList(sessions);
    }
  );

  // Status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'copilot-visualizer.openOffice';
  statusBarItem.text = '$(play) Copilot Office';
  statusBarItem.tooltip = 'Open Copilot Visualizer';
  statusBarItem.show();

  // Register disposables
  context.subscriptions.push(
    openOfficeCmd,
    selectSessionCmd,
    refreshLogsCmd,
    statusBarItem,
    { dispose: () => messageBridge.dispose() },
    { dispose: () => officeViewProvider.dispose() },
  );

  // Kick off initial discovery in background
  logDiscovery.discoverSessions().then(sessions => {
    if (sessions.length > 0) {
      updateStatusBar(undefined, undefined, sessions.length);
    }
  });

  console.log('[Copilot Visualizer] Activated successfully.');
}

export function deactivate(): void {
  console.log('[Copilot Visualizer] Deactivated.');
}

function updateStatusBar(sessionName?: string, eventCount?: number, totalSessions?: number): void {
  if (sessionName && eventCount !== undefined) {
    statusBarItem.text = `$(play) ${sessionName} (${eventCount} events)`;
  } else if (totalSessions !== undefined) {
    statusBarItem.text = `$(play) Copilot Office (${totalSessions} sessions)`;
  }
}
