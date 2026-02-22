# HTML Element Picker

<div align="center">

A powerful Chrome extension that allows you to pick any HTML element on a webpage and instantly get its HTML structure, CSS styles, and Tailwind CSS classes copied to your clipboard.

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-orange)](https://chrome.google.com)

</div>

---

## Features

| Feature | Description |
|---------|-------------|
| **Element Picking** | Click "Start Picking" and hover over any element on a webpage |
| **Multi-format Output** | Get HTML, CSS, and Tailwind CSS code for any element |
| **Smart CSS Extraction** | Automatically extracts computed styles with intelligent filtering |
| **Tailwind Conversion** | Converts CSS properties to Tailwind CSS classes |
| **Syntax Highlighting** | Clean, formatted output with syntax highlighting |
| **One-click Copy** | Copy individual sections or all output at once |
| **Visual Overlay** | Real-time highlighting with element information display |

---

## Quick Start

### Installation

1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable **"Developer mode"**
4. Click **"Load unpacked"** and select the extension directory
5. The extension icon will appear in your toolbar

### Usage

```
1. Click the extension icon to open the popup
2. Click "Start Picking" to activate picking mode
3. Hover over any element on the webpage (cursor becomes crosshair)
4. Click the element you want to inspect
5. A modal will appear with HTML, CSS, and Tailwind output
6. Use the tabs to switch between formats
7. Click copy buttons to copy individual sections or "Copy All"
```

---

## Architecture

The extension consists of three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                     HTML Element Picker                       │
├─────────────────┬─────────────────────┬──────────────────────┤
│  popup.html     │    content.js       │   manifest.json     │
│  (UI Control)   │   (Core Logic)      │   (Configuration)   │
└─────────────────┴─────────────────────┴──────────────────────┘
```

### Component Breakdown

#### 1. Popup Interface (`popup.html` + `popup.js`)

**Purpose**: User interface for controlling the extension

| Feature | Description |
|---------|-------------|
| Clean, modern UI | Status indicators |
| Start/Stop picking | Controls |
| Last copied content | Preview |
| Tabbed view | HTML/CSS/Tailwind output |

#### 2. Content Script (`content.js`)

**Purpose**: The core functionality that runs on web pages

| Feature | Description |
|---------|-------------|
| Element detection | Highlighting |
| CSS style extraction | Analysis |
| HTML structure | Cleaning & formatting |
| Tailwind CSS class | Generation |
| Modal display | Output |

#### 3. Extension Manifest (`manifest.json`)

**Purpose**: Configuration file for the Chrome extension

**Required Permissions**:
- `activeTab` - Access to the currently active tab
- `scripting` - Inject content scripts dynamically
- `clipboardWrite` - Write to clipboard
- `storage` - Store extension state

---

## Technical Details

### CSS Property Handling

The extension handles CSS properties in several categories:

- **Layout**: `display`, `position`, `flexbox`, `grid`
- **Box Model**: `width`, `height`, `padding`, `margin`, `borders`
- **Typography**: `font`, `color`, `text` properties
- **Effects**: `shadows`, `transforms`, `opacity`
- **Colors**: Automatic RGB to HEX conversion

### Tailwind Conversion Logic

The Tailwind converter maps CSS properties to appropriate classes:

```javascript
// Example conversions:
'font-size': '16px'  →  'text-base'
'color': '#00e5a0'  →  'text-[#00e5a0]'
'padding': '16px'   →  'p-4'
'display': 'flex'   →  'flex'
```

### Smart Filtering

The extension filters out noise by:
- Removing default browser styles
- Ignoring inherited text properties
- Dropping sub-pixel layout values
- Excluding framework-specific attributes

### Data Flow

```
User Action          Content Script           Extension
    │                     │                      │
    ├─ Click Icon ───────►│                      │
    │                     │                      │
    ├─ Start Picking ────►│  Inject Script       │
    │                     │                      │
    ├─ Hover Element ────►│  Highlight & Track   │
    │                     │                      │
    ├─ Click Element ────►│  Extract Data        │
    │                     │                      │
    │◄────────────────────┤  Show Modal          │
    │                     │                      │
    ├─ Copy Output ──────►│  Write Clipboard     │
    │                     │                      │
    │◄────────────────────┤  Store in Popup      │
```

### Security Considerations

| Security Aspect | Implementation |
|-----------------|----------------|
| ✅ Minimal Injection | Controlled content script injection |
| ✅ No Network Calls | No external requests |
| ✅ User-initiated | Clipboard access is explicit |
| ✅ No Data Collection | No persistent data storage |

---

## 📋 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| <img src="https://www.google.com/chrome/static/images/favicon.svg" width="16"/> Chrome | ✅ Supported | Recommended |
| <img src="https://www.microsoft.com/favicon.ico" width="16"/> Edge | ✅ Supported | Chromium-based |
| <img src="https://www.mozilla.org/favicon.ico" width="16"/> Firefox | ⚠️ Partial | May require adjustments |

---

## 📝 License

This extension is provided as-is for educational and development purposes.

---

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

## ❓ Support

If you encounter issues:

1. Ensure the extension is loaded in developer mode
2. Check that the webpage isn't a restricted page (`chrome://`, etc.)
3. Try reloading the webpage and extension
4. Check browser console for any error messages
