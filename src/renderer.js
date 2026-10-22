(() => {
  'use strict';

  const api = window.yui;
  const $ = (id) => document.getElementById(id);

  const icon = (id, className = '') => `<svg class="ic ${className}" aria-hidden="true"><use href="#${id}"></use></svg>`;

  const FILE_TYPES = {
    js: { mode: 'javascript', label: 'JavaScript', fence: 'javascript', cls: 'ft-js' },
    mjs: { mode: 'javascript', label: 'JavaScript', fence: 'javascript', cls: 'ft-js' },
    cjs: { mode: 'javascript', label: 'JavaScript', fence: 'javascript', cls: 'ft-js' },
    jsx: { mode: 'jsx', label: 'JavaScript React', fence: 'jsx', cls: 'ft-js' },
    ts: { mode: 'javascript', label: 'TypeScript', fence: 'typescript', cls: 'ft-ts' },
    tsx: { mode: 'jsx', label: 'TypeScript React', fence: 'tsx', cls: 'ft-ts' },
    html: { mode: 'htmlmixed', label: 'HTML', fence: 'html', cls: 'ft-html' },
    htm: { mode: 'htmlmixed', label: 'HTML', fence: 'html', cls: 'ft-html' },
    vue: { mode: 'htmlmixed', label: 'Vue', fence: 'vue', cls: 'ft-html' },
    svelte: { mode: 'htmlmixed', label: 'Svelte', fence: 'svelte', cls: 'ft-html' },
    css: { mode: 'css', label: 'CSS', fence: 'css', cls: 'ft-css' },
    scss: { mode: 'css', label: 'SCSS', fence: 'scss', cls: 'ft-css' },
    less: { mode: 'css', label: 'Less', fence: 'less', cls: 'ft-css' },
    json: { mode: 'javascript', label: 'JSON', fence: 'json', cls: 'ft-json' },
    jsonc: { mode: 'javascript', label: 'JSON with Comments', fence: 'jsonc', cls: 'ft-json' },
    md: { mode: 'markdown', label: 'Markdown', fence: 'markdown', cls: 'ft-md' },
    mdx: { mode: 'markdown', label: 'MDX', fence: 'mdx', cls: 'ft-md' },
    py: { mode: 'python', label: 'Python', fence: 'python', cls: 'ft-python' },
    c: { mode: 'text/x-csrc', label: 'C', fence: 'c', cls: 'ft-code' },
    h: { mode: 'text/x-c++hdr', label: 'C Header', fence: 'c', cls: 'ft-code' },
    cpp: { mode: 'text/x-c++src', label: 'C++', fence: 'cpp', cls: 'ft-code' },
    cc: { mode: 'text/x-c++src', label: 'C++', fence: 'cpp', cls: 'ft-code' },
    cxx: { mode: 'text/x-c++src', label: 'C++', fence: 'cpp', cls: 'ft-code' },
    hpp: { mode: 'text/x-c++hdr', label: 'C++ Header', fence: 'cpp', cls: 'ft-code' },
    cs: { mode: 'text/x-csharp', label: 'C#', fence: 'csharp', cls: 'ft-code' },
    java: { mode: 'text/x-java', label: 'Java', fence: 'java', cls: 'ft-code' },
    kt: { mode: 'text/x-kotlin', label: 'Kotlin', fence: 'kotlin', cls: 'ft-code' },
    scala: { mode: 'text/x-scala', label: 'Scala', fence: 'scala', cls: 'ft-code' },
    go: { mode: 'go', label: 'Go', fence: 'go', cls: 'ft-code' },
    rs: { mode: 'rust', label: 'Rust', fence: 'rust', cls: 'ft-code' },
    php: { mode: 'php', label: 'PHP', fence: 'php', cls: 'ft-code' },
    rb: { mode: 'ruby', label: 'Ruby', fence: 'ruby', cls: 'ft-code' },
    swift: { mode: 'swift', label: 'Swift', fence: 'swift', cls: 'ft-code' },
    dart: { mode: 'dart', label: 'Dart', fence: 'dart', cls: 'ft-code' },
    lua: { mode: 'lua', label: 'Lua', fence: 'lua', cls: 'ft-code' },
    sql: { mode: 'sql', label: 'SQL', fence: 'sql', cls: 'ft-code' },
    sh: { mode: 'shell', label: 'Shell', fence: 'bash', cls: 'ft-code' },
    bash: { mode: 'shell', label: 'Shell', fence: 'bash', cls: 'ft-code' },
    zsh: { mode: 'shell', label: 'Shell', fence: 'bash', cls: 'ft-code' },
    ps1: { mode: 'powershell', label: 'PowerShell', fence: 'powershell', cls: 'ft-code' },
    yaml: { mode: 'yaml', label: 'YAML', fence: 'yaml', cls: 'ft-json' },
    yml: { mode: 'yaml', label: 'YAML', fence: 'yaml', cls: 'ft-json' },
    xml: { mode: 'xml', label: 'XML', fence: 'xml', cls: 'ft-html' },
    svg: { mode: 'xml', label: 'SVG', fence: 'xml', cls: 'ft-html' },
    toml: { mode: 'toml', label: 'TOML', fence: 'toml', cls: 'ft-json' },
    ini: { mode: 'properties', label: 'INI', fence: 'ini', cls: 'ft-md' },
    conf: { mode: 'properties', label: 'Config', fence: 'ini', cls: 'ft-md' },
    properties: { mode: 'properties', label: 'Properties', fence: 'properties', cls: 'ft-md' },
    diff: { mode: 'diff', label: 'Diff', fence: 'diff', cls: 'ft-md' },
    patch: { mode: 'diff', label: 'Patch', fence: 'diff', cls: 'ft-md' },
    dockerfile: { mode: 'dockerfile', label: 'Dockerfile', fence: 'dockerfile', cls: 'ft-code' },
    makefile: { mode: 'shell', label: 'Makefile', fence: 'makefile', cls: 'ft-code' },
    txt: { mode: 'text/plain', label: 'Plain Text', fence: 'text', cls: 'ft-file' },
    log: { mode: 'text/plain', label: 'Log', fence: 'text', cls: 'ft-file' }
  };

  const state = {
    info: null,
    workspace: null,
    tabs: [],
    active: null,
    cm: null,
    autoCapture: false,
    capturedCount: 0,
    webview: null,
    webviewReady: false,
    webviewHasError: false,
    pendingInsert: null,
    pendingGrab: null,
    insertSeq: 0,
    grabSeq: 0,
    expanded: new Set(),
    entryMap: new Map(),
    selectedTreePath: null,
    treeBusy: false,
    treeQueued: false,
    captureRefreshTimer: null,
    settingsTimer: null,
    chatWidthPx: 0,
    dirtyReported: false
  };

  const dom = {
    welcome: $('welcome'),
    editor: $('editor'),
    tabs: $('tabs'),
    treeRoot: $('tree-root'),
    treeScroll: $('tree-scroll'),
    workspaceName: $('workspace-name'),
    workspacePath: $('workspace-path'),
    statusWorkspace: $('status-workspace'),
    statusCapture: $('status-capture'),
    statusSelection: $('status-selection'),
    statusPos: $('status-pos'),
    statusLang: $('status-lang'),
    statusDs: $('status-ds'),
    captureCountLabel: $('capture-count-label'),
    autoPill: $('btn-auto'),
    grabButton: $('btn-grab-code'),
    chatPane: $('chat-pane'),
    splitter: $('splitter'),
    chatToggle: $('btn-chat-toggle'),
    webviewHost: $('webview-host'),
    dsOverlay: $('ds-overlay'),
    dsOverlayTitle: $('ds-overlay-title'),
    dsOverlaySub: $('ds-overlay-sub'),
    dsOverlayActions: $('ds-overlay-actions'),
    dsDot: $('ds-dot'),
    btnDsBack: $('btn-ds-back'),
    btnDsForward: $('btn-ds-forward'),
    toasts: $('toasts'),
    modalRoot: $('modal-root'),
    contextMenu: $('context-menu')
  };

  function cleanError(error) {
    let message = error && error.message ? error.message : String(error);
    message = message.replace(/^Error invoking remote method '[^']+':\s*/i, '');
    message = message.replace(/^Error:\s*/i, '');
    return message || '未知错误';
  }

  function baseName(filePath) {
    const parts = String(filePath).split(/[\\/]/);
    return parts[parts.length - 1] || String(filePath);
  }

  function parentDir(filePath) {
    const normalized = String(filePath).replace(/[\\/]+$/, '');
    const index = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'));
    if (index <= 0) return normalized;
    return normalized.slice(0, index);
  }

  function joinPath(base, name) {
    const separator = base.includes('\\') ? '\\' : '/';
    const relative = String(name)
      .trim()
      .replace(/[\\/]/g, separator)
      .replace(new RegExp(`^\\${separator}+`), '');
    return `${base.replace(/[\\/]+$/, '')}${separator}${relative}`;
  }

  function samePath(a, b) {
    if (!a || !b) return false;
    return String(a).toLowerCase() === String(b).toLowerCase();
  }

  function isDescendant(target, ancestor) {
    if (!target || !ancestor) return false;
    const normalizedTarget = String(target).replace(/\//g, '\\').toLowerCase();
    const normalizedAncestor = String(ancestor).replace(/\//g, '\\').replace(/\\+$/, '').toLowerCase();
    return normalizedTarget !== normalizedAncestor && normalizedTarget.startsWith(`${normalizedAncestor}\\`);
  }

  function relPath(filePath) {
    if (!state.workspace) return filePath;
    const root = state.workspace.root.replace(/\//g, '\\').replace(/\\+$/, '');
    const target = String(filePath).replace(/\//g, '\\');
    if (target.toLowerCase().startsWith(`${root.toLowerCase()}\\`)) {
      return target.slice(root.length + 1).replace(/\\/g, '/');
    }
    return String(filePath).replace(/\\/g, '/');
  }

  function extensionOf(filePath) {
    const name = baseName(filePath).toLowerCase();
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile') return 'makefile';
    const match = name.match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
  }

  function fileType(filePath) {
    return FILE_TYPES[extensionOf(filePath)] || null;
  }

  function fileClass(filePath) {
    return fileType(filePath)?.cls || 'ft-file';
  }

  function languageLabel(filePath) {
    return fileType(filePath)?.label || 'Plain Text';
  }

  function modeForPath(filePath) {
    return fileType(filePath)?.mode || 'text/plain';
  }

  function fenceForPath(filePath) {
    return fileType(filePath)?.fence || 'text';
  }

  function expandAncestors(targetPath) {
    if (!state.workspace) return;
    const root = state.workspace.root;
    let dir = parentDir(targetPath);
    let guard = 0;
    while (dir && guard < 80) {
      guard += 1;
      state.expanded.add(dir);
      if (samePath(dir, root)) break;
      const next = parentDir(dir);
      if (!next || samePath(next, dir)) break;
      dir = next;
    }
  }

  function remapExpandedPaths(fromPath, toPath) {
    const next = new Set();
    for (const entryPath of state.expanded) {
      if (samePath(entryPath, fromPath) || isDescendant(entryPath, fromPath)) {
        next.add(toPath + entryPath.slice(fromPath.length));
      } else {
        next.add(entryPath);
      }
    }
    state.expanded = next;
  }

  function updateWindowTitle() {
    const dirty = state.tabs.some((tab) => tab.dirty);
    document.title = dirty ? 'Yui-IDE-DeepSeek •' : 'Yui-IDE-DeepSeek';
    if (state.dirtyReported !== dirty) {
      state.dirtyReported = dirty;
      api.setDirty(dirty);
    }
  }

  function createEditor() {
    state.cm = CodeMirror(dom.editor, {
      value: '',
      mode: 'text/plain',
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: false,
      styleActiveLine: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      indentWithTabs: false,
      scrollbarStyle: 'native',
      spellcheck: false,
      extraKeys: {
        'Ctrl-S': () => saveActive(),
        'Cmd-S': () => saveActive(),
        'Ctrl-F': 'findPersistent',
        'Cmd-F': 'findPersistent'
      }
    });
    state.cm.setSize('100%', '100%');
    state.cm.on('cursorActivity', updateCursorStatus);
  }

  function setEditorVisible(visible) {
    dom.welcome.hidden = visible;
    dom.editor.style.display = visible ? 'block' : 'none';
    if (visible) {
      requestAnimationFrame(() => state.cm.refresh());
    }
  }

  function createDoc(content, mode) {
    if (content.includes('\r\n')) {
      return CodeMirror.Doc(content, mode, 0, '\r\n');
    }
    return CodeMirror.Doc(content, mode);
  }

  async function openFile(filePath, options = {}) {
    if (!filePath) return;
    let tab = state.tabs.find((item) => samePath(item.path, filePath));
    if (!tab) {
      let data;
      try {
        data = await api.readFile(filePath);
      } catch (error) {
        toast(`无法打开文件：${cleanError(error)}`, 'error');
        return;
      }
      const doc = createDoc(data.content, modeForPath(filePath));
      doc.markClean();
      const created = {
        path: filePath,
        name: baseName(filePath),
        doc,
        dirty: false,
        cursor: null,
        scroll: null
      };
      doc.on('change', () => {
        const dirty = !doc.isClean();
        if (dirty !== created.dirty) {
          created.dirty = dirty;
          renderTabs();
        }
        if (state.active === created) {
          updateWindowTitle();
          updateCursorStatus();
        }
      });
      state.tabs.push(created);
      tab = created;
    }
    activateTab(tab);
    selectTreePath(tab.path);
    if (options.focus === false) {
      state.cm.refresh();
    } else {
      setTimeout(() => state.cm.focus(), 0);
    }
  }

  function activateTab(tab) {
    if (!tab) return;
    if (state.active && state.active !== tab) {
      state.active.cursor = state.cm.getCursor();
      state.active.scroll = state.cm.getScrollInfo();
    }
    state.active = tab;
    setEditorVisible(true);
    state.cm.swapDoc(tab.doc);
    if (tab.cursor) {
      state.cm.setCursor(tab.cursor);
    } else {
      state.cm.setCursor({ line: 0, ch: 0 });
    }
    if (tab.scroll) {
      state.cm.scrollTo(tab.scroll.left, tab.scroll.top);
    } else {
      state.cm.scrollTo(0, 0);
    }
    state.cm.refresh();
    renderTabs();
    updateStatus();
    updateWindowTitle();
    if (tab.dirty !== !tab.doc.isClean()) {
      tab.dirty = !tab.doc.isClean();
    }
  }

  async function closeTab(tab) {
    if (!tab) return;
    if (tab.dirty) {
      const confirmed = await confirmDialog({
        title: '未保存的更改',
        message: `“${tab.name}”还有未保存的更改，关闭后这些更改会丢失。`,
        confirmText: '放弃并关闭',
        danger: true
      });
      if (!confirmed) return;
    }
    const index = state.tabs.indexOf(tab);
    if (index === -1) return;
    const wasActive = state.active === tab;
    state.tabs.splice(index, 1);
    if (wasActive) {
      state.active = null;
      const next = state.tabs[Math.min(index, state.tabs.length - 1)] || null;
      if (next) {
        activateTab(next);
      } else {
        setEditorVisible(false);
        renderTabs();
        updateStatus();
        updateWindowTitle();
      }
    } else {
      renderTabs();
      updateWindowTitle();
    }
  }

  function closeTabsUnder(basePath) {
    const removed = state.tabs.filter((tab) => samePath(tab.path, basePath) || isDescendant(tab.path, basePath));
    if (!removed.length) return;
    const activeIndex = state.active ? state.tabs.indexOf(state.active) : 0;
    const activeRemoved = state.active ? removed.includes(state.active) : false;
    state.tabs = state.tabs.filter((tab) => !removed.includes(tab));
    if (activeRemoved) {
      state.active = null;
      const next = state.tabs[Math.min(Math.max(activeIndex, 0), state.tabs.length - 1)] || null;
      if (next) {
        activateTab(next);
      } else {
        setEditorVisible(false);
        renderTabs();
        updateStatus();
        updateWindowTitle();
      }
    } else {
      renderTabs();
      updateWindowTitle();
    }
  }

  function updateTabPaths(fromPath, toPath) {
    let changed = false;
    for (const tab of state.tabs) {
      if (samePath(tab.path, fromPath) || isDescendant(tab.path, fromPath)) {
        tab.path = toPath + tab.path.slice(fromPath.length);
        tab.name = baseName(tab.path);
        changed = true;
      }
    }
    if (changed) {
      renderTabs();
      updateStatus();
    }
  }

  function renderTabs() {
    dom.tabs.innerHTML = '';
    for (const tab of state.tabs) {
      const tabElement = document.createElement('div');
      tabElement.className = 'tab';
      if (tab === state.active) tabElement.classList.add('active');
      if (tab.dirty) tabElement.classList.add('dirty');
      tabElement.title = tab.path;

      const iconWrap = document.createElement('span');
      iconWrap.className = `tab-icon ${fileClass(tab.path)}`;
      iconWrap.innerHTML = icon('i-file');

      const label = document.createElement('span');
      label.className = 'tab-label';
      label.textContent = tab.name;

      const dirty = document.createElement('span');
      dirty.className = 'tab-dirty';

      const close = document.createElement('button');
      close.className = 'tab-close';
      close.type = 'button';
      close.title = '关闭';
      close.innerHTML = icon('i-x');
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closeTab(tab);
      });

      tabElement.addEventListener('click', () => activateTab(tab));
      tabElement.addEventListener('auxclick', (event) => {
        if (event.button === 1) closeTab(tab);
      });
      tabElement.append(iconWrap, label, dirty, close);
      dom.tabs.appendChild(tabElement);
    }
    const activeElement = dom.tabs.querySelector('.tab.active');
    if (activeElement) activeElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  async function saveActive() {
    const tab = state.active;
    if (!tab) {
      toast('没有打开的文件', 'warn');
      return;
    }
    try {
      await api.writeFile(tab.path, tab.doc.getValue());
      tab.doc.markClean();
      tab.dirty = false;
      renderTabs();
      updateWindowTitle();
      updateCursorStatus();
      toast(`已保存 ${relPath(tab.path)}`, 'success');
    } catch (error) {
      toast(`保存失败：${cleanError(error)}`, 'error', 6500);
    }
  }

  function updateCursorStatus() {
    if (!state.active) {
      dom.statusPos.textContent = '';
      dom.statusSelection.textContent = '';
      return;
    }
    const cursor = state.cm.getCursor();
    dom.statusPos.textContent = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
    const selection = state.cm.getSelection();
    dom.statusSelection.textContent = selection ? `已选 ${selection.length} 字符` : '';
  }

  function updateStatus() {
    dom.statusLang.textContent = state.active ? languageLabel(state.active.path) : 'Plain Text';
    dom.statusWorkspace.textContent = state.workspace ? state.workspace.name : 'workspace';
    updateCursorStatus();
    updateCaptureUI();
  }

  function updateWorkspaceUI() {
    if (!state.workspace) return;
    dom.workspaceName.textContent = state.workspace.name;
    dom.workspacePath.textContent = state.workspace.root;
    dom.workspacePath.title = state.workspace.root;
    dom.statusWorkspace.textContent = state.workspace.name;
  }

  async function refreshTree() {
    if (!state.workspace) return;
    if (state.treeBusy) {
      state.treeQueued = true;
      return;
    }
    state.treeBusy = true;
    try {
      dom.treeRoot.innerHTML = '<div class="tree-loading">正在读取工作区…</div>';
      state.entryMap.clear();
      dom.treeRoot.innerHTML = '';
      await renderDir(state.workspace.root, dom.treeRoot, 0);
      if (!dom.treeRoot.children.length) {
        const hint = document.createElement('div');
        hint.className = 'tree-hint';
        hint.textContent = '工作区是空的';
        dom.treeRoot.appendChild(hint);
      }
    } catch (error) {
      dom.treeRoot.innerHTML = '';
      const errorElement = document.createElement('div');
      errorElement.className = 'tree-error';
      errorElement.textContent = `无法读取工作区：${cleanError(error)}`;
      dom.treeRoot.appendChild(errorElement);
    } finally {
      state.treeBusy = false;
      updateTreeSelection();
      if (state.treeQueued) {
        state.treeQueued = false;
        refreshTree();
      }
    }
  }

  async function renderDir(dirPath, container, depth) {
    const entries = await api.listDir(dirPath);
    container.innerHTML = '';
    if (!entries.length) {
      if (depth > 0) {
        const hint = document.createElement('div');
        hint.className = 'tree-hint';
        hint.style.paddingLeft = `${14 + depth * 14}px`;
        hint.textContent = '空文件夹';
        container.appendChild(hint);
      }
      return;
    }

    const expandedTasks = [];
    for (const entry of entries) {
      state.entryMap.set(entry.path, entry);
      const wrapper = document.createElement('div');
      wrapper.className = 'tree-node';

      const row = document.createElement('div');
      row.className = 'tree-row';
      row.dataset.path = entry.path;
      row.style.paddingLeft = `${8 + depth * 14}px`;
      row.title = entry.path;

      const arrow = document.createElement('span');
      arrow.className = 'tree-arrow';
      if (entry.isDir) {
        arrow.innerHTML = icon('i-chevron-right');
        if (state.expanded.has(entry.path)) arrow.classList.add('expanded');
      } else {
        arrow.classList.add('leaf');
      }

      const iconWrap = document.createElement('span');
      if (entry.isDir) {
        iconWrap.className = 'tree-icon ft-folder';
        iconWrap.innerHTML = icon('i-folder');
      } else {
        iconWrap.className = `tree-icon ${fileClass(entry.name)}`;
        iconWrap.innerHTML = icon('i-file');
      }

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = entry.name;

      row.append(arrow, iconWrap, label);
      wrapper.appendChild(row);

      let children = null;
      if (entry.isDir) {
        children = document.createElement('div');
        children.className = 'tree-children';
        wrapper.appendChild(children);
        row.addEventListener('click', () => toggleFolder(entry, arrow, children, depth));
        row.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectTreePath(entry.path);
          showTreeContextMenu(event, entry);
        });
        if (state.expanded.has(entry.path)) {
          expandedTasks.push(
            renderDir(entry.path, children, depth + 1).catch((error) => {
              children.innerHTML = '';
              const errorElement = document.createElement('div');
              errorElement.className = 'tree-error';
              errorElement.style.paddingLeft = `${14 + (depth + 1) * 14}px`;
              errorElement.textContent = `读取失败：${cleanError(error)}`;
              children.appendChild(errorElement);
            })
          );
        }
      } else {
        row.addEventListener('click', () => {
          selectTreePath(entry.path);
          openFile(entry.path);
        });
        row.addEventListener('contextmenu', (event) => {
          event.preventDefault();
          event.stopPropagation();
          selectTreePath(entry.path);
          showTreeContextMenu(event, entry);
        });
      }

      container.appendChild(wrapper);
    }

    await Promise.all(expandedTasks);
  }

  async function toggleFolder(entry, arrow, children, depth) {
    selectTreePath(entry.path);
    if (state.expanded.has(entry.path)) {
      state.expanded.delete(entry.path);
      arrow.classList.remove('expanded');
      children.innerHTML = '';
      return;
    }
    state.expanded.add(entry.path);
    arrow.classList.add('expanded');
    children.innerHTML = '<div class="tree-hint">正在加载…</div>';
    try {
      await renderDir(entry.path, children, depth + 1);
    } catch (error) {
      children.innerHTML = '';
      const errorElement = document.createElement('div');
      errorElement.className = 'tree-error';
      errorElement.style.paddingLeft = `${14 + (depth + 1) * 14}px`;
      errorElement.textContent = `读取失败：${cleanError(error)}`;
      children.appendChild(errorElement);
    }
  }

  function selectTreePath(filePath) {
    state.selectedTreePath = filePath || null;
    updateTreeSelection();
  }

  function updateTreeSelection() {
    const rows = dom.treeRoot.querySelectorAll('.tree-row');
    for (const row of rows) {
      row.classList.toggle('selected', Boolean(state.selectedTreePath) && samePath(row.dataset.path, state.selectedTreePath));
    }
  }

  function creationBaseDir() {
    if (state.selectedTreePath) {
      const entry = state.entryMap.get(state.selectedTreePath);
      if (entry?.isDir) return state.selectedTreePath;
      return parentDir(state.selectedTreePath);
    }
    if (state.active) return parentDir(state.active.path);
    return state.workspace.root;
  }

  async function newFile(baseOverride) {
    if (!state.workspace) return;
    const base = baseOverride || creationBaseDir();
    const relativeBase = relPath(base);
    const name = await promptInput({
      title: '新建文件',
      message: `创建位置：${relativeBase || '.'}`,
      placeholder: '例如 index.html 或 src/app.js',
      confirmText: '创建'
    });
    if (!name) return;
    const fullPath = joinPath(base, name);
    try {
      await api.createFile(fullPath);
      expandAncestors(fullPath);
      await refreshTree();
      await openFile(fullPath);
      toast(`已创建 ${relPath(fullPath)}`, 'success');
    } catch (error) {
      toast(`创建失败：${cleanError(error)}`, 'error');
    }
  }

  async function newFolder(baseOverride) {
    if (!state.workspace) return;
    const base = baseOverride || creationBaseDir();
    const name = await promptInput({
      title: '新建文件夹',
      message: `创建位置：${relPath(base) || '.'}`,
      placeholder: '例如 components 或 assets/icons',
      confirmText: '创建'
    });
    if (!name) return;
    const fullPath = joinPath(base, name);
    try {
      await api.createDir(fullPath);
      expandAncestors(fullPath);
      await refreshTree();
      selectTreePath(fullPath);
      toast(`已创建文件夹 ${relPath(fullPath)}`, 'success');
    } catch (error) {
      toast(`创建失败：${cleanError(error)}`, 'error');
    }
  }

  async function renameEntry(entry) {
    if (!entry) return;
    const nextName = await promptInput({
      title: '重命名',
      message: `当前名称：${entry.name}`,
      value: entry.name,
      confirmText: '重命名'
    });
    if (!nextName || nextName === entry.name) return;
    const targetPath = joinPath(parentDir(entry.path), nextName);
    try {
      await api.renamePath(entry.path, targetPath);
      updateTabPaths(entry.path, targetPath);
      remapExpandedPaths(entry.path, targetPath);
      if (state.selectedTreePath && (samePath(state.selectedTreePath, entry.path) || isDescendant(state.selectedTreePath, entry.path))) {
        state.selectedTreePath = targetPath + state.selectedTreePath.slice(entry.path.length);
      }
      await refreshTree();
      toast(`已重命名为 ${nextName}`, 'success');
    } catch (error) {
      toast(`重命名失败：${cleanError(error)}`, 'error');
    }
  }

  async function deleteEntry(entry) {
    if (!entry) return;
    const hasOpenTabs = state.tabs.some((tab) => samePath(tab.path, entry.path) || isDescendant(tab.path, entry.path));
    const confirmed = await confirmDialog({
      title: '移到回收站',
      message: `“${entry.name}”将被移入系统回收站，可以从回收站恢复。${hasOpenTabs ? '相关的未保存标签页也会关闭。' : ''}`,
      confirmText: '移到回收站',
      danger: true
    });
    if (!confirmed) return;
    try {
      await api.trashPath(entry.path);
      closeTabsUnder(entry.path);
      if (state.selectedTreePath && (samePath(state.selectedTreePath, entry.path) || isDescendant(state.selectedTreePath, entry.path))) {
        state.selectedTreePath = null;
      }
      for (const expandedPath of Array.from(state.expanded)) {
        if (samePath(expandedPath, entry.path) || isDescendant(expandedPath, entry.path)) {
          state.expanded.delete(expandedPath);
        }
      }
      await refreshTree();
      toast(`已移到回收站：${entry.name}`, 'success');
    } catch (error) {
      toast(`删除失败：${cleanError(error)}`, 'error');
    }
  }

  function showTreeContextMenu(event, entry) {
    const base = entry ? (entry.isDir ? entry.path : parentDir(entry.path)) : state.workspace.root;
    const items = [
      { label: '新建文件', icon: 'i-plus', action: () => newFile(base) },
      { label: '新建文件夹', icon: 'i-folder-plus', action: () => newFolder(base) }
    ];
    if (entry) {
      items.push(
        { separator: true },
        { label: '重命名', icon: 'i-edit', action: () => renameEntry(entry) },
        { label: '移到回收站', icon: 'i-trash', danger: true, action: () => deleteEntry(entry) },
        { separator: true },
        { label: '在资源管理器中显示', icon: 'i-external', action: () => api.revealPath(entry.path) }
      );
    }
    items.push(
      { separator: true },
      { label: '刷新', icon: 'i-refresh', action: () => refreshTree() }
    );
    showContextMenu(event.clientX, event.clientY, items);
  }

  function showContextMenu(x, y, items) {
    dom.contextMenu.innerHTML = '';
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-sep';
        dom.contextMenu.appendChild(sep);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `context-item${item.danger ? ' danger' : ''}`;
      button.innerHTML = icon(item.icon || 'i-command');
      const label = document.createElement('span');
      label.textContent = item.label;
      button.appendChild(label);
      button.addEventListener('click', () => {
        closeContextMenu();
        Promise.resolve()
          .then(() => item.action())
          .catch((error) => toast(cleanError(error), 'error'));
      });
      dom.contextMenu.appendChild(button);
    }
    dom.contextMenu.hidden = false;
    dom.contextMenu.style.left = '0px';
    dom.contextMenu.style.top = '0px';
    const rect = dom.contextMenu.getBoundingClientRect();
    const left = Math.max(6, Math.min(x, window.innerWidth - rect.width - 6));
    const top = Math.max(6, Math.min(y, window.innerHeight - rect.height - 6));
    dom.contextMenu.style.left = `${left}px`;
    dom.contextMenu.style.top = `${top}px`;
  }

  function closeContextMenu() {
    dom.contextMenu.hidden = true;
  }

  async function chooseWorkspace() {
    if (!state.workspace) return;
    if (state.tabs.length) {
      const dirty = state.tabs.some((tab) => tab.dirty);
      const confirmed = await confirmDialog({
        title: '切换工作区',
        message: dirty
          ? '当前有未保存的文件。切换工作区会关闭所有标签页，未保存的更改会丢失。'
          : '切换工作区会关闭当前所有标签页。',
        confirmText: '继续切换',
        danger: dirty
      });
      if (!confirmed) return;
    }
    try {
      const workspace = await api.chooseWorkspace();
      if (!workspace) return;
      applyWorkspace(workspace);
    } catch (error) {
      toast(`打开工作区失败：${cleanError(error)}`, 'error');
    }
  }

  function applyWorkspace(workspace) {
    state.workspace = workspace;
    state.tabs = [];
    state.active = null;
    state.expanded = new Set();
    state.selectedTreePath = null;
    state.entryMap.clear();
    setEditorVisible(false);
    renderTabs();
    updateWorkspaceUI();
    updateStatus();
    updateWindowTitle();
    refreshTree();
    toast(`工作区：${workspace.name}`, 'success');
  }

  async function collapseAllFolders() {
    state.expanded.clear();
    await refreshTree();
  }

  async function sendActiveFile() {
    const tab = state.active;
    if (!tab) {
      toast('请先打开一个文件', 'warn');
      return;
    }
    const selection = state.cm.getSelection();
    const content = selection || tab.doc.getValue();
    if (!content.trim()) {
      toast('文件内容为空', 'warn');
      return;
    }
    if (content.length > 150000) {
      const confirmed = await confirmDialog({
        title: '内容较大',
        message: `当前内容约 ${Math.round(content.length / 1024)} KB，会一次性插入 DeepSeek 输入框。是否继续？`,
        confirmText: '继续发送'
      });
      if (!confirmed) return;
    }
    const from = state.cm.getCursor('from');
    const to = state.cm.getCursor('to');
    const fence = content.includes('```') ? '````' : '```';
    let header = `以下是我在 Yui-IDE-DeepSeek 中打开的文件，请作为上下文参考：\n\n文件: ${relPath(tab.path)}`;
    if (selection) header += `（第 ${from.line + 1}-${to.line + 1} 行）`;
    const text = `${header}\n${fence}${fenceForPath(tab.path)}\n${content.replace(/\r\n/g, '\n')}\n${fence}\n`;
    await insertIntoDeepSeek(text);
  }

  async function sendOutline() {
    if (!state.workspace) return;
    try {
      const outline = await api.projectOutline();
      const text = `以下是我的项目结构（来自 Yui-IDE-DeepSeek），请作为上下文参考：\n\n\`\`\`text\n${outline}\n\`\`\`\n`;
      await insertIntoDeepSeek(text);
    } catch (error) {
      toast(`获取项目结构失败：${cleanError(error)}`, 'error');
    }
  }

  async function insertIntoDeepSeek(text) {
    setChatVisible(true);
    if (state.pendingInsert) {
      const previous = state.pendingInsert;
      state.pendingInsert = null;
      previous.resolve({ ok: false, reason: 'REPLACED' });
    }
    if (!state.webview) {
      await api.copyText(text);
      toast('DeepSeek 面板尚未创建，内容已复制到剪贴板。', 'warn', 6000);
      return;
    }
    const requestId = ++state.insertSeq;
    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (state.pendingInsert && state.pendingInsert.id === requestId) {
          state.pendingInsert = null;
        }
        resolve({ ok: false, reason: 'TIMEOUT' });
      }, 6200);
      state.pendingInsert = {
        id: requestId,
        resolve: (payload) => {
          clearTimeout(timer);
          resolve(payload || { ok: false });
        }
      };
      try {
        state.webview.focus();
        state.webview.send('yui:insert-text', { id: requestId, text });
      } catch (error) {
        clearTimeout(timer);
        state.pendingInsert = null;
        resolve({ ok: false, reason: 'SEND_ERROR', message: error.message });
      }
    });
    if (result.ok) {
      toast('已插入 DeepSeek 输入框。检查内容后按 Enter 发送。', 'success', 3800);
      return;
    }
    await api.copyText(text);
    if (result.reason === 'NO_COMPOSER') {
      toast('未找到 DeepSeek 输入框（可能尚未登录），内容已复制到剪贴板。', 'warn', 6500);
    } else {
      toast('自动插入失败，内容已复制到剪贴板，请在输入框按 Ctrl+V 粘贴。', 'warn', 6500);
    }
  }

  function resolvePendingInsert(payload) {
    if (!state.pendingInsert) return;
    if (payload?.id && state.pendingInsert.id && payload.id !== state.pendingInsert.id) return;
    const pending = state.pendingInsert;
    state.pendingInsert = null;
    pending.resolve(payload || { ok: false });
  }

  function resolvePendingGrab(payload) {
    if (!state.pendingGrab) return;
    if (payload?.id && state.pendingGrab.id && payload.id !== state.pendingGrab.id) return;
    const pending = state.pendingGrab;
    state.pendingGrab = null;
    pending.resolve(payload || { ok: false });
  }

  async function grabLatestCode() {
    if (!state.workspace) {
      toast('请先打开一个工作区', 'warn');
      return;
    }
    if (!state.webview) {
      toast('DeepSeek 面板尚未创建', 'warn');
      return;
    }
    setChatVisible(true);
    dom.grabButton.disabled = true;
    const requestId = ++state.grabSeq;
    const result = await new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (state.pendingGrab && state.pendingGrab.id === requestId) {
          state.pendingGrab = null;
        }
        resolve({ ok: false, reason: 'TIMEOUT' });
      }, 6000);
      state.pendingGrab = {
        id: requestId,
        resolve: (payload) => {
          clearTimeout(timer);
          resolve(payload || { ok: false });
        }
      };
      try {
        state.webview.send('yui:grab-latest', { id: requestId });
      } catch (error) {
        clearTimeout(timer);
        state.pendingGrab = null;
        resolve({ ok: false, reason: 'SEND_ERROR', message: error.message });
      }
    });
    try {
      if (!result.ok) {
        if (result.reason === 'NO_CODE') {
          toast('DeepSeek 最新回复中没有找到代码块', 'info', 5000);
        } else if (result.reason === 'TIMEOUT') {
          toast('抓取代码超时，请确认 DeepSeek 页面已加载后重试', 'warn', 5500);
        } else {
          toast(`抓取代码失败：${result.message || result.reason || '未知错误'}`, 'error', 5500);
        }
        return;
      }
      await saveGrabbedItems(result.items || []);
    } finally {
      dom.grabButton.disabled = false;
    }
  }

  async function saveGrabbedItems(items) {
    let saved = 0;
    let lastPath = null;
    for (const item of items) {
      if (!item || typeof item.code !== 'string' || !item.code.trim()) continue;
      try {
        const result = await api.saveCapture({
          code: item.code,
          lang: item.lang,
          title: item.title,
          auto: true
        });
        if (!result || result.duplicate) continue;
        saved += 1;
        lastPath = result.path;
      } catch {
      }
    }
    if (!saved) {
      toast('没有新的代码块可抓取，可能已经抓取过', 'info', 4500);
      return;
    }
    state.capturedCount += saved;
    updateCaptureUI();
    const capturesDir = joinPath(state.workspace.root, 'captures');
    state.expanded.add(capturesDir);
    await refreshTree();
    if (lastPath) await openFile(lastPath, { focus: false });
    toast(`已抓取 ${saved} 段代码 → captures/`, 'success', 4200);
  }

  function toggleAutoCapture() {
    state.autoCapture = !state.autoCapture;
    syncAutoCapture();
    updateCaptureUI();
    if (state.autoCapture) {
      toast('自动抓取已开启，只抓取之后生成的新代码。当前回复可点按代码图标抓取。', 'info', 5200);
    } else {
      toast('自动抓取已关闭', 'info');
    }
  }

  function syncAutoCapture() {
    if (!state.webview) return;
    try {
      state.webview.send('yui:set-auto-capture', state.autoCapture);
    } catch {
    }
  }

  function updateCaptureUI() {
    dom.autoPill.classList.toggle('active', state.autoCapture);
    dom.autoPill.setAttribute('aria-pressed', String(state.autoCapture));
    if (state.capturedCount > 0) {
      dom.captureCountLabel.textContent = `已抓取 ${state.capturedCount} 段代码`;
    } else {
      dom.captureCountLabel.textContent = '尚未抓取代码';
    }
    dom.statusCapture.textContent = state.autoCapture
      ? `自动抓取：开${state.capturedCount ? ` · ${state.capturedCount}` : ''}`
      : '自动抓取：关';
  }

  async function handleCapturedCode(payload, auto) {
    if (!payload || typeof payload.code !== 'string' || !payload.code.trim()) return;
    try {
      const result = await api.saveCapture({
        code: payload.code,
        lang: payload.lang,
        title: payload.title,
        auto
      });
      if (!result || result.duplicate) return;
      state.capturedCount += 1;
      updateCaptureUI();
      const capturesDir = joinPath(state.workspace.root, 'captures');
      state.expanded.add(capturesDir);
      if (auto) {
        toast(`自动抓取代码 → ${result.rel}`, 'success', 3600);
        scheduleCaptureTreeRefresh();
      } else {
        await refreshTree();
        await openFile(result.path, { focus: false });
        toast(`已捕获代码 → ${result.rel}`, 'success', 4200);
      }
    } catch (error) {
      if (!auto) {
        toast(`抓取失败：${cleanError(error)}`, 'error');
      }
    }
  }

  function scheduleCaptureTreeRefresh() {
    if (state.captureRefreshTimer) return;
    state.captureRefreshTimer = setTimeout(() => {
      state.captureRefreshTimer = null;
      refreshTree();
    }, 600);
  }

  function initSplitter(savedWidth) {
    const clampWidth = (width) => {
      const max = Math.max(360, Math.min(Math.round(window.innerWidth * 0.66), window.innerWidth - 640));
      return Math.min(Math.max(360, Math.round(width)), max);
    };
    state.chatWidthPx = clampWidth(savedWidth > 0 ? savedWidth : Math.round(window.innerWidth * 0.44));
    dom.chatPane.style.width = `${state.chatWidthPx}px`;

    const persistWidth = () => {
      if (state.settingsTimer) clearTimeout(state.settingsTimer);
      state.settingsTimer = setTimeout(() => {
        state.settingsTimer = null;
        api.setSettings({ chatWidth: state.chatWidthPx }).catch(() => {});
      }, 350);
    };

    let dragging = false;
    dom.splitter.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      dragging = true;
      const startX = event.clientX;
      const startWidth = dom.chatPane.getBoundingClientRect().width;
      dom.splitter.setPointerCapture(event.pointerId);
      dom.splitter.classList.add('dragging');
      document.body.classList.add('resizing');

      const onMove = (moveEvent) => {
        if (!dragging) return;
        const nextWidth = clampWidth(startWidth + (startX - moveEvent.clientX));
        state.chatWidthPx = nextWidth;
        dom.chatPane.style.width = `${nextWidth}px`;
      };

      const onUp = () => {
        if (!dragging) return;
        dragging = false;
        dom.splitter.classList.remove('dragging');
        document.body.classList.remove('resizing');
        dom.splitter.removeEventListener('pointermove', onMove);
        dom.splitter.removeEventListener('pointerup', onUp);
        dom.splitter.removeEventListener('pointercancel', onUp);
        try {
          dom.splitter.releasePointerCapture(event.pointerId);
        } catch {
        }
        persistWidth();
      };

      dom.splitter.addEventListener('pointermove', onMove);
      dom.splitter.addEventListener('pointerup', onUp);
      dom.splitter.addEventListener('pointercancel', onUp);
    });

    dom.splitter.addEventListener('dblclick', () => {
      state.chatWidthPx = clampWidth(Math.round(window.innerWidth * 0.44));
      dom.chatPane.style.width = `${state.chatWidthPx}px`;
      persistWidth();
    });

    window.addEventListener('resize', () => {
      const clamped = clampWidth(state.chatWidthPx);
      if (clamped !== state.chatWidthPx) {
        state.chatWidthPx = clamped;
        dom.chatPane.style.width = `${clamped}px`;
      }
    });
  }

  function setChatVisible(visible) {
    dom.chatPane.classList.toggle('hidden', !visible);
    dom.splitter.classList.toggle('hidden', !visible);
    dom.chatToggle.classList.toggle('is-active', visible);
  }

  function setDsStatus(kind) {
    dom.dsDot.classList.remove('online', 'error');
    dom.statusDs.classList.remove('online', 'error');
    if (kind === 'online') {
      dom.dsDot.classList.add('online');
      dom.statusDs.classList.add('online');
    } else if (kind === 'error') {
      dom.dsDot.classList.add('error');
      dom.statusDs.classList.add('error');
    }
  }

  function showLoadingOverlay(title = '正在连接 DeepSeek', subtitle = '登录状态会自动保存在本地') {
    state.webviewHasError = false;
    dom.dsOverlay.classList.remove('hidden', 'error');
    dom.dsOverlayTitle.textContent = title;
    dom.dsOverlaySub.textContent = subtitle;
    dom.dsOverlayActions.hidden = true;
  }

  function showErrorOverlay(title, subtitle) {
    state.webviewHasError = true;
    dom.dsOverlay.classList.remove('hidden');
    dom.dsOverlay.classList.add('error');
    dom.dsOverlayTitle.textContent = title;
    dom.dsOverlaySub.textContent = subtitle;
    dom.dsOverlayActions.hidden = false;
  }

  function hideOverlay() {
    dom.dsOverlay.classList.add('hidden');
  }

  function updateNavButtons() {
    if (!state.webview) return;
    try {
      dom.btnDsBack.disabled = !state.webview.canGoBack();
      dom.btnDsForward.disabled = !state.webview.canGoForward();
    } catch {
      dom.btnDsBack.disabled = true;
      dom.btnDsForward.disabled = true;
    }
  }

  function setupWebview() {
    const webview = document.createElement('webview');
    webview.id = 'ds-webview';
    webview.setAttribute('partition', 'persist:deepseek');
    webview.setAttribute('preload', state.info.deepseekPreload);
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=no');

    webview.addEventListener('dom-ready', () => {
      state.webviewReady = true;
      syncAutoCapture();
      updateNavButtons();
      setDsStatus('online');
    });

    webview.addEventListener('did-start-loading', () => {
      state.webviewReady = false;
      if (!state.webviewHasError) showLoadingOverlay();
      updateNavButtons();
    });

    webview.addEventListener('did-stop-loading', () => {
      state.webviewReady = true;
      syncAutoCapture();
      updateNavButtons();
      if (!state.webviewHasError) {
        hideOverlay();
        setDsStatus('online');
      }
    });

    webview.addEventListener('did-fail-load', (event) => {
      if (event.isMainFrame === false) return;
      if (event.errorCode === -3) return;
      state.webviewReady = false;
      showErrorOverlay('无法加载 DeepSeek', `${event.errorDescription || '网络连接失败'}。请检查网络后重试，或在浏览器中打开。`);
      setDsStatus('error');
    });

    webview.addEventListener('render-process-gone', () => {
      state.webviewReady = false;
      showErrorOverlay('DeepSeek 页面已停止运行', '页面进程异常退出，可以重新加载或稍后再试。');
      setDsStatus('error');
    });

    webview.addEventListener('did-navigate', () => {
      updateNavButtons();
      setDsStatus('online');
    });

    webview.addEventListener('did-navigate-in-page', () => {
      state.webviewReady = true;
      syncAutoCapture();
      updateNavButtons();
    });

    webview.addEventListener('ipc-message', (event) => {
      const payload = event.args && event.args.length ? event.args[0] : null;
      switch (event.channel) {
        case 'yui:bridge-ready':
          state.webviewReady = true;
          syncAutoCapture();
          break;
        case 'yui:insert-result':
          resolvePendingInsert(payload);
          break;
        case 'yui:grab-result':
          resolvePendingGrab(payload);
          break;
        case 'yui:capture':
          handleCapturedCode(payload, false);
          break;
        case 'yui:auto-capture':
          handleCapturedCode(payload, true);
          break;
        case 'yui:copy-code':
          if (payload && typeof payload.text === 'string') {
            api.copyText(payload.text);
          }
          break;
        default:
          break;
      }
    });

    webview.setAttribute('src', state.info.deepseekUrl || 'https://chat.deepseek.com/');
    dom.webviewHost.appendChild(webview);
    state.webview = webview;
    showLoadingOverlay();
    updateNavButtons();
  }

  function reloadDeepSeek() {
    if (!state.webview) return;
    showLoadingOverlay('正在重新加载 DeepSeek', '登录状态会自动保存在本地');
    setDsStatus('');
    try {
      state.webview.reload();
    } catch {
      try {
        state.webview.loadURL(state.info.deepseekUrl || 'https://chat.deepseek.com/');
      } catch {
        showErrorOverlay('无法加载 DeepSeek', '请尝试重启 Yui-IDE-DeepSeek。');
      }
    }
  }

  function toast(message, type = 'info', duration = 4200) {
    const iconName = type === 'success' ? 'i-check' : type === 'error' ? 'i-warning' : type === 'warn' ? 'i-warning' : 'i-info';
    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.innerHTML = `<span class="toast-icon">${icon(iconName)}</span><span class="toast-text"></span>`;
    element.querySelector('.toast-text').textContent = message;
    dom.toasts.appendChild(element);
    while (dom.toasts.children.length > 4) dom.toasts.firstElementChild.remove();
    let timer = setTimeout(dismiss, duration);
    element.addEventListener('click', dismiss);
    function dismiss() {
      if (!element.isConnected) return;
      clearTimeout(timer);
      element.classList.add('leaving');
      setTimeout(() => element.remove(), 190);
    }
  }

  function openDialog(options) {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      const title = document.createElement('h2');
      title.className = 'modal-title';
      title.textContent = options.title || '';

      const message = document.createElement('p');
      message.className = 'modal-message';
      message.textContent = options.message || '';

      modal.appendChild(title);
      if (options.message) modal.appendChild(message);

      let input = null;
      if (options.input) {
        const field = document.createElement('div');
        field.className = 'modal-field';
        const label = document.createElement('label');
        label.className = 'modal-label';
        label.textContent = options.label || '名称';
        input = document.createElement('input');
        input.className = 'modal-input';
        input.type = 'text';
        input.placeholder = options.placeholder || '';
        input.value = options.value || '';
        input.spellcheck = false;
        label.setAttribute('for', 'yui-modal-input');
        input.id = 'yui-modal-input';
        field.append(label, input);
        modal.appendChild(field);
      }

      const actions = document.createElement('div');
      actions.className = 'modal-actions';

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'modal-btn';
      cancelButton.textContent = options.cancelText || '取消';

      const confirmButton = document.createElement('button');
      confirmButton.type = 'button';
      confirmButton.className = `modal-btn ${options.danger ? 'danger' : 'primary'}`;
      confirmButton.textContent = options.confirmText || '确定';

      actions.append(cancelButton, confirmButton);
      modal.appendChild(actions);
      backdrop.appendChild(modal);

      const finish = (value) => {
        document.removeEventListener('keydown', onKeyDown, true);
        backdrop.remove();
        resolve(value);
      };

      const cancel = () => finish(options.input ? null : false);

      const confirm = () => {
        if (options.input) {
          const value = input.value.trim();
          if (!value) {
            input.focus();
            return;
          }
          finish(value);
        } else {
          finish(true);
        }
      };

      const onKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancel();
          return;
        }
        if (event.key === 'Enter' && options.input) {
          event.preventDefault();
          confirm();
        }
      };

      cancelButton.addEventListener('click', cancel);
      confirmButton.addEventListener('click', confirm);
      backdrop.addEventListener('mousedown', (event) => {
        if (event.target === backdrop) cancel();
      });
      document.addEventListener('keydown', onKeyDown, true);

      dom.modalRoot.appendChild(backdrop);
      requestAnimationFrame(() => {
        if (input) {
          input.focus();
          input.select();
        } else {
          confirmButton.focus();
        }
      });
    });
  }

  function promptInput(options) {
    return openDialog({ ...options, input: true });
  }

  function confirmDialog(options) {
    return openDialog({ ...options, input: false });
  }

  function cycleTab(direction) {
    if (state.tabs.length < 2) return;
    const currentIndex = state.active ? state.tabs.indexOf(state.active) : 0;
    const nextIndex = (currentIndex + direction + state.tabs.length) % state.tabs.length;
    activateTab(state.tabs[nextIndex]);
  }

  function bindEvents() {
    $('btn-open-workspace').addEventListener('click', chooseWorkspace);
    $('btn-workspace-change').addEventListener('click', chooseWorkspace);
    $('welcome-open').addEventListener('click', chooseWorkspace);
    $('btn-new-file').addEventListener('click', () => newFile());
    $('btn-tree-new-file').addEventListener('click', () => newFile());
    $('welcome-new').addEventListener('click', () => newFile());
    $('btn-tree-new-folder').addEventListener('click', () => newFolder());
    $('btn-save').addEventListener('click', saveActive);
    $('btn-tree-refresh').addEventListener('click', refreshTree);
    $('btn-tree-collapse').addEventListener('click', collapseAllFolders);
    $('btn-outline').addEventListener('click', sendOutline);
    $('btn-send-file').addEventListener('click', sendActiveFile);
    dom.grabButton.addEventListener('click', grabLatestCode);
    $('btn-auto').addEventListener('click', toggleAutoCapture);
    dom.chatToggle.addEventListener('click', () => {
      setChatVisible(dom.chatPane.classList.contains('hidden'));
    });
    $('btn-ds-close').addEventListener('click', () => setChatVisible(false));
    $('btn-ds-back').addEventListener('click', () => {
      try {
        if (state.webview?.canGoBack()) state.webview.goBack();
      } catch {
      }
    });
    $('btn-ds-forward').addEventListener('click', () => {
      try {
        if (state.webview?.canGoForward()) state.webview.goForward();
      } catch {
      }
    });
    $('btn-ds-reload').addEventListener('click', reloadDeepSeek);
    $('btn-ds-retry').addEventListener('click', reloadDeepSeek);
    $('btn-ds-external').addEventListener('click', () => {
      let url = state.info.deepseekUrl;
      try {
        url = state.webview?.getURL() || url;
      } catch {
      }
      api.openExternal(url);
    });
    $('btn-ds-open-browser').addEventListener('click', () => {
      api.openExternal(state.info.deepseekUrl || 'https://chat.deepseek.com/');
    });

    dom.treeRoot.addEventListener('contextmenu', (event) => {
      if (event.target.closest('.tree-row')) return;
      event.preventDefault();
      selectTreePath(null);
      showTreeContextMenu(event, null);
    });

    document.addEventListener('mousedown', (event) => {
      if (!dom.contextMenu.hidden && !dom.contextMenu.contains(event.target)) {
        closeContextMenu();
      }
    }, true);

    window.addEventListener('blur', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !dom.contextMenu.hidden) {
        closeContextMenu();
        return;
      }
      if (event.defaultPrevented) return;
      if (document.querySelector('.modal-backdrop')) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      const key = event.key.toLowerCase();
      if (key === 's') {
        event.preventDefault();
        if (event.shiftKey) sendActiveFile();
        else saveActive();
        return;
      }
      if (key === 'w' && !event.shiftKey) {
        event.preventDefault();
        if (state.active) closeTab(state.active);
        return;
      }
      if (key === 'n' && !event.shiftKey) {
        event.preventDefault();
        newFile();
        return;
      }
      if (key === 'o' && !event.shiftKey) {
        event.preventDefault();
        chooseWorkspace();
        return;
      }
      if (key === 'tab') {
        event.preventDefault();
        cycleTab(event.shiftKey ? -1 : 1);
      }
    });
  }

  async function init() {
    if (!api) {
      document.body.textContent = 'Yui-IDE-DeepSeek 预加载脚本未生效。';
      return;
    }
    bindEvents();
    createEditor();
    setEditorVisible(false);
    state.info = await api.appInfo();
    state.workspace = await api.getWorkspace();
    const settings = await api.getSettings();
    initSplitter(Number(settings.chatWidth) || 0);
    updateWorkspaceUI();
    updateCaptureUI();
    updateStatus();
    setupWebview();
    await refreshTree();
    renderTabs();
    api.ready();
  }

  init().catch((error) => {
    console.error(error);
    try {
      toast(`初始化失败：${cleanError(error)}`, 'error', 9000);
    } catch {
    }
  });
})();
