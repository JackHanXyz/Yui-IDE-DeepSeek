const { app, BrowserWindow, Menu, dialog, ipcMain, shell, session, clipboard } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const fsp = fs.promises;
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const SMOKE_TEST = process.argv.includes('--smoke-test');
const APP_DIR = __dirname;
const DEFAULT_WORKSPACE = path.join(APP_DIR, 'workspace');
const DEEPSEEK_URL = 'https://chat.deepseek.com/';
const IGNORED_NAMES = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db', '.yui']);
const MAX_READ_BYTES = 4 * 1024 * 1024;
const MAX_WRITE_BYTES = 16 * 1024 * 1024;
const MAX_CAPTURE_CHARS = 300 * 1024;

const EXT_BY_LANG = Object.freeze({
  javascript: 'js', js: 'js', mjs: 'mjs', cjs: 'cjs', node: 'js',
  jsx: 'jsx', react: 'jsx',
  typescript: 'ts', ts: 'ts', tsx: 'tsx',
  html: 'html', htm: 'html', vue: 'vue', svelte: 'svelte',
  css: 'css', scss: 'scss', less: 'less', sass: 'scss',
  json: 'json', jsonc: 'jsonc', json5: 'json5',
  markdown: 'md', md: 'md', mdx: 'mdx',
  python: 'py', py: 'py', python3: 'py',
  shell: 'sh', sh: 'sh', bash: 'sh', zsh: 'sh', fish: 'sh',
  powershell: 'ps1', pwsh: 'ps1', ps1: 'ps1', bat: 'bat', batch: 'bat', cmd: 'bat',
  sql: 'sql', mysql: 'sql', postgresql: 'sql', postgres: 'sql', sqlite: 'sql',
  java: 'java', kotlin: 'kt', kt: 'kt', scala: 'scala', groovy: 'groovy',
  c: 'c', h: 'h', cpp: 'cpp', 'c++': 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'hpp',
  csharp: 'cs', 'c#': 'cs', cs: 'cs', dotnet: 'cs',
  go: 'go', golang: 'go', rust: 'rs', rs: 'rs', ruby: 'rb', rb: 'rb',
  php: 'php', swift: 'swift', dart: 'dart', lua: 'lua', r: 'r',
  perl: 'pl', pl: 'pl', haskell: 'hs', hs: 'hs', elixir: 'ex', ex: 'ex',
  sqlite3: 'sql', yaml: 'yml', yml: 'yml', toml: 'toml', ini: 'ini',
  xml: 'xml', svg: 'svg', graphql: 'graphql', gql: 'graphql', proto: 'proto',
  dockerfile: 'Dockerfile', docker: 'Dockerfile', makefile: 'Makefile',
  nginx: 'conf', apache: 'conf', diff: 'diff', patch: 'diff',
  text: 'txt', plaintext: 'txt', plain: 'txt', txt: 'txt', log: 'txt',
  console: 'txt', output: 'txt', unknown: 'txt'
});

let mainWindow = null;
let currentWorkspace = null;
let settingsFile = null;
let settings = {};
let smokeTimer = null;
let smokeReady = false;
let rendererDirty = false;
let allowWindowClose = false;

function normalizeWorkspace(candidate) {
  if (!candidate || typeof candidate !== 'string') return null;
  try {
    const abs = path.resolve(candidate);
    if (fs.statSync(abs).isDirectory()) return abs;
  } catch {
    return null;
  }
  return null;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadSettings() {
  settingsFile = path.join(app.getPath('userData'), 'yui-ide-settings.json');
  try {
    settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  } catch {
    settings = {};
  }
  if (!settings || typeof settings !== 'object') settings = {};
}

function saveSettings() {
  if (!settingsFile) return;
  try {
    ensureDir(path.dirname(settingsFile));
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
  } catch (error) {
    console.error('[Yui-IDE] Failed to save settings:', error.message);
  }
}

function configureDeepSeekSession() {
  const dsSession = session.fromPartition('persist:deepseek');
  let userAgent = dsSession.getUserAgent();
  userAgent = userAgent
    .replace(/\sElectron\/[\d.]+/gi, '')
    .replace(/\sYui-IDE\/[\d.]+/gi, '')
    .replace(/\syui-ide\/[\d.]+/gi, '');
  dsSession.setUserAgent(userAgent);
  dsSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(permission === 'clipboard-read');
  });
  dsSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'clipboard-read';
  });
}

function getWorkspaceInfo() {
  if (!currentWorkspace) return null;
  return { root: currentWorkspace, name: path.basename(currentWorkspace) };
}

function requireWorkspace() {
  if (!currentWorkspace) throw new Error('还没有打开工作区');
  return currentWorkspace;
}

function resolveInside(target) {
  const root = path.resolve(requireWorkspace());
  const abs = path.resolve(root, target || '.');
  const relative = path.relative(root, abs);
  if (relative && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error('路径超出工作区范围');
  }
  return abs;
}

function relativeToWorkspace(absPath) {
  return path.relative(requireWorkspace(), absPath).split(path.sep).join('/');
}

function isProbablyBinary(buffer) {
  const limit = Math.min(buffer.length, 8192);
  for (let i = 0; i < limit; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function decodeTextFile(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.slice(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.from(buffer.slice(2));
    swapped.swap16();
    return swapped.toString('utf16le');
  }
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

function sortEntries(a, b) {
  if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
  return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' });
}

function captureExtension(lang) {
  const key = String(lang || '').trim().toLowerCase().replace(/^language-/, '');
  return EXT_BY_LANG[key] || 'txt';
}

function buildTreeLines(dir, prefix, depth, counter) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => !IGNORED_NAMES.has(entry.name))
      .sort((a, b) => {
        if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
        return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' });
      });
  } catch {
    return [];
  }
  const lines = [];
  for (let i = 0; i < entries.length; i += 1) {
    if (counter.count >= 400) {
      lines.push(`${prefix}└── …`);
      break;
    }
    counter.count += 1;
    const entry = entries[i];
    const last = i === entries.length - 1;
    lines.push(`${prefix}${last ? '└── ' : '├── '}${entry.name}${entry.isDirectory() ? '/' : ''}`);
    if (entry.isDirectory() && depth < 4) {
      lines.push(...buildTreeLines(
        path.join(dir, entry.name),
        `${prefix}${last ? '    ' : '│   '}`,
        depth + 1,
        counter
      ));
    }
  }
  return lines;
}

function registerIpc() {
  ipcMain.on('ui:dirty', (event, dirty) => {
    rendererDirty = Boolean(dirty);
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    platform: process.platform,
    workspace: getWorkspaceInfo(),
    deepseekPreload: pathToFileURL(path.join(APP_DIR, 'deepseek-preload.js')).href,
    deepseekUrl: DEEPSEEK_URL
  }));

  ipcMain.on('ui:ready', () => {
    if (!SMOKE_TEST) return;
    if (smokeReady) return;
    smokeReady = true;
    if (smokeTimer) clearTimeout(smokeTimer);
    console.log('[Yui-IDE] renderer ready');
    setTimeout(() => {
      console.log('[Yui-IDE] smoke test passed');
      app.exit(0);
    }, 2500);
  });

  ipcMain.handle('workspace:get', () => getWorkspaceInfo());

  ipcMain.handle('workspace:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择工作文件夹',
      buttonLabel: '打开文件夹',
      defaultPath: currentWorkspace || DEFAULT_WORKSPACE,
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    currentWorkspace = result.filePaths[0];
    settings.lastWorkspace = currentWorkspace;
    saveSettings();
    return getWorkspaceInfo();
  });

  ipcMain.handle('workspace:list', async (event, dirPath) => {
    const abs = resolveInside(dirPath);
    const stat = await fsp.stat(abs);
    if (!stat.isDirectory()) throw new Error('目标不是文件夹');
    const entries = await fsp.readdir(abs, { withFileTypes: true });
    return entries
      .filter((entry) => !IGNORED_NAMES.has(entry.name))
      .sort(sortEntries)
      .map((entry) => ({
        name: entry.name,
        path: path.join(abs, entry.name),
        isDir: entry.isDirectory()
      }));
  });

  ipcMain.handle('workspace:outline', () => {
    const root = requireWorkspace();
    const counter = { count: 0 };
    const lines = [`${path.basename(root)}/`, ...buildTreeLines(root, '', 0, counter)];
    if (counter.count >= 400) lines.push('…（目录已截断）');
    return lines.join('\n');
  });

  ipcMain.handle('fs:read', async (event, filePath) => {
    const abs = resolveInside(filePath);
    const stat = await fsp.stat(abs);
    if (stat.isDirectory()) throw new Error('目标是一个文件夹');
    if (stat.size > MAX_READ_BYTES) throw new Error('文件过大（超过 4 MB），暂不支持在编辑器中打开');
    const buffer = await fsp.readFile(abs);
    if (isProbablyBinary(buffer)) throw new Error('这是二进制文件，无法用文本编辑器打开');
    return {
      content: decodeTextFile(buffer),
      size: stat.size,
      mtimeMs: stat.mtimeMs
    };
  });

  ipcMain.handle('fs:write', async (event, filePath, content) => {
    const abs = resolveInside(filePath);
    if (typeof content !== 'string') throw new Error('无效的文件内容');
    if (Buffer.byteLength(content, 'utf8') > MAX_WRITE_BYTES) throw new Error('文件内容过大');
    ensureDir(path.dirname(abs));
    await fsp.writeFile(abs, content, 'utf8');
    const stat = await fsp.stat(abs);
    return { size: stat.size, mtimeMs: stat.mtimeMs };
  });

  ipcMain.handle('fs:create-file', async (event, filePath) => {
    const abs = resolveInside(filePath);
    ensureDir(path.dirname(abs));
    try {
      await fsp.writeFile(abs, '', { encoding: 'utf8', flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') throw new Error('同名文件已存在');
      throw error;
    }
    return abs;
  });

  ipcMain.handle('fs:create-dir', async (event, dirPath) => {
    const abs = resolveInside(dirPath);
    try {
      await fsp.mkdir(abs, { recursive: true });
    } catch (error) {
      throw new Error(`无法创建文件夹: ${error.message}`);
    }
    return abs;
  });

  ipcMain.handle('fs:rename', async (event, fromPath, toPath) => {
    const from = resolveInside(fromPath);
    const to = resolveInside(toPath);
    if (from === path.resolve(requireWorkspace())) throw new Error('不能重命名工作区根目录');
    if (fs.existsSync(to)) throw new Error('目标名称已存在');
    ensureDir(path.dirname(to));
    await fsp.rename(from, to);
    return to;
  });

  ipcMain.handle('fs:trash', async (event, targetPath) => {
    const abs = resolveInside(targetPath);
    if (abs === path.resolve(requireWorkspace())) throw new Error('不能删除工作区根目录');
    await shell.trashItem(abs);
    return true;
  });

  ipcMain.handle('fs:reveal', (event, targetPath) => {
    const abs = resolveInside(targetPath);
    shell.showItemInFolder(abs);
    return true;
  });

  ipcMain.handle('capture:save', async (event, payload = {}) => {
    requireWorkspace();
    const code = typeof payload.code === 'string' ? payload.code : '';
    if (!code.trim()) throw new Error('没有可保存的代码');
    if (code.length > MAX_CAPTURE_CHARS) throw new Error('代码片段过大，已跳过');
    const auto = Boolean(payload.auto);
    const lang = String(payload.lang || 'text').trim().toLowerCase().replace(/^language-/, '').slice(0, 32);
    const ext = captureExtension(lang);
    const capturesDir = path.join(requireWorkspace(), 'captures');
    await fsp.mkdir(capturesDir, { recursive: true });
    const hash = crypto.createHash('sha1').update(`${lang}\n${code}`).digest('hex').slice(0, 10);
    let existing = [];
    try {
      existing = await fsp.readdir(capturesDir);
    } catch {
      existing = [];
    }
    if (auto && existing.some((name) => name.includes(`-${hash}`))) {
      return { duplicate: true };
    }
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    let filename = `capture-${stamp}-${hash}.${ext}`;
    let target = path.join(capturesDir, filename);
    let counter = 1;
    while (fs.existsSync(target)) {
      filename = `capture-${stamp}-${hash}-${counter}.${ext}`;
      target = path.join(capturesDir, filename);
      counter += 1;
    }
    await fsp.writeFile(target, code.endsWith('\n') ? code : `${code}\n`, 'utf8');
    return {
      duplicate: false,
      path: target,
      rel: relativeToWorkspace(target),
      title: String(payload.title || ''),
      lang
    };
  });

  ipcMain.handle('settings:get', () => ({
    chatWidth: Number(settings.chatWidth) || 0,
    lastWorkspace: settings.lastWorkspace || null
  }));

  ipcMain.handle('settings:set', (event, patch = {}) => {
    if (patch && Number.isFinite(patch.chatWidth)) {
      settings.chatWidth = Math.round(patch.chatWidth);
    }
    saveSettings();
    return true;
  });

  ipcMain.handle('clipboard:write', (event, text) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  ipcMain.handle('shell:open-external', (event, url) => {
    try {
      const parsed = new URL(String(url));
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      shell.openExternal(parsed.toString());
      return true;
    } catch {
      return false;
    }
  });
}

function openExternalUrl(url) {
  try {
    const parsed = new URL(String(url));
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      shell.openExternal(parsed.toString());
    }
  } catch {
  }
}

function buildWebviewContextMenu(contents, params) {
  const template = [];
  if (params.isEditable) {
    template.push(
      { role: 'undo', enabled: params.editFlags.canUndo },
      { role: 'redo', enabled: params.editFlags.canRedo },
      { type: 'separator' },
      { role: 'cut', enabled: params.editFlags.canCut },
      { role: 'copy', enabled: params.editFlags.canCopy },
      { role: 'paste', enabled: params.editFlags.canPaste },
      { role: 'selectAll', enabled: params.editFlags.canSelectAll }
    );
  } else if (params.selectionText && params.selectionText.trim()) {
    template.push({ role: 'copy' });
  }
  if (params.linkURL) {
    if (template.length) template.push({ type: 'separator' });
    template.push({
      label: '在浏览器中打开链接',
      click: () => openExternalUrl(params.linkURL)
    });
  }
  if (template.length) template.push({ type: 'separator' });
  template.push(
    { label: '刷新 DeepSeek 页面', click: () => contents.reload() },
    { label: '在浏览器中打开当前页面', click: () => openExternalUrl(contents.getURL() || DEEPSEEK_URL) }
  );
  Menu.buildFromTemplate(template).popup({ window: mainWindow || undefined });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#0a0c10',
    title: 'Yui-IDE',
    icon: path.join(APP_DIR, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(APP_DIR, 'src', 'index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    rendererDirty = false;
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = false;
    const expected = pathToFileURL(path.join(APP_DIR, 'deepseek-preload.js')).toString();
    if (params.preload !== expected) {
      delete webPreferences.preload;
      params.preload = expected;
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      openExternalUrl(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isF12 = input.key === 'F12';
    const isDevTools = input.control && input.shift && input.key.toLowerCase() === 'i';
    if (isF12 || isDevTools) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.on('close', (event) => {
    if (!rendererDirty || allowWindowClose) return;
    event.preventDefault();
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['取消', '放弃更改并退出'],
      defaultId: 0,
      cancelId: 0,
      title: '未保存的更改',
      message: '还有未保存的文件。',
      detail: '现在退出会丢失这些更改。'
    });
    if (choice === 1) {
      allowWindowClose = true;
      mainWindow.close();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    allowWindowClose = false;
    rendererDirty = false;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Yui-IDE] Host page failed to load (${errorCode}): ${errorDescription} ${validatedURL}`);
  });

  if (SMOKE_TEST) {
    mainWindow.webContents.on('console-message', (...args) => {
      const details = args[1] && typeof args[1] === 'object' ? args[1] : null;
      const message = details ? details.message : args[2];
      const level = details ? details.level : args[1];
      if (message) console.log(`[renderer:${level}] ${message}`);
    });
  }
}

function armSmokeTest() {
  if (!SMOKE_TEST) return;
  smokeTimer = setTimeout(() => {
    console.error('[Yui-IDE] smoke test timed out waiting for renderer');
    app.exit(1);
  }, 30000);
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.setAppUserModelId('com.yui.ide');

  app.on('web-contents-created', (event, contents) => {
    if (contents.getType() === 'webview') {
      contents.setWindowOpenHandler(({ url }) => {
        openExternalUrl(url);
        return { action: 'deny' };
      });
      contents.on('context-menu', (menuEvent, params) => {
        buildWebviewContextMenu(contents, params);
      });
      contents.on('before-input-event', (inputEvent, input) => {
        const isF12 = input.key === 'F12';
        const isDevTools = input.control && input.shift && input.key.toLowerCase() === 'i';
        if (isF12 || isDevTools) {
          contents.toggleDevTools();
          inputEvent.preventDefault();
        }
      });
      contents.on('preload-error', (preloadEvent, preloadPath, error) => {
        console.error(`[Yui-IDE] DeepSeek preload error (${preloadPath}):`, error);
      });
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    loadSettings();
    configureDeepSeekSession();
    try {
      ensureDir(DEFAULT_WORKSPACE);
    } catch (error) {
      console.error('[Yui-IDE] Could not create default workspace:', error.message);
    }
    currentWorkspace = normalizeWorkspace(settings.lastWorkspace) || DEFAULT_WORKSPACE;
    settings.lastWorkspace = currentWorkspace;
    saveSettings();
    registerIpc();
    armSmokeTest();
    createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}
