/**
 * popup.js — HTML Element Picker  v4.0
 *
 * Single source of injection truth:
 * - manifest.json has NO content_scripts declaration
 * - popup.js is the ONLY place content.js is injected (on demand)
 * - Guard flag window.HTML_PICKER_ACTIVE prevents double-init inside content.js
 */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const mainBtn      = document.getElementById('mainBtn');
const statusBadge  = document.getElementById('statusBadge');
const statusText   = document.getElementById('statusText');
const hintText     = document.getElementById('hintText');
const toast        = document.getElementById('toast');
const toastMsg     = document.getElementById('toastMsg');
const lastCopied   = document.getElementById('lastCopied');
const codePreview  = document.getElementById('codePreview');
const copyAgainBtn = document.getElementById('copyAgainBtn');
const tabs         = document.querySelectorAll('.tab');

// ── State ─────────────────────────────────────────────────────────────────────
let isPicking  = false;
let toastTimer = null;
let activeTab  = 'html';
let lastOutput = { html: '', css: '', tw: '' };

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toast.className = `toast ${type}`;
  toastMsg.textContent = message;
  void toast.offsetWidth;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── UI sync ───────────────────────────────────────────────────────────────────
function syncUI() {
  if (isPicking) {
    mainBtn.className      = 'btn btn-stop';
    mainBtn.innerHTML      = `<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg> Stop Picking`;
    statusBadge.className  = 'status-badge active';
    statusText.textContent = 'Active';
    hintText.innerHTML     = 'Hover over any element to <strong>highlight</strong> it, then click to view &amp; copy <strong>HTML + CSS + Tailwind</strong>. Press <strong>Esc</strong> to cancel.';
  } else {
    mainBtn.className      = 'btn btn-start';
    mainBtn.innerHTML      = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg> Start Picking`;
    statusBadge.className  = 'status-badge idle';
    statusText.textContent = 'Idle';
    hintText.innerHTML     = 'Click <strong>Start Picking</strong> then hover over any element. Click to view &amp; copy its <strong>HTML + CSS + Tailwind</strong>.';
  }
}

// ── Output parser ─────────────────────────────────────────────────────────────
function parseOutput(raw) {
  const sections = { html: '', css: '', tw: '' };
  try {
    const htmlMatch = raw.match(/\/\* ── HTML ── \*\/\n([\s\S]*?)(?=\n\/\* ──)/);
    const cssMatch  = raw.match(/\/\* ── CSS ── \*\/\n([\s\S]*?)(?=\n\/\* ──)/);
    const twMatch   = raw.match(/\/\* ── Tailwind ── \*\/\n([\s\S]*)/);
    if (htmlMatch) sections.html = htmlMatch[1].trim();
    if (cssMatch)  sections.css  = cssMatch[1].trim();
    if (twMatch)   sections.tw   = twMatch[1].trim();
  } catch {
    sections.html = raw;
  }
  return sections;
}

// ── Preview panel ─────────────────────────────────────────────────────────────
function renderPreview(tab) {
  activeTab = tab;
  tabs.forEach(t => {
    t.className = 'tab';
    if (t.dataset.tab === tab) t.classList.add(`active-${tab}`);
  });
  codePreview.textContent = lastOutput[tab] || '(empty)';
  lastCopied.classList.add('visible');
}

tabs.forEach(tab => tab.addEventListener('click', () => renderPreview(tab.dataset.tab)));

// ── Copy Again ────────────────────────────────────────────────────────────────
copyAgainBtn.addEventListener('click', async () => {
  const text = lastOutput[activeTab];
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(`${activeTab.toUpperCase()} copied!`, 'success');
  } catch {
    showToast('Copy failed', 'error');
  }
});

// ── Messaging ─────────────────────────────────────────────────────────────────
/**
 * Inject content.js (if not already loaded) then send a message.
 * We use scripting.executeScript as the SOLE injection mechanism.
 * The IIFE guard in content.js (window.HTML_PICKER_ACTIVE) ensures
 * the code only initialises once even if executeScript runs again.
 */
async function sendToActiveTab(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');

  // Block restricted URLs that extensions can never access
  const url = tab.url || '';
  const restricted = [
    'chrome://', 'chrome-extension://', 'edge://', 'about:',
    'devtools://', 'view-source:', 'data:',
  ];
  if (restricted.some(p => url.startsWith(p)) || url === '') {
    throw new Error('RESTRICTED_PAGE');
  }

  // Inject content.js — the guard flag inside it makes this idempotent
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js'],
  });

  // Small pause to let the script initialise its message listener
  await new Promise(r => setTimeout(r, 80));

  return chrome.tabs.sendMessage(tab.id, message);
}

// ── Persist & restore state ───────────────────────────────────────────────────
chrome.storage.local.get(['isPicking', 'lastOutput'], (result) => {
  isPicking = !!result.isPicking;
  if (result.lastOutput) {
    lastOutput = result.lastOutput;
    renderPreview('html');
  }
  syncUI();
});

function persistState() {
  chrome.storage.local.set({ isPicking, lastOutput });
}

// ── Button handler ────────────────────────────────────────────────────────────
mainBtn.addEventListener('click', async () => {
  isPicking = !isPicking;
  persistState();
  syncUI();

  try {
    const response = await sendToActiveTab({
      action: isPicking ? 'startPicking' : 'stopPicking',
    });

    if (response?.status === 'stopped' && isPicking) {
      isPicking = false;
      persistState();
      syncUI();
      showToast('Picking cancelled', 'error');
    }
  } catch (err) {
    console.error('[HTML Picker] sendMessage failed:', err.message);
    isPicking = false;
    persistState();
    syncUI();
    if (err.message === 'RESTRICTED_PAGE') {
      showToast('Cannot run on browser internal pages', 'error');
    } else if (err.message?.includes('Cannot access')) {
      showToast('Reload the page and try again', 'error');
    } else {
      showToast('Connection failed — reload page & retry', 'error');
    }
  }
});

// ── Messages from content script ─────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  switch (message.action) {
    case 'elementCopied':
      isPicking = false;
      if (message.output) lastOutput = parseOutput(message.output);
      persistState();
      syncUI();
      renderPreview('html');
      showToast('HTML + CSS + Tailwind copied!', 'success');
      break;
    case 'copyFailed':
      isPicking = false;
      persistState();
      syncUI();
      showToast('Copy failed — try again', 'error');
      break;
    case 'pickingCancelled':
      isPicking = false;
      persistState();
      syncUI();
      showToast('Picking cancelled', 'error');
      break;
    case 'modalClosed':
      isPicking = false;
      persistState();
      syncUI();
      break;
    default:
      break;
  }
});
