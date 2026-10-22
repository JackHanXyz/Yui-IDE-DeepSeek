const { ipcRenderer } = require('electron');

const MAX_CAPTURE_CHARS = 200 * 1024;
const SCAN_INTERVAL = 900;
const STABLE_TICKS = 3;

const LANGUAGE_ALIASES = {
  'c++': 'cpp', cplusplus: 'cpp', cc: 'cpp', cxx: 'cpp',
  'c#': 'csharp', cs: 'csharp', dotnet: 'csharp',
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', node: 'javascript',
  jsx: 'jsx', react: 'jsx',
  ts: 'typescript', tsx: 'tsx',
  py: 'python', python3: 'python',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
  ps1: 'powershell', pwsh: 'powershell',
  yml: 'yaml', md: 'markdown', mdx: 'markdown',
  rb: 'ruby', rs: 'rust', kt: 'kotlin', golang: 'go',
  htm: 'html', scss: 'scss', postgres: 'sql', postgresql: 'sql',
  mysql: 'sql', sqlite: 'sql', gql: 'graphql',
  plaintext: 'text', plain: 'text', txt: 'text', console: 'text', output: 'text'
};

const KNOWN_LANGUAGES = new Set([
  'javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'python', 'py',
  'html', 'css', 'scss', 'sass', 'less', 'json', 'markdown', 'md', 'bash',
  'sh', 'shell', 'powershell', 'sql', 'java', 'kotlin', 'scala', 'c', 'cpp',
  'c++', 'csharp', 'c#', 'go', 'golang', 'rust', 'php', 'ruby', 'swift',
  'dart', 'lua', 'r', 'perl', 'yaml', 'yml', 'toml', 'xml', 'svg', 'vue',
  'svelte', 'dockerfile', 'makefile', 'nginx', 'graphql', 'diff', 'text',
  'plaintext', 'vue', 'solidity', 'haskell', 'elixir'
]);

let autoCapture = false;
let scanner = null;
let toolbarHost = null;
let toolbarBar = null;
let langLabel = null;
let captureButton = null;
let copyButton = null;
let currentPre = null;
let hideTimer = null;
let feedbackTimer = null;
let tooltipVisible = false;
let suppressedPres = new WeakSet();
let capturedHashes = new Set();

function simpleHash(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalizeLanguage(raw) {
  if (!raw) return '';
  let value = String(raw).trim().toLowerCase();
  value = value.replace(/^language[-_:]/, '').replace(/^lang[-_:]/, '');
  value = value.replace(/[)}\]>"'.,;:]+$/, '').trim();
  const firstToken = value.split(/[\s/]+/)[0];
  if (!firstToken) return '';
  if (LANGUAGE_ALIASES[firstToken]) return LANGUAGE_ALIASES[firstToken];
  if (KNOWN_LANGUAGES.has(firstToken)) return firstToken;
  return '';
}

function detectLanguage(pre, codeElement) {
  const elements = [codeElement, pre, pre.parentElement].filter(Boolean);
  for (const element of elements) {
    const className = typeof element.className === 'string' ? element.className : '';
    const classMatch = className.match(/(?:language|lang)[-_:]([a-z0-9#+._-]+)/i);
    if (classMatch) {
      const normalized = normalizeLanguage(classMatch[1]);
      if (normalized) return normalized;
    }
    for (const attribute of ['data-language', 'data-lang', 'lang']) {
      if (element.hasAttribute && element.hasAttribute(attribute)) {
        const normalized = normalizeLanguage(element.getAttribute(attribute));
        if (normalized) return normalized;
      }
    }
  }

  const wrapper = pre.parentElement;
  if (wrapper) {
    const candidates = wrapper.querySelectorAll('span, div, button, [class*="lang"]');
    let checked = 0;
    for (const candidate of candidates) {
      if (checked >= 20) break;
      if (candidate.contains(pre) || pre.contains(candidate)) continue;
      const text = (candidate.textContent || '').trim().toLowerCase();
      if (!text || text.length > 24 || text.includes('\n')) continue;
      checked += 1;
      const normalized = normalizeLanguage(text);
      if (normalized) return normalized;
    }
  }

  return 'text';
}

function extractCode(pre) {
  const codeElement = pre.querySelector('code');
  const source = codeElement || pre;
  let text = '';
  try {
    text = source.innerText || source.textContent || '';
  } catch {
    text = source.textContent || '';
  }
  return text.replace(/\r\n/g, '\n').replace(/\n+$/, '');
}

function getConversationTitle() {
  const title = document.title || '';
  return title.replace(/\s*[-–—|]\s*DeepSeek.*$/i, '').trim().slice(0, 120);
}

function createToolbar() {
  if (toolbarHost) return;
  toolbarHost = document.createElement('div');
  toolbarHost.setAttribute('data-yui-toolbar', '');
  toolbarHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;';
  const shadow = toolbarHost.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      .bar {
        position: fixed;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 7px;
        border-radius: 11px;
        background: rgba(15, 17, 24, 0.97);
        border: 1px solid rgba(124, 143, 255, 0.36);
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.48), 0 0 0 1px rgba(0, 0, 0, 0.2);
        font-family: "Segoe UI", "Microsoft YaHei UI", system-ui, sans-serif;
        color: #e7ebf3;
        opacity: 0;
        visibility: hidden;
        transform: translateY(4px);
        transition: opacity 0.14s ease, transform 0.14s ease, visibility 0.14s;
        pointer-events: none;
        white-space: nowrap;
      }
      .bar.show {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
        pointer-events: auto;
      }
      .lang {
        padding: 4px 6px 4px 8px;
        color: #98a2b7;
        font-family: "Cascadia Code", Consolas, ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.02em;
        max-width: 92px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sep {
        width: 1px;
        height: 16px;
        background: rgba(255, 255, 255, 0.1);
      }
      .btn {
        appearance: none;
        border: 0;
        background: rgba(255, 255, 255, 0.065);
        color: #e2e7f2;
        border-radius: 7px;
        padding: 6px 9px;
        font: inherit;
        font-size: 11.5px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        cursor: pointer;
        transition: background 0.14s ease, color 0.14s ease;
      }
      .btn:hover { background: rgba(109, 141, 255, 0.24); color: #ffffff; }
      .btn:active { transform: translateY(1px); }
      .btn.primary {
        background: linear-gradient(135deg, #5b7cfa, #7b61ff);
        color: #fff;
        box-shadow: 0 2px 10px rgba(91, 124, 250, 0.3);
      }
      .btn.primary:hover { background: linear-gradient(135deg, #6d8cff, #8c75ff); }
      .btn svg { width: 12px; height: 12px; }
    </style>
    <div class="bar" part="bar">
      <span class="lang"></span>
      <span class="sep"></span>
      <button class="btn primary" type="button" data-action="capture">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12.5V3.5"/><path d="M4.5 7L8 3.5 11.5 7"/></svg>
        <span class="capture-text">发送到 IDE</span>
      </button>
      <button class="btn" type="button" data-action="copy">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="7" height="8" rx="1.5"/><path d="M10.5 5.5v-1a1.5 1.5 0 0 0-1.5-1.5H4.5A1.5 1.5 0 0 0 3 4.5v6A1.5 1.5 0 0 0 4.5 12h1"/></svg>
        <span class="copy-text">复制</span>
      </button>
    </div>
  `;
  document.documentElement.appendChild(toolbarHost);
  toolbarBar = shadow.querySelector('.bar');
  langLabel = shadow.querySelector('.lang');
  captureButton = shadow.querySelector('[data-action="capture"]');
  copyButton = shadow.querySelector('[data-action="copy"]');

  captureButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    captureCurrentCode();
  });
  copyButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    copyCurrentCode();
  });
  toolbarBar.addEventListener('pointerenter', cancelHide);
  toolbarBar.addEventListener('pointerleave', () => scheduleHide(200));

  document.addEventListener('mouseover', onDocumentMouseOver, true);
  document.addEventListener('mouseout', onDocumentMouseOut, true);
  window.addEventListener('scroll', () => {
    if (tooltipVisible) positionToolbar();
  }, true);
  window.addEventListener('resize', () => {
    if (tooltipVisible) positionToolbar();
  });
  window.addEventListener('blur', () => scheduleHide(80));
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width < 12 || rect.height < 8) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity) !== 0;
}

function onDocumentMouseOver(event) {
  const path = event.composedPath();
  if (toolbarHost && path.includes(toolbarHost)) {
    cancelHide();
    return;
  }
  const target = path[0];
  if (!(target instanceof Element)) return;
  if (target.closest('[data-yui-toolbar]')) {
    cancelHide();
    return;
  }
  const pre = target.closest('pre');
  if (!pre || pre.closest('[contenteditable="true"]') || !isVisible(pre)) {
    scheduleHide(180);
    return;
  }
  if (pre !== currentPre) {
    currentPre = pre;
    resetFeedback();
    updateLanguageLabel();
  }
  showToolbar();
}

function onDocumentMouseOut(event) {
  if (!tooltipVisible) return;
  const path = event.composedPath();
  if (toolbarHost && path.includes(toolbarHost)) return;
  const target = path[0];
  if (target instanceof Element && target.closest('pre') === currentPre) {
    const related = event.relatedTarget;
    if (related && related instanceof Node) {
      const relatedElement = related instanceof Element ? related : related.parentElement;
      if (relatedElement && (toolbarHost?.contains(relatedElement) || relatedElement.closest?.('[data-yui-toolbar]'))) {
        cancelHide();
        return;
      }
    }
    scheduleHide(220);
  }
}

function updateLanguageLabel() {
  if (!currentPre || !langLabel) return;
  const codeElement = currentPre.querySelector('code');
  const language = detectLanguage(currentPre, codeElement);
  langLabel.textContent = language === 'text' ? '代码' : language;
  langLabel.title = '检测到的语言: ' + language;
}

function positionToolbar() {
  if (!toolbarBar) return;
  if (!currentPre || !currentPre.isConnected || !isVisible(currentPre)) {
    hideToolbar();
    return;
  }
  const rect = currentPre.getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    hideToolbar();
    return;
  }
  const margin = 8;
  const width = toolbarBar.offsetWidth;
  const height = toolbarBar.offsetHeight;
  let left = Math.min(Math.max(rect.left + 12, margin), window.innerWidth - width - margin);
  let top = rect.top + 10;
  if (top + height > window.innerHeight - margin) {
    top = Math.max(margin, rect.bottom - height - 10);
  }
  toolbarBar.style.left = `${Math.round(left)}px`;
  toolbarBar.style.top = `${Math.round(top)}px`;
}

function showToolbar() {
  if (!toolbarBar) return;
  cancelHide();
  tooltipVisible = true;
  toolbarBar.classList.add('show');
  positionToolbar();
}

function hideToolbar() {
  tooltipVisible = false;
  if (toolbarBar) toolbarBar.classList.remove('show');
  currentPre = null;
}

function scheduleHide(delay = 180) {
  cancelHide();
  hideTimer = setTimeout(() => {
    hideToolbar();
  }, delay);
}

function cancelHide() {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

function resetFeedback() {
  if (feedbackTimer) {
    clearTimeout(feedbackTimer);
    feedbackTimer = null;
  }
  const captureText = captureButton?.querySelector('.capture-text');
  const copyText = copyButton?.querySelector('.copy-text');
  if (captureText) captureText.textContent = '发送到 IDE';
  if (copyText) copyText.textContent = '复制';
}

function flashFeedback(button, selector, text) {
  const label = button?.querySelector(selector);
  if (!label) return;
  label.textContent = text;
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    label.textContent = selector === '.capture-text' ? '发送到 IDE' : '复制';
  }, 1100);
}

function captureCurrentCode() {
  if (!currentPre || !currentPre.isConnected) return;
  const code = extractCode(currentPre);
  if (!code.trim()) return;
  const language = detectLanguage(currentPre, currentPre.querySelector('code'));
  ipcRenderer.sendToHost('yui:capture', {
    code: code.length > MAX_CAPTURE_CHARS ? code.slice(0, MAX_CAPTURE_CHARS) : code,
    lang: language,
    title: getConversationTitle(),
    url: location.href
  });
  flashFeedback(captureButton, '.capture-text', '已发送');
}

function copyCurrentCode() {
  if (!currentPre || !currentPre.isConnected) return;
  const code = extractCode(currentPre);
  if (!code) return;
  ipcRenderer.sendToHost('yui:copy-code', { text: code });
  flashFeedback(copyButton, '.copy-text', '已复制');
}

function trimCapturedHashes() {
  if (capturedHashes.size <= 600) return;
  const oldest = capturedHashes.values().next().value;
  if (oldest) capturedHashes.delete(oldest);
}

function getAssistantContainers() {
  const mainContent = Array.from(document.querySelectorAll('.ds-assistant-message-main-content'));
  if (mainContent.length) return mainContent;
  return Array.from(document.querySelectorAll('.ds-markdown'));
}

function getLatestCodeBlocks() {
  const containers = getAssistantContainers();
  for (let index = containers.length - 1; index >= 0; index -= 1) {
    const blocks = Array.from(containers[index].querySelectorAll('pre'))
      .filter((pre) => !pre.closest('[contenteditable="true"]'));
    if (blocks.length) return blocks;
  }
  return [];
}

function getAutoScanBlocks() {
  const containers = Array.from(document.querySelectorAll('.ds-assistant-message-main-content'));
  if (containers.length) {
    return Array.from(containers[containers.length - 1].querySelectorAll('pre'));
  }
  return getLatestCodeBlocks();
}

function scanForAutoCapture() {
  if (!autoCapture) return;
  const codeBlocks = getAutoScanBlocks();
  for (const pre of codeBlocks) {
    if (suppressedPres.has(pre)) continue;
    if (pre.closest('[contenteditable="true"]')) continue;
    if (!isVisible(pre)) continue;
    const code = extractCode(pre);
    if (!code.trim()) continue;
    if (pre.__yuiLastCode !== code) {
      pre.__yuiLastCode = code;
      pre.__yuiStable = 0;
      continue;
    }
    pre.__yuiStable = (pre.__yuiStable || 0) + 1;
    if (pre.__yuiStable < STABLE_TICKS) continue;
    const language = detectLanguage(pre, pre.querySelector('code'));
    const hash = simpleHash(`${language}\n${code}`);
    if (capturedHashes.has(hash)) continue;
    capturedHashes.add(hash);
    trimCapturedHashes();
    if (code.length > MAX_CAPTURE_CHARS) continue;
    ipcRenderer.sendToHost('yui:auto-capture', {
      code,
      lang: language,
      title: getConversationTitle(),
      url: location.href
    });
  }
}

function startAutoCapture() {
  const existingBlocks = document.querySelectorAll('pre');
  suppressedPres = new WeakSet();
  for (const block of existingBlocks) suppressedPres.add(block);
  if (!scanner) scanner = setInterval(scanForAutoCapture, SCAN_INTERVAL);
}

function stopAutoCapture() {
  if (scanner) {
    clearInterval(scanner);
    scanner = null;
  }
}

function findComposer() {
  const selectors = [
    '#chat-input',
    'textarea[placeholder*="DeepSeek"]',
    'textarea[placeholder*="发送"]',
    'textarea[placeholder*="Message"]',
    '[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"]',
    'div[role="textbox"]',
    'textarea'
  ];
  const isUsable = (element) => {
    if (element.closest('[data-yui-toolbar]')) return false;
    const rect = element.getBoundingClientRect();
    if (rect.width < 80 || rect.height < 16) return false;
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none' && style.pointerEvents !== 'none';
  };
  for (const selector of selectors) {
    const candidates = Array.from(document.querySelectorAll(selector)).filter(isUsable);
    if (candidates.length) {
      candidates.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectB.width * rectB.height - rectA.width * rectA.height;
      });
      return candidates[0];
    }
  }
  return null;
}

function insertIntoComposer(text) {
  const selector = document.activeElement;
  const target = findComposer() || (selector && selector.isContentEditable ? selector : null);
  if (!target) return false;
  target.focus({ preventScroll: true });

  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const prototype = target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    const current = target.value || '';
    const separator = current && !/\n$/.test(current) ? '\n\n' : '';
    const nextValue = current + separator + text;
    if (setter) setter.call(target, nextValue);
    else target.value = nextValue;
    if (typeof target.setSelectionRange === 'function') {
      target.setSelectionRange(nextValue.length, nextValue.length);
    }
    target.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'insertText',
      data: text
    }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    target.scrollIntoView({ block: 'nearest' });
    return true;
  }

  if (target.isContentEditable || target.getAttribute('role') === 'textbox') {
    const selection = window.getSelection();
    if (!selection) return false;
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    const currentText = (target.innerText || '').trim();
    const prefix = currentText ? '\n\n' : '';
    let inserted = false;
    try {
      inserted = document.execCommand('insertText', false, prefix + text);
    } catch {
      inserted = false;
    }
    if (!inserted) {
      target.dispatchEvent(new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: prefix + text
      }));
    }
    target.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'insertText',
      data: prefix + text
    }));
    target.scrollIntoView({ block: 'nearest' });
    return true;
  }

  return false;
}

function grabLatestCode(requestId) {
  const blocks = getLatestCodeBlocks();
  if (!blocks.length) {
    ipcRenderer.sendToHost('yui:grab-result', {
      id: requestId,
      ok: false,
      reason: 'NO_CODE'
    });
    return;
  }
  const items = [];
  let total = 0;
  for (const pre of blocks) {
    const code = extractCode(pre);
    if (!code.trim()) continue;
    if (code.length > MAX_CAPTURE_CHARS) continue;
    if (total + code.length > 900 * 1024) break;
    total += code.length;
    items.push({
      code,
      lang: detectLanguage(pre, pre.querySelector('code')),
      title: getConversationTitle(),
      url: location.href
    });
    if (items.length >= 24) break;
  }
  ipcRenderer.sendToHost('yui:grab-result', {
    id: requestId,
    ok: items.length > 0,
    reason: items.length ? null : 'NO_CODE',
    items
  });
}

function attemptInsert(text, requestId, attempt = 0) {
  const inserted = insertIntoComposer(text);
  if (inserted) {
    ipcRenderer.sendToHost('yui:insert-result', {
      id: requestId,
      ok: true,
      length: text.length
    });
    return;
  }
  if (attempt < 15) {
    setTimeout(() => attemptInsert(text, requestId, attempt + 1), 350);
    return;
  }
  ipcRenderer.sendToHost('yui:insert-result', {
    id: requestId,
    ok: false,
    reason: 'NO_COMPOSER'
  });
}

function boot() {
  if (toolbarHost) return;
  createToolbar();
  ipcRenderer.sendToHost('yui:bridge-ready');
}

ipcRenderer.on('yui:set-auto-capture', (event, enabled) => {
  const next = Boolean(enabled);
  if (next === autoCapture) return;
  autoCapture = next;
  if (next) startAutoCapture();
  else stopAutoCapture();
});

ipcRenderer.on('yui:insert-text', (event, payload) => {
  const text = typeof payload === 'string' ? payload : payload?.text;
  const requestId = typeof payload === 'object' ? payload?.id : null;
  if (typeof text !== 'string' || !text.trim()) return;
  attemptInsert(text, requestId);
});

ipcRenderer.on('yui:grab-latest', (event, payload) => {
  grabLatestCode(payload?.id ?? null);
});

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
