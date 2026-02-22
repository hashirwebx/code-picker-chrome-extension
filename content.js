/**
 * content.js — HTML Element Picker  v4.1
 *
 * IIFE-wrapped. Uses window.HTML_PICKER_ACTIVE as a single-init guard.
 * ALL local variables are function-scoped — no duplicate declarations.
 */

(function () {
  'use strict';

  // ── Single-init guard ────────────────────────────────────────────────────────
  // popup.js injects this via scripting.executeScript on every button click.
  // The guard ensures the code body only runs ONCE per page.
  if (window.HTML_PICKER_ACTIVE) {
    console.log('[HTML Picker] Already loaded — skipping re-init');
    return;
  }
  window.HTML_PICKER_ACTIVE = true;
  console.log('HTML Picker Loaded Once');

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  let isPicking   = false;
  let hoveredEl   = null;
  let overlayEl   = null;
  let labelEl     = null;
  let styleTag    = null;
  let modalRoot   = null;
  let modalShadow = null;

  // ── Safe chrome.runtime wrapper ────────────────────────────────────────────
  // chrome.runtime is undefined on restricted pages. Every sendMessage call
  // goes through here so the script never crashes.
  function safeMsg(msg) {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(msg);
      }
    } catch (_) { /* context invalidated or restricted page — ignore */ }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROP LISTS  (all declared once at module level)
  // ═══════════════════════════════════════════════════════════════════════════

  const LAYOUT_PROPS = [
    'display','position','top','right','bottom','left','z-index',
    'float','clear','overflow','overflow-x','overflow-y','visibility','box-sizing',
  ];
  const BOX_PROPS = [
    'width','height','min-width','max-width','min-height','max-height',
    'padding','padding-top','padding-right','padding-bottom','padding-left',
    'margin','margin-top','margin-right','margin-bottom','margin-left',
  ];
  const FLEX_PROPS = [
    'flex','flex-direction','flex-wrap','flex-flow',
    'justify-content','align-items','align-content','align-self',
    'flex-grow','flex-shrink','flex-basis','gap','row-gap','column-gap','order',
  ];
  const GRID_PROPS = [
    'grid-template-columns','grid-template-rows','grid-template-areas',
    'grid-column','grid-row','grid-area','justify-items','place-items','place-content',
  ];
  const TEXT_PROPS = [
    'font-family','font-size','font-weight','font-style','font-variant',
    'line-height','letter-spacing','word-spacing','text-align',
    'text-decoration','text-transform','text-overflow','white-space','color',
  ];
  const BG_PROPS = [
    'background-color','background-image','background-size',
    'background-position','background-repeat',
  ];
  const BORDER_PROPS = [
    'border','border-top','border-right','border-bottom','border-left',
    'border-width','border-style','border-color','border-radius','outline',
  ];
  const EFFECT_PROPS = [
    'box-shadow','text-shadow','opacity','transform','transition',
    'cursor','pointer-events','list-style','table-layout',
    'border-collapse','border-spacing','vertical-align',
  ];
  const ALL_PROPS = [
    ...LAYOUT_PROPS, ...BOX_PROPS, ...FLEX_PROPS, ...GRID_PROPS,
    ...TEXT_PROPS, ...BG_PROPS, ...BORDER_PROPS, ...EFFECT_PROPS,
  ];

  const ALWAYS_SKIP = new Set([
    'none','0px','auto','initial','inherit','unset','revert',
    'rgba(0, 0, 0, 0)','transparent','currentcolor','normal',
  ]);

  const TAG_DEFAULTS = {
    div:   { display:'block' },
    span:  { display:'inline' },
    p:     { display:'block','margin-top':'16px','margin-bottom':'16px' },
    ul:    { display:'block','list-style':'disc','padding-left':'40px' },
    ol:    { display:'block','list-style':'decimal','padding-left':'40px' },
    li:    { display:'list-item' },
    a:     { color:'rgb(0, 0, 238)','text-decoration':'underline',cursor:'pointer' },
    button:{ display:'inline-block',cursor:'pointer' },
    input: { display:'inline-block' },
    h1:    { display:'block','font-size':'32px','font-weight':'700','margin-top':'21.44px','margin-bottom':'21.44px' },
    h2:    { display:'block','font-size':'24px','font-weight':'700' },
    h3:    { display:'block','font-size':'18.72px','font-weight':'700' },
    h4:    { display:'block','font-size':'16px','font-weight':'700' },
    img:   { display:'inline-block' },
    table: { display:'table','border-collapse':'separate' },
    thead: { display:'table-header-group' },
    tbody: { display:'table-row-group' },
    tr:    { display:'table-row' },
    td:    { display:'table-cell','vertical-align':'inherit' },
    th:    { display:'table-cell','font-weight':'700' },
  };

  const VOID_ELS   = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const INLINE_ELS = new Set(['a','abbr','b','bdi','bdo','cite','code','dfn','em','i','kbd','mark','q','s','samp','small','span','strong','sub','sup','time','u','var','wbr']);

  const DIRTY_ATTR = [
    /^data-/, /^svelte-/, /^_svelte/, /^ng-/, /^v-/, /^x-/,
    /^fdprocessedid$/, /^jsaction$/, /^jsmodel$/, /^jscontroller$/, /^jsrenderer$/, /^jsshadow$/,
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOUR UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════

  function rgbToHex(rgb) {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return '#' + [m[1],m[2],m[3]].map(n => parseInt(n).toString(16).padStart(2,'0')).join('');
  }

  function hexToTwColor(hex) {
    const MAP = {
      '#000000':'black','#ffffff':'white','#f9fafb':'gray-50','#f3f4f6':'gray-100',
      '#e5e7eb':'gray-200','#d1d5db':'gray-300','#9ca3af':'gray-400','#6b7280':'gray-500',
      '#4b5563':'gray-600','#374151':'gray-700','#1f2937':'gray-800','#111827':'gray-900',
      '#fef2f2':'red-50','#fca5a5':'red-300','#ef4444':'red-500','#dc2626':'red-600','#991b1b':'red-800',
      '#fff7ed':'orange-50','#fdba74':'orange-300','#f97316':'orange-500','#ea580c':'orange-600',
      '#fefce8':'yellow-50','#fde047':'yellow-300','#eab308':'yellow-500','#ca8a04':'yellow-600',
      '#f0fdf4':'green-50','#86efac':'green-300','#22c55e':'green-500','#16a34a':'green-600','#14532d':'green-900',
      '#ecfdf5':'emerald-50','#6ee7b7':'emerald-300','#10b981':'emerald-500','#059669':'emerald-600',
      '#f0fdfa':'teal-50','#5eead4':'teal-300','#14b8a6':'teal-500','#0d9488':'teal-600','#025a4e':'teal-900',
      '#eff6ff':'blue-50','#93c5fd':'blue-300','#3b82f6':'blue-500','#2563eb':'blue-600','#1e3a8a':'blue-900',
      '#eef2ff':'indigo-50','#a5b4fc':'indigo-300','#6366f1':'indigo-500','#4f46e5':'indigo-600',
      '#faf5ff':'purple-50','#d8b4fe':'purple-300','#a855f7':'purple-500','#9333ea':'purple-600',
      '#fdf4ff':'fuchsia-50','#f0abfc':'fuchsia-300','#d946ef':'fuchsia-500',
      '#fdf2f8':'pink-50','#f9a8d4':'pink-300','#ec4899':'pink-500','#db2777':'pink-600',
    };
    return MAP[hex.toLowerCase()] || null;
  }

  function colorToTw(prefix, value) {
    if (value.startsWith('#')) {
      const name = hexToTwColor(value);
      return name ? `${prefix}-${name}` : `${prefix}-[${value}]`;
    }
    if (value.startsWith('rgb')) {
      const hex = rgbToHex(value);
      if (hex) {
        const name = hexToTwColor(hex);
        return name ? `${prefix}-${name}` : `${prefix}-[${hex}]`;
      }
    }
    return `${prefix}-[${value.replace(/\s+/g,'_')}]`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  function extractStyles(el, parentStyles, isRoot) {
    const computed = window.getComputedStyle(el);
    const tagDefs  = TAG_DEFAULTS[el.tagName.toLowerCase()] || {};
    const result   = {};

    for (const prop of ALL_PROPS) {
      let value = computed.getPropertyValue(prop).trim();
      if (!value || ALWAYS_SKIP.has(value.toLowerCase())) continue;
      if (tagDefs[prop] && tagDefs[prop] === value) continue;
      if (!isRoot && parentStyles && TEXT_PROPS.includes(prop)) {
        if (parentStyles[prop] === value) continue;
      }
      // Normalise rgb colours → hex
      if (['color','background-color','border-color','outline-color'].includes(prop) && value.startsWith('rgb')) {
        value = rgbToHex(value) || value;
      }
      // Drop sub-pixel layout noise
      if ((prop === 'width' || prop === 'height') && /\.\d{3,}px$/.test(value)) continue;
      result[prop] = value;
    }

    if (!result['display']) {
      const d = computed.getPropertyValue('display').trim();
      if (d && d !== 'inline' && d !== 'block') result['display'] = d;
    }
    return result;
  }

  function extractSubtreeStyles(rootEl) {
    const entries = [];
    let counter   = 0;

    function walk(el, parentStyles, isRoot) {
      if (el.nodeType !== Node.ELEMENT_NODE) return;
      if (el.id && el.id.startsWith('__html-picker')) return;
      const className = isRoot ? 'copied-el' : `copied-el-c${++counter}`;
      const styles    = extractStyles(el, parentStyles, isRoot);
      entries.push({ liveEl: el, className, styles });
      for (const child of el.children) walk(child, styles, false);
    }

    walk(rootEl, null, true);
    return entries;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML CLEANING
  // ═══════════════════════════════════════════════════════════════════════════

  function shouldStripAttr(name) {
    return DIRTY_ATTR.some(p => p.test(name));
  }

  function buildCleanHTML(rootEl, classMap) {
    const clone = rootEl.cloneNode(true);

    function walk(liveEl, cloneEl) {
      if (liveEl.nodeType !== Node.ELEMENT_NODE) return;
      const toRemove = [];
      for (const attr of cloneEl.attributes) {
        if (shouldStripAttr(attr.name)) toRemove.push(attr.name);
      }
      toRemove.forEach(a => cloneEl.removeAttribute(a));
      const genClass = classMap.get(liveEl);
      if (genClass) cloneEl.setAttribute('class', genClass);
      else cloneEl.removeAttribute('class');
      cloneEl.removeAttribute('style');
      const liveKids  = [...liveEl.children];
      const cloneKids = [...cloneEl.children];
      for (let i = 0; i < liveKids.length; i++) {
        if (cloneKids[i]) walk(liveKids[i], cloneKids[i]);
      }
    }

    walk(rootEl, clone);
    return clone;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CSS SERIALISER
  // ═══════════════════════════════════════════════════════════════════════════

  function stylesToCSSRule(className, styles) {
    if (!Object.keys(styles).length) return '';
    const lines = Object.entries(styles).map(([p,v]) => `  ${p}: ${v};`).join('\n');
    return `.${className} {\n${lines}\n}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAILWIND CONVERTER
  // NOTE: every local variable has a UNIQUE name — no duplicates anywhere.
  // ═══════════════════════════════════════════════════════════════════════════

  function pxToTw(px) {
    const num = parseFloat(px);
    if (isNaN(num)) return null;
    if (num === 0) return '0';
    const unit = num / 4;
    const HALVES = { 0.5:'.5', 1.5:'1.5', 2.5:'2.5', 3.5:'3.5' };
    if (HALVES[unit]) return HALVES[unit];
    if (Number.isInteger(unit) && unit >= 1 && unit <= 96) return String(unit);
    if (num === 1) return 'px';
    if (num === 2) return '0.5';
    return `[${num % 1 === 0 ? num + 'px' : parseFloat(num.toFixed(4)) + 'px'}]`;
  }

  function stylesToTailwind(styles) {
    const classes = [];
    const add = (cls) => { if (cls) classes.push(cls); };

    // ── Display ───────────────────────────────────────────────────────────
    const DISPLAY_MAP = {
      flex:'flex','inline-flex':'inline-flex',grid:'grid','inline-grid':'inline-grid',
      block:'block','inline-block':'inline-block',inline:'inline',none:'hidden',
      table:'table','table-row':'table-row','table-cell':'table-cell',
      'list-item':'list-item','flow-root':'flow-root',contents:'contents',
    };
    const twDisplay = styles['display'];
    if (twDisplay) add(DISPLAY_MAP[twDisplay] || `[display:${twDisplay}]`);

    // ── Position ──────────────────────────────────────────────────────────
    const twPos = styles['position'];
    if (twPos && twPos !== 'static') {
      const POS_MAP = { relative:'relative',absolute:'absolute',fixed:'fixed',sticky:'sticky' };
      add(POS_MAP[twPos]);
    }

    // ── Overflow ──────────────────────────────────────────────────────────
    const OV_MAP = { hidden:'overflow-hidden',scroll:'overflow-scroll',auto:'overflow-auto',visible:'overflow-visible' };
    add(OV_MAP[styles['overflow']]);

    // ── Flexbox ───────────────────────────────────────────────────────────
    const FD_MAP = { row:'flex-row',column:'flex-col','row-reverse':'flex-row-reverse','column-reverse':'flex-col-reverse' };
    add(FD_MAP[styles['flex-direction']]);

    const FW_MAP = { wrap:'flex-wrap',nowrap:'flex-nowrap','wrap-reverse':'flex-wrap-reverse' };
    add(FW_MAP[styles['flex-wrap']]);

    const JC_MAP = {
      'flex-start':'justify-start','flex-end':'justify-end',center:'justify-center',
      'space-between':'justify-between','space-around':'justify-around','space-evenly':'justify-evenly',
    };
    add(JC_MAP[styles['justify-content']]);

    const AI_MAP = {
      'flex-start':'items-start','flex-end':'items-end',center:'items-center',
      stretch:'items-stretch',baseline:'items-baseline',
    };
    add(AI_MAP[styles['align-items']]);

    const AS_MAP = { auto:'self-auto',start:'self-start',end:'self-end',center:'self-center',stretch:'self-stretch',baseline:'self-baseline' };
    add(AS_MAP[styles['align-self']]);

    // flex-grow  (renamed: twFlexGrow)
    const twFlexGrow = parseFloat(styles['flex-grow']);
    if (!isNaN(twFlexGrow) && twFlexGrow !== 0) add(twFlexGrow === 1 ? 'grow' : `grow-[${twFlexGrow}]`);

    // flex-shrink  (renamed: twFlexShrink — was the duplicate 'fs')
    const twFlexShrink = parseFloat(styles['flex-shrink']);
    if (!isNaN(twFlexShrink) && twFlexShrink !== 1) add(twFlexShrink === 0 ? 'shrink-0' : `shrink-[${twFlexShrink}]`);

    const twOrder = styles['order'];
    if (twOrder && twOrder !== '0') add(`order-[${twOrder}]`);

    // ── Gap ───────────────────────────────────────────────────────────────
    const twGap = styles['gap'];
    if (twGap && twGap !== '0px') {
      const gapParts = twGap.split(/\s+/);
      if (gapParts.length === 1 || gapParts[0] === gapParts[1]) {
        const gv = pxToTw(gapParts[0]);
        if (gv) add(`gap-${gv}`);
      } else {
        const gy = pxToTw(gapParts[0]), gx = pxToTw(gapParts[1]);
        if (gy) add(`gap-y-${gy}`);
        if (gx) add(`gap-x-${gx}`);
      }
    }

    // ── Spacing ───────────────────────────────────────────────────────────
    function addSpacing(pfx, shorthand, sideKeys) {
      if (!styles[shorthand]) return;
      const sideT = pxToTw(styles[sideKeys[0]]);
      const sideR = pxToTw(styles[sideKeys[1]]);
      const sideB = pxToTw(styles[sideKeys[2]]);
      const sideL = pxToTw(styles[sideKeys[3]]);
      if (!sideT && !sideR && !sideB && !sideL) return;
      if (sideT === sideR && sideR === sideB && sideB === sideL && sideT) { add(`${pfx}-${sideT}`); return; }
      if (sideT === sideB && sideR === sideL) {
        if (sideT) add(`${pfx}y-${sideT}`);
        if (sideR) add(`${pfx}x-${sideR}`);
        return;
      }
      if (sideT === sideB && sideT) add(`${pfx}y-${sideT}`);
      else { if (sideT) add(`${pfx}t-${sideT}`); if (sideB) add(`${pfx}b-${sideB}`); }
      if (sideR === sideL && sideR) add(`${pfx}x-${sideR}`);
      else { if (sideR) add(`${pfx}r-${sideR}`); if (sideL) add(`${pfx}l-${sideL}`); }
    }
    addSpacing('p','padding',['padding-top','padding-right','padding-bottom','padding-left']);
    addSpacing('m','margin', ['margin-top','margin-right','margin-bottom','margin-left']);

    // ── Sizing ────────────────────────────────────────────────────────────
    function addSize(pfx, prop) {
      const val = styles[prop];
      if (!val || val === 'auto') return;
      if (/\.\d{2,}px$/.test(val)) return; // layout noise
      const NAMED = {
        '100%':`${pfx}-full`,'100vw':`${pfx}-screen`,'100vh':`${pfx}-screen`,
        '50%':`${pfx}-1/2`,'33.3333%':`${pfx}-1/3`,'66.6667%':`${pfx}-2/3`,
        '25%':`${pfx}-1/4`,'75%':`${pfx}-3/4`,
        'max-content':`${pfx}-max`,'min-content':`${pfx}-min`,'fit-content':`${pfx}-fit`,
      };
      if (NAMED[val]) { add(NAMED[val]); return; }
      const tw = pxToTw(val);
      if (tw) add(`${pfx}-${tw}`);
    }
    addSize('w','width'); addSize('h','height');
    addSize('min-w','min-width'); addSize('max-w','max-width');
    addSize('min-h','min-height'); addSize('max-h','max-height');

    // ── Border radius ─────────────────────────────────────────────────────
    const twBr = styles['border-radius'];
    if (twBr) {
      const BR_MAP = {
        '0px':'rounded-none','2px':'rounded-sm','4px':'rounded','6px':'rounded-md',
        '8px':'rounded-lg','12px':'rounded-xl','16px':'rounded-2xl','24px':'rounded-3xl',
        '9999px':'rounded-full','50%':'rounded-full',
      };
      const brNum = parseFloat(twBr);
      if (!isNaN(brNum) && brNum >= 50 && twBr.endsWith('px')) add('rounded-full');
      else add(BR_MAP[twBr] || `rounded-[${twBr}]`);
    }

    // ── Colours ───────────────────────────────────────────────────────────
    const twBg = styles['background-color'];
    if (twBg) add(colorToTw('bg', twBg));

    const twColor = styles['color'];
    if (twColor) add(colorToTw('text', twColor));

    // ── Typography  (renamed: twFontSize, twFontWeight — no more 'fs'/'fw') ──
    const FS_MAP = {
      '10px':'text-[10px]','11px':'text-[11px]','12px':'text-xs','13px':'text-[13px]',
      '14px':'text-sm','15px':'text-[15px]','16px':'text-base','18px':'text-lg',
      '20px':'text-xl','24px':'text-2xl','30px':'text-3xl','36px':'text-4xl',
      '48px':'text-5xl','60px':'text-6xl','72px':'text-7xl','96px':'text-8xl',
    };
    const twFontSize = styles['font-size'];     // ← was 'fs' (duplicate)
    if (twFontSize) add(FS_MAP[twFontSize] || `text-[${twFontSize}]`);

    const FW_WEIGHT_MAP = {
      '100':'font-thin','200':'font-extralight','300':'font-light','400':'font-normal',
      '500':'font-medium','600':'font-semibold','700':'font-bold',
      '800':'font-extrabold','900':'font-black',
    };
    const twFontWeight = styles['font-weight'];  // ← was 'fw' (potential duplicate)
    if (twFontWeight) add(FW_WEIGHT_MAP[twFontWeight] || `font-[${twFontWeight}]`);

    const LH_MAP = {
      '1':'leading-none','1.25':'leading-tight','1.375':'leading-snug',
      '1.5':'leading-normal','1.625':'leading-relaxed','2':'leading-loose',
    };
    const twLineHeight = styles['line-height'];
    if (twLineHeight) {
      const lhNum = parseFloat(twLineHeight);
      add(LH_MAP[String(parseFloat(lhNum.toFixed(3)))] || `leading-[${twLineHeight}]`);
    }

    const TA_MAP = { left:'text-left',center:'text-center',right:'text-right',justify:'text-justify',start:'text-start',end:'text-end' };
    add(TA_MAP[styles['text-align']]);

    const TT_MAP = { uppercase:'uppercase',lowercase:'lowercase',capitalize:'capitalize',none:'normal-case' };
    add(TT_MAP[styles['text-transform']]);

    const twTD = styles['text-decoration'];
    if (twTD && twTD !== 'none') {
      if (twTD.includes('underline')) add('underline');
      else if (twTD.includes('line-through')) add('line-through');
    }

    const twLS = styles['letter-spacing'];
    if (twLS && twLS !== '0px') {
      const LS_MAP = { '-0.05em':'tracking-tighter','-0.025em':'tracking-tight','0em':'tracking-normal','0.025em':'tracking-wide','0.05em':'tracking-wider','0.1em':'tracking-widest' };
      add(LS_MAP[twLS] || `tracking-[${twLS}]`);
    }

    // ── Border ────────────────────────────────────────────────────────────
    const twBorder = styles['border'];
    if (twBorder && twBorder !== 'none') {
      const bm = twBorder.match(/^(\d+(?:\.\d+)?px)\s+(solid|dashed|dotted|double)\s+(.+)$/);
      if (bm) {
        const BW_MAP = { '1px':'border','2px':'border-2','4px':'border-4','8px':'border-8' };
        add(BW_MAP[bm[1]] || `border-[${bm[1]}]`);
        if (bm[2] !== 'solid') add(`border-${bm[2]}`);
        add(colorToTw('border', bm[3].trim()));
      } else {
        add('border');
      }
    }

    // ── Effects ───────────────────────────────────────────────────────────
    const twOp = styles['opacity'];
    if (twOp && twOp !== '1') {
      const pct = Math.round(parseFloat(twOp) * 100);
      const OP_MAP = {0:'opacity-0',5:'opacity-5',10:'opacity-10',20:'opacity-20',25:'opacity-25',30:'opacity-30',40:'opacity-40',50:'opacity-50',60:'opacity-60',70:'opacity-70',75:'opacity-75',80:'opacity-80',90:'opacity-90',95:'opacity-95',100:'opacity-100'};
      add(OP_MAP[pct] || `opacity-[${twOp}]`);
    }

    const twShadow = styles['box-shadow'];
    if (twShadow && twShadow !== 'none') {
      if      (twShadow.includes('rgba(0, 0, 0, 0.05)')) add('shadow-sm');
      else if (twShadow.includes('rgba(0, 0, 0, 0.1)'))  add('shadow');
      else if (twShadow.includes('rgba(0, 0, 0, 0.15)')) add('shadow-md');
      else if (twShadow.includes('rgba(0, 0, 0, 0.25)')) add('shadow-lg');
      else if (twShadow.includes('rgba(0, 0, 0, 0.3)'))  add('shadow-xl');
      else add(`shadow-[${twShadow.replace(/\s+/g,'_')}]`);
    }

    const twCursor = styles['cursor'];
    if (twCursor && twCursor !== 'auto') {
      const CUR_MAP = { pointer:'cursor-pointer','not-allowed':'cursor-not-allowed',default:'cursor-default',move:'cursor-move',text:'cursor-text',wait:'cursor-wait',crosshair:'cursor-crosshair',grab:'cursor-grab',grabbing:'cursor-grabbing' };
      add(CUR_MAP[twCursor] || `cursor-[${twCursor}]`);
    }

    const twZi = styles['z-index'];
    if (twZi && twZi !== 'auto' && twZi !== '0') {
      const ZI_MAP = {'10':'z-10','20':'z-20','30':'z-30','40':'z-40','50':'z-50'};
      add(ZI_MAP[twZi] || `z-[${twZi}]`);
    }

    const twTransform = styles['transform'];
    if (twTransform && twTransform !== 'none') add(`[transform:${twTransform.replace(/\s+/g,'_')}]`);

    return [...new Set(classes)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT BUILDER
  // ═══════════════════════════════════════════════════════════════════════════

  function buildOutput(rootEl) {
    const entries  = extractSubtreeStyles(rootEl);
    const classMap = new Map(entries.map(e => [e.liveEl, e.className]));

    const cloneRoot = buildCleanHTML(rootEl, classMap);
    const htmlCode  = prettyHTML(cloneRoot.outerHTML);

    const cssCode = entries
      .map(({ className, styles }) => stylesToCSSRule(className, styles))
      .filter(Boolean)
      .join('\n\n');

    const twEntries = entries.map(({ className, styles }) => ({
      className, twClasses: stylesToTailwind(styles),
    }));
    const twClone = cloneRoot.cloneNode(true);
    applyTailwindClasses(twClone, twEntries);
    const twCode       = prettyHTML(twClone.outerHTML);
    const rootTwClasses = twEntries[0]?.twClasses || [];

    return { htmlCode, cssCode, twCode, twClasses: rootTwClasses };
  }

  function applyTailwindClasses(rootClone, twEntries) {
    const byClass = new Map(twEntries.map(e => [e.className, e.twClasses]));
    function walk(el) {
      if (el.nodeType !== Node.ELEMENT_NODE) return;
      const cls = el.getAttribute('class');
      if (cls && byClass.has(cls)) el.setAttribute('class', byClass.get(cls).join(' '));
      for (const child of el.children) walk(child);
    }
    walk(rootClone);
  }

  function buildRawOutput({ htmlCode, cssCode, twCode, twClasses }) {
    return [
      '/* ── HTML ── */', htmlCode, '',
      '/* ── CSS ── */',  cssCode,  '',
      '/* ── Tailwind ── */',
      `<!-- Tailwind classes: ${twClasses.join(' ')} -->`,
      twCode,
    ].join('\n');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HTML PRETTY-PRINTER
  // ═══════════════════════════════════════════════════════════════════════════

  function prettyHTML(html) {
    try {
      const doc  = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
      const root = doc.body.firstElementChild;
      if (!root) return html;
      return serializeEl(root, 0);
    } catch { return html; }
  }

  function serializeEl(el, depth) {
    const pad   = '  '.repeat(depth);
    const tag   = el.tagName.toLowerCase();
    const attrs = serializeAttrs(el);
    if (VOID_ELS.has(tag)) return `${pad}<${tag}${attrs}>`;
    const kids  = [...el.childNodes];
    if (!kids.length) return `${pad}<${tag}${attrs}></${tag}>`;
    const textOnly = kids.every(c => c.nodeType === Node.TEXT_NODE);
    if (textOnly) {
      const txt = kids.map(c => c.textContent).join('').trim();
      if (!txt) return `${pad}<${tag}${attrs}></${tag}>`;
      if (txt.length < 80 || INLINE_ELS.has(tag)) return `${pad}<${tag}${attrs}>${escTxt(txt)}</${tag}>`;
    }
    const parts = [];
    for (const child of kids) {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent.trim();
        if (t) parts.push(`${'  '.repeat(depth+1)}${escTxt(t)}`);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        parts.push(serializeEl(child, depth+1));
      }
    }
    if (!parts.length) return `${pad}<${tag}${attrs}></${tag}>`;
    return `${pad}<${tag}${attrs}>\n${parts.join('\n')}\n${pad}</${tag}>`;
  }

  function serializeAttrs(el) {
    const parts = [];
    for (const attr of el.attributes) {
      parts.push(attr.value === '' ? attr.name : `${attr.name}="${escAttr(attr.value)}"`);
    }
    return parts.length ? ' ' + parts.join(' ') : '';
  }

  function escTxt(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escAttr(v) { return v.replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNTAX HIGHLIGHTER
  // ═══════════════════════════════════════════════════════════════════════════

  function highlight(code, lang) {
    const esc = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    if (lang === 'html') {
      return esc
        .replace(/(&lt;\/?)([\w-]+)/g, '$1<span style="color:#ff7b72">$2</span>')
        .replace(/([\w-]+)=(&quot;)/g, '<span style="color:#79c0ff">$1</span>=$2')
        .replace(/(&quot;)(.*?)(&quot;)/g, '<span style="color:#a8ff78">$1$2$3</span>')
        .replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#6e7681;font-style:italic">$1</span>');
    }
    if (lang === 'css') {
      return esc
        .replace(/^(\.[^\s{]+)/m, '<span style="color:#d2a8ff">$1</span>')
        .replace(/(  )([\w-]+)(\s*:)/g, '$1<span style="color:#79c0ff">$2</span>$3')
        .replace(/(:[ ]*)([^;{}\n<]+)(;)/g, '$1<span style="color:#a8ff78">$2</span>$3');
    }
    return esc;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODAL  (Shadow DOM — page styles cannot leak in)
  // ═══════════════════════════════════════════════════════════════════════════

  function createModal(output) {
    destroyModal();
    const { htmlCode, cssCode, twCode, twClasses } = output;

    modalRoot = document.createElement('div');
    modalRoot.id = '__html-picker-modal-root__';
    Object.assign(modalRoot.style, { position:'fixed', inset:'0', zIndex:'2147483647', pointerEvents:'none' });
    document.documentElement.appendChild(modalRoot);
    modalShadow = modalRoot.attachShadow({ mode:'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      :host { all: initial; }
      .backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); pointer-events:all; animation:fadeIn .18s ease; }
      .panel {
        position:fixed; top:50%; right:20px; transform:translateY(-50%);
        width:560px; max-width:calc(100vw - 40px); max-height:calc(100vh - 40px);
        background:#0d0d0f; border:1px solid #2a2a2e; border-radius:14px;
        box-shadow:0 0 0 1px rgba(255,255,255,.04),0 28px 72px rgba(0,0,0,.75);
        display:flex; flex-direction:column; pointer-events:all; overflow:hidden;
        animation:slideIn .22s cubic-bezier(0.34,1.56,0.64,1);
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes slideIn { from{opacity:0;transform:translateY(calc(-50% + 18px))} to{opacity:1;transform:translateY(-50%)} }
      .header { display:flex; align-items:center; padding:13px 16px; border-bottom:1px solid #1e1e22; gap:10px; flex-shrink:0; }
      .logo { width:28px; height:28px; border-radius:7px; background:rgba(0,229,160,.12); border:1px solid #00e5a0; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .logo svg { width:14px; height:14px; fill:#00e5a0; }
      .title { flex:1; }
      .title h2 { font-size:13px; font-weight:700; color:#f0f0f2; letter-spacing:.02em; }
      .title p  { font-size:10px; color:#555560; font-family:"JetBrains Mono",monospace; margin-top:1px; }
      .close-btn { width:28px; height:28px; border-radius:7px; border:1px solid #2a2a2e; background:#1a1a1e; color:#6b6b75; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; }
      .close-btn:hover { background:#2a1a1e; border-color:#ff4d6d; color:#ff4d6d; }
      .close-btn svg { width:12px; height:12px; fill:currentColor; }
      .stats-bar { display:flex; gap:8px; padding:7px 16px; border-bottom:1px solid #1a1a1e; flex-shrink:0; flex-wrap:wrap; }
      .stat { font-family:"JetBrains Mono",monospace; font-size:10px; color:#555560; display:flex; align-items:center; gap:4px; }
      .stat strong { color:#a0ffd6; }
      .tabs { display:flex; padding:10px 16px 0; gap:3px; flex-shrink:0; }
      .tab-btn { padding:5px 12px; border-radius:6px 6px 0 0; border:1px solid transparent; border-bottom:none; background:transparent; color:#555560; font-family:"JetBrains Mono",monospace; font-size:11px; font-weight:600; letter-spacing:.06em; cursor:pointer; transition:all .15s; text-transform:uppercase; }
      .tab-btn:hover { color:#aaaaaf; }
      .tab-btn.active-html { color:#00e5a0; background:#0f1f18; border-color:#1a3028; }
      .tab-btn.active-css  { color:#a78bfa; background:#130f1f; border-color:#221a30; }
      .tab-btn.active-tw   { color:#60a5fa; background:#0f1520; border-color:#1a2430; }
      .code-wrap { flex:1; overflow:hidden; display:flex; flex-direction:column; border-top:1px solid #1e1e22; min-height:0; }
      .code-scroll { overflow-y:auto; flex:1; padding:14px 16px; }
      .code-scroll::-webkit-scrollbar { width:4px; }
      .code-scroll::-webkit-scrollbar-thumb { background:#2a2a2e; border-radius:2px; }
      pre { margin:0; font-family:"JetBrains Mono","Fira Mono","Courier New",monospace; font-size:11.5px; line-height:1.7; color:#c9d1d9; white-space:pre-wrap; word-break:break-all; }
      .tw-pills { display:flex; flex-wrap:wrap; gap:5px; padding:10px 16px 0; }
      .tw-pill { padding:2px 8px; background:rgba(96,165,250,.1); border:1px solid rgba(96,165,250,.25); border-radius:20px; font-family:"JetBrains Mono",monospace; font-size:10px; color:#60a5fa; font-weight:600; }
      .action-bar { display:flex; gap:5px; padding:11px 16px; border-top:1px solid #1e1e22; background:#0a0a0c; flex-shrink:0; flex-wrap:wrap; }
      .copy-btn { flex:1; min-width:90px; height:34px; border-radius:8px; border:1px solid #2a2a2e; background:#141417; color:#aaaaaf; font-family:"JetBrains Mono",monospace; font-size:10px; font-weight:700; letter-spacing:.06em; cursor:pointer; transition:all .15s; display:flex; align-items:center; justify-content:center; gap:5px; text-transform:uppercase; }
      .copy-btn svg { width:11px; height:11px; fill:currentColor; flex-shrink:0; }
      .copy-btn:hover { transform:translateY(-1px); }
      .copy-btn.html:hover { color:#00e5a0; border-color:#00e5a0; background:rgba(0,229,160,.08); }
      .copy-btn.css:hover  { color:#a78bfa; border-color:#a78bfa; background:rgba(167,139,250,.08); }
      .copy-btn.tw:hover   { color:#60a5fa; border-color:#60a5fa; background:rgba(96,165,250,.08); }
      .copy-btn.all        { border-color:#00e5a0; color:#00e5a0; background:rgba(0,229,160,.1); }
      .copy-btn.all:hover  { background:rgba(0,229,160,.18); }
      .copy-btn.success    { color:#00e5a0 !important; border-color:#00e5a0 !important; }
      .toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%) translateY(20px); background:#141417; border:1px solid #2a2a2e; border-radius:8px; padding:8px 16px; font-family:"JetBrains Mono",monospace; font-size:11px; font-weight:600; color:#f0f0f2; display:flex; align-items:center; gap:8px; box-shadow:0 8px 32px rgba(0,0,0,.6); opacity:0; pointer-events:none; transition:all .22s cubic-bezier(0.34,1.56,0.64,1); z-index:10; white-space:nowrap; }
      .toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
      .toast.success { border-color:#00e5a0; }
      .toast .dot { width:6px; height:6px; border-radius:50%; background:#00e5a0; flex-shrink:0; }
    `;

    // DOM
    const backdrop = mkEl('div', 'backdrop');
    const panel    = mkEl('div', 'panel');
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true');

    const header = mkEl('div','header');
    header.innerHTML = `<div class="logo"><svg viewBox="0 0 24 24"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg></div><div class="title"><h2>Element Inspector</h2><p>html · css · tailwind</p></div>`;
    const closeBtn = mkEl('button','close-btn');
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
    header.appendChild(closeBtn);

    // Stats
    const entries   = extractSubtreeStyles(hoveredEl || document.body);
    const statsBar  = mkEl('div','stats-bar');
    statsBar.innerHTML = `
      <span class="stat">Elements: <strong>${entries.length}</strong></span>
      <span class="stat">CSS rules: <strong>${entries.filter(e => Object.keys(e.styles).length).length}</strong></span>
      <span class="stat">TW classes: <strong>${twClasses.length}</strong></span>`;

    // Tabs
    const tabsEl  = mkEl('div','tabs');
    const tabBtns = {};
    for (const { id, label } of [{id:'html',label:'HTML'},{id:'css',label:'CSS'},{id:'tw',label:'Tailwind'}]) {
      const btn = mkEl('button','tab-btn');
      btn.textContent = label; btn.dataset.tab = id;
      tabsEl.appendChild(btn); tabBtns[id] = btn;
    }

    // TW pills
    const twPills = mkEl('div','tw-pills');
    twPills.style.display = 'none';
    twClasses.forEach(cls => { const p = mkEl('span','tw-pill'); p.textContent = cls; twPills.appendChild(p); });

    // Code area
    const codeWrap   = mkEl('div','code-wrap');
    const codeScroll = mkEl('div','code-scroll');
    const pre        = document.createElement('pre');
    codeScroll.appendChild(pre); codeWrap.appendChild(codeScroll);

    // Action bar
    const actionBar = mkEl('div','action-bar');
    const COPY_ICON = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    const cpHtml = mkBtn('copy-btn html', `${COPY_ICON} HTML`);
    const cpCss  = mkBtn('copy-btn css',  `${COPY_ICON} CSS`);
    const cpTw   = mkBtn('copy-btn tw',   `${COPY_ICON} Tailwind`);
    const cpAll  = mkBtn('copy-btn all',  `${COPY_ICON} Copy All`);
    actionBar.append(cpHtml, cpCss, cpTw, cpAll);

    // Toast
    const toastEl = mkEl('div','toast');
    toastEl.innerHTML = `<span class="dot"></span><span class="msg"></span>`;
    const toastMsgEl = toastEl.querySelector('.msg');

    // Assemble
    panel.append(header, statsBar, tabsEl, twPills, codeWrap, actionBar);
    modalShadow.append(styleEl, backdrop, panel, toastEl);

    // ── Tab switching ──────────────────────────────────────────────────────
    const CONTENT = { html: htmlCode, css: cssCode, tw: twCode };
    let currentTab = 'html';

    function switchTab(id) {
      currentTab = id;
      Object.entries(tabBtns).forEach(([k,btn]) => { btn.className = `tab-btn${k === id ? ` active-${k}` : ''}`; });
      pre.innerHTML = highlight(CONTENT[id], id === 'tw' ? 'html' : id);
      twPills.style.display = id === 'tw' ? 'flex' : 'none';
    }
    switchTab('html');
    Object.values(tabBtns).forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    // ── Copy ──────────────────────────────────────────────────────────────
    let toastTimer2 = null;

    function showModalToast(msg) {
      toastMsgEl.textContent = msg;
      toastEl.classList.add('success','show');
      clearTimeout(toastTimer2);
      toastTimer2 = setTimeout(() => toastEl.classList.remove('show'), 2200);
    }

    async function copyToClipboard(text, btn, label) {
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = document.createElement('textarea');
        Object.assign(ta.style, { position:'fixed', top:'-9999px', opacity:'0' });
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      const orig = btn.innerHTML;
      btn.classList.add('success');
      btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> ${label}`;
      setTimeout(() => { btn.classList.remove('success'); btn.innerHTML = orig; }, 1400);
      showModalToast(`${label} copied!`);
      safeMsg({ action:'elementCopied', output: buildRawOutput(output) });
    }

    cpHtml.addEventListener('click', () => copyToClipboard(htmlCode, cpHtml, 'HTML'));
    cpCss.addEventListener('click',  () => copyToClipboard(cssCode,  cpCss,  'CSS'));
    cpTw.addEventListener('click',   () => copyToClipboard(twCode,   cpTw,   'Tailwind'));
    cpAll.addEventListener('click',  () => copyToClipboard(buildRawOutput(output), cpAll, 'All'));

    // ── Close ──────────────────────────────────────────────────────────────
    function closeModal() { destroyModal(); safeMsg({ action:'modalClosed' }); }
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    panel.addEventListener('click', e => e.stopPropagation());

    function modalKeyDown(e) { if (e.key === 'Escape') { e.stopPropagation(); closeModal(); } }
    document.addEventListener('keydown', modalKeyDown, { capture: true });
    modalRoot._keyHandler = modalKeyDown;
  }

  function mkEl(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function mkBtn(cls, html) { const b = mkEl('button', cls); b.innerHTML = html; return b; }

  function destroyModal() {
    if (!modalRoot) return;
    if (modalRoot._keyHandler) document.removeEventListener('keydown', modalRoot._keyHandler, { capture:true });
    modalRoot.remove();
    modalRoot = null; modalShadow = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOVER OVERLAY
  // ═══════════════════════════════════════════════════════════════════════════

  function createOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.id = '__html-picker-overlay__';
    Object.assign(overlayEl.style, {
      position:'fixed', pointerEvents:'none', zIndex:'2147483645',
      border:'2px solid #00e5a0', borderRadius:'3px',
      background:'rgba(0,229,160,0.08)',
      boxShadow:'0 0 0 1px rgba(0,0,0,.15),inset 0 0 0 1px rgba(0,229,160,.2)',
      transition:'top 60ms ease,left 60ms ease,width 60ms ease,height 60ms ease',
      boxSizing:'border-box', display:'none',
    });
    labelEl = document.createElement('div');
    Object.assign(labelEl.style, {
      position:'absolute', bottom:'calc(100% + 6px)', left:'0',
      background:'#00e5a0', color:'#050f0a', fontSize:'11px',
      fontFamily:'"JetBrains Mono","Fira Mono",monospace', fontWeight:'600',
      padding:'2px 7px', borderRadius:'4px', whiteSpace:'nowrap',
      pointerEvents:'none', lineHeight:'1.6', letterSpacing:'.03em',
      maxWidth:'320px', overflow:'hidden', textOverflow:'ellipsis',
      boxShadow:'0 2px 8px rgba(0,0,0,.35)',
    });
    overlayEl.appendChild(labelEl);
    document.documentElement.appendChild(overlayEl);
  }

  function removeOverlay() { overlayEl?.remove(); overlayEl = null; labelEl = null; }

  function injectCursorStyle() {
    styleTag = document.createElement('style');
    styleTag.id = '__html-picker-cursor__';
    styleTag.textContent = '* { cursor: crosshair !important; }';
    document.head.appendChild(styleTag);
  }
  function removeCursorStyle() { styleTag?.remove(); styleTag = null; }

  function moveOverlayTo(el) {
    if (!overlayEl || !el) return;
    const rect = el.getBoundingClientRect();
    const tag  = el.tagName.toLowerCase();
    const idStr = el.id ? `#${el.id}` : '';
    const clsStr = el.classList.length ? `.${[...el.classList].slice(0,2).join('.')}` : '';
    labelEl.textContent = `${tag}${idStr}${clsStr}`;
    Object.assign(overlayEl.style, {
      display:'block',
      top:`${Math.max(rect.top,0)}px`, left:`${Math.max(rect.left,0)}px`,
      width:`${Math.min(rect.width,  window.innerWidth  - Math.max(rect.left,0))}px`,
      height:`${Math.min(rect.height, window.innerHeight - Math.max(rect.top,0))}px`,
    });
    if (rect.top < 30) { labelEl.style.bottom='auto'; labelEl.style.top='calc(100% + 6px)'; }
    else               { labelEl.style.top='auto'; labelEl.style.bottom='calc(100% + 6px)'; }
  }

  function hideOverlay() { if (overlayEl) overlayEl.style.display = 'none'; }

  // ═══════════════════════════════════════════════════════════════════════════
  // PICKING EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  function onMouseOver(e) {
    const el = e.target;
    if (!el || el === overlayEl || el === document.documentElement) return;
    if (modalRoot && (el === modalRoot || modalRoot.contains(el))) return;
    hoveredEl = el;
    moveOverlayTo(el);
  }

  function onMouseOut(e) {
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      hideOverlay(); hoveredEl = null;
    }
  }

  function onClick(e) {
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    if (!hoveredEl) return;
    const output = buildOutput(hoveredEl);
    stopPicking();
    createModal(output);
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { stopPicking(); safeMsg({ action:'pickingCancelled' }); }
  }

  function onScroll() { if (hoveredEl) moveOverlayTo(hoveredEl); }

  // ═══════════════════════════════════════════════════════════════════════════
  // START / STOP
  // ═══════════════════════════════════════════════════════════════════════════

  function startPicking() {
    if (isPicking) return;
    isPicking = true;
    destroyModal();
    createOverlay();
    injectCursorStyle();
    document.addEventListener('mouseover', onMouseOver, { capture:true });
    document.addEventListener('mouseout',  onMouseOut,  { capture:true });
    document.addEventListener('click',     onClick,     { capture:true });
    document.addEventListener('keydown',   onKeyDown,   { capture:true });
    document.addEventListener('scroll',    onScroll,    { capture:true, passive:true });
  }

  function stopPicking() {
    if (!isPicking) return;
    isPicking = false; hoveredEl = null;
    removeOverlay(); removeCursorStyle();
    document.removeEventListener('mouseover', onMouseOver, { capture:true });
    document.removeEventListener('mouseout',  onMouseOut,  { capture:true });
    document.removeEventListener('click',     onClick,     { capture:true });
    document.removeEventListener('keydown',   onKeyDown,   { capture:true });
    document.removeEventListener('scroll',    onScroll,    { capture:true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE LISTENER
  // ═══════════════════════════════════════════════════════════════════════════

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message.action) {
        case 'startPicking':  startPicking();  sendResponse({ status:'started' }); break;
        case 'stopPicking':   stopPicking(); destroyModal(); sendResponse({ status:'stopped' }); break;
        default:              sendResponse({ status:'unknown' });
      }
    });
  }

})(); // end IIFE
