# HTML Element Picker Extension

A powerful Chrome extension that allows you to pick any HTML element on a webpage and instantly get its HTML structure, CSS styles, and Tailwind CSS classes copied to your clipboard.

## Features

- **Element Picking**: Click "Start Picking" and hover over any element on a webpage
- **Multi-format Output**: Get HTML, CSS, and Tailwind CSS code for any element
- **Smart CSS Extraction**: Automatically extracts computed styles with intelligent filtering
- **Tailwind Conversion**: Converts CSS properties to Tailwind CSS classes
- **Syntax Highlighting**: Clean, formatted output with syntax highlighting
- **One-click Copy**: Copy individual sections or all output at once
- **Visual Overlay**: Real-time highlighting with element information display

## How It Works

### Architecture Overview

The extension consists of three main components:

1. **Popup Interface** (`popup.html` + `popup.js`)
2. **Content Script** (`content.js`)
3. **Extension Manifest** (`manifest.json`)

### Component Breakdown

#### 1. Popup Interface (`popup.html` + `popup.js`)

**Purpose**: User interface for controlling the extension

**Key Features**:
- Clean, modern UI with status indicators
- Start/Stop picking controls
- Last copied content preview
- Tabbed view for HTML/CSS/Tailwind output
- Copy functionality for individual sections

**How it works**:
- Manages the extension's state (picking/not picking)
- Injects the content script into the active tab when needed
- Handles communication between popup and content script
- Displays and manages copied content

#### 2. Content Script (`content.js`)

**Purpose**: The core functionality that runs on web pages

**Key Features**:
- Element detection and highlighting
- CSS style extraction and analysis
- HTML structure cleaning and formatting
- Tailwind CSS class generation
- Modal display for output

**How it works**:

1. **Element Detection**: When picking mode is active, the script:
   - Changes cursor to crosshair
   - Listens for mouse events to detect hovered elements
   - Creates a visual overlay showing the selected element
   - Displays element information (tag, ID, classes)

2. **Style Extraction**: When an element is clicked:
   - Uses `getComputedStyle()` to extract all CSS properties
   - Filters out default/baseline values to reduce noise
   - Handles color normalization (RGB to HEX conversion)
   - Removes layout noise (sub-pixel values)

3. **HTML Processing**:
   - Clones the element and its subtree
   - Removes unwanted attributes (data-, svelte-, etc.)
   - Assigns generated class names for CSS targeting
   - Formats HTML with proper indentation

4. **Tailwind Conversion**:
   - Maps CSS properties to Tailwind classes
   - Handles spacing, colors, typography, layout
   - Converts pixel values to Tailwind scale
   - Generates semantic class names

5. **Output Generation**:
   - Creates three output formats: HTML, CSS, and Tailwind
   - Displays results in an overlay modal
   - Provides copy functionality for each section

#### 3. Extension Manifest (`manifest.json`)

**Purpose**: Configuration file for the Chrome extension

**Key Permissions**:
- `activeTab`: Access to the currently active tab
- `scripting`: Inject content scripts dynamically
- `clipboardWrite`: Write to clipboard
- `storage`: Store extension state
- `<all_urls>`: Access to all web pages

### Data Flow

1. **User Interaction**:
   - User clicks extension icon → Popup opens
   - User clicks "Start Picking" → Popup injects content script
   - Content script activates picking mode

2. **Element Selection**:
   - User hovers over element → Visual overlay appears
   - User clicks element → Content script extracts data
   - Content script generates HTML, CSS, and Tailwind output

3. **Output Display**:
   - Content script opens modal with results
   - User can copy individual sections or all output
   - Results are sent back to popup for preview

4. **State Management**:
   - Popup stores last copied content
   - Extension state persists across sessions
   - Visual indicators show current mode

## Technical Details

### CSS Property Handling

The extension handles CSS properties in several categories:

- **Layout**: display, position, flexbox, grid
- **Box Model**: width, height, padding, margin, borders
- **Typography**: font, color, text properties
- **Effects**: shadows, transforms, opacity
- **Colors**: Automatic RGB to HEX conversion

### Tailwind Conversion Logic

The Tailwind converter maps CSS properties to appropriate classes:

```javascript
// Example conversions:
'font-size': '16px' → 'text-base'
'color': '#00e5a0' → 'text-[#00e5a0]' or 'text-emerald-400'
'padding': '16px' → 'p-4'
'display': 'flex' → 'flex'
```

### Smart Filtering

The extension filters out noise by:
- Removing default browser styles
- Ignoring inherited text properties
- Dropping sub-pixel layout values
- Excluding framework-specific attributes

### Security Considerations

- Content script injection is controlled and minimal
- No external network requests
- Clipboard access is user-initiated
- No persistent data collection

## Installation

1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. The extension icon will appear in your toolbar

## Usage

1. Click the extension icon to open the popup
2. Click "Start Picking" to activate picking mode
3. Hover over any element on the webpage (cursor becomes crosshair)
4. Click the element you want to inspect
5. A modal will appear with HTML, CSS, and Tailwind output
6. Use the tabs to switch between formats
7. Click copy buttons to copy individual sections or "Copy All"

## Browser Compatibility

- Chrome (recommended)
- Edge (Chromium-based)
- Firefox (may require minor adjustments)

## License

This extension is provided as-is for educational and development purposes.

## Contributing

Feel free to submit issues and enhancement requests!

## Support

If you encounter issues:
1. Ensure the extension is loaded in developer mode
2. Check that the webpage isn't a restricted page (chrome://, etc.)
3. Try reloading the webpage and extension
4. Check browser console for any error messages