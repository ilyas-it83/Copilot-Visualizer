// Minimal vscode mock for unit testing outside VS Code runtime
export const workspace = {
  getConfiguration: () => ({
    get: (key: string, defaultValue?: unknown) => defaultValue,
  }),
  workspaceFolders: [],
  fs: {
    readFile: async () => Buffer.from(''),
    stat: async () => ({ type: 1, size: 0 }),
  },
};

export const window = {
  showInformationMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showQuickPick: async () => undefined,
  createWebviewPanel: () => ({
    webview: { html: '', onDidReceiveMessage: () => ({ dispose: () => {} }) },
    dispose: () => {},
  }),
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  parse: (str: string) => ({ fsPath: str, scheme: 'file', path: str }),
};

export const EventEmitter = class {
  event = () => ({ dispose: () => {} });
  fire() {}
  dispose() {}
};

export enum ViewColumn {
  One = 1,
  Two = 2,
}
