# ⚡ Performance Tracker - Browser Extension
# 🚧 In Development

A beautiful, cross-browser extension that tracks and analyzes web page load times and performance metrics in real-time. Get instant insights into your website's performance with an elegant, non-intrusive floating overlay.

![Performance Tracker](https://img.shields.io/badge/version-1.0.0-blue)
![Browser Support](https://img.shields.io/badge/browser-Chrome%20%7C%20Firefox%20%7C%20Edge-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 **Automatic Performance Tracking**
- Captures detailed metrics on every page load
- No manual intervention required
- Stores history of up to 1000 page visits (configurable)
- Matches Chrome DevTools Network timing exactly

### 🎨 **Beautiful UI/UX**
- **Floating Action Button (FAB)** - Appears automatically after page load
- **Sleek Sidebar Panel** - Full-height overlay with smooth animations
- **Visual Progress Bars** - See performance metrics at a glance
- **Color-Coded Values** - Green (good), Orange (needs improvement), Red (poor)
- **Performance Score** - 0-100 score based on key metrics (optional)

### ⚙️ **Highly Customizable**
- **Enable/Disable Features** - Toggle floating button, auto-tracking, performance score
- **Website Exclusions** - Disable extension on specific URLs with wildcard support
- **Custom Appearance** - Change button position, colors, and overlay side
- **Performance Thresholds** - Set your own good/warning/bad values
- **Keyboard Shortcuts** - Customize shortcut keys
- **History Limit** - Control storage (10-1000 page loads)
- **Console Logging** - Optional detailed logging to DevTools

### 📊 **Comprehensive Metrics**

#### Document Timing (Matches Chrome DevTools!)
- **Document Finish Time** - Exactly matches Chrome Network tab timing
- **Queued Time** - Time request spent in queue
- **Stalled Time** - Time spent stalled
- **DNS Lookup** - Domain name resolution time
- **Initial Connection** - TCP connection establishment
- **SSL/TLS Negotiation** - Secure handshake time (HTTPS)
- **Request Sent** - Time to send request
- **Waiting (TTFB)** - Server response time - matches Chrome exactly!
- **Content Download** - Download time - matches Chrome exactly!

#### Page Load Timeline
- **Full Page Load** - When ALL resources finished loading
- **Longest Resource** - Slowest resource load time
- **DOM Loaded Event** - When DOM was ready
- **DOM Processing** - Time to process DOM

#### Core Web Vitals
- **First Contentful Paint (FCP)** - When first content appears
- **Largest Contentful Paint (LCP)** - When main content is visible
- **DOM Interactive** - When page becomes interactive

#### Page Size Analysis
- **Total Transferred** - Actual bytes over network (with headers)
- **Encoded Size** - Compressed size (gzip/brotli)
- **Decoded Size** - Uncompressed size
- **Compression Ratio** - Percentage saved by compression
- **Document Size** - Just the HTML document

#### Navigation Info
- **Navigation Type** - navigate, reload, back_forward, prerender
- **Protocol** - HTTP/1.1, HTTP/2, HTTP/3, h2, h3
- **Redirect Count** - Number of redirects
- **Redirect Time** - Time spent in redirects
- **Cache Lookup Time** - Time checking browser cache

#### Connection Info (Network Information API)
- **Network Type** - 4G, 3G, 2G, slow-2g
- **Downlink Speed** - Connection speed in Mbps
- **Round Trip Time (RTT)** - Network latency
- **Data Saver Mode** - ON/OFF

#### Resource Analysis
- **Resource Count** - Total resources loaded
- **Resource Breakdown** - By type (scripts, stylesheets, images, etc.)
- **Transfer Size** - Total bandwidth used per resource type

#### Memory Usage (Chrome only)
- **JS Heap Size** - Used and total JavaScript heap memory
- **Memory Limit** - Maximum available heap size

### 🚀 **Three Ways to Access**
1. **Click the Floating ⚡ Button** - Automatically appears after page load (can be disabled)
2. **Keyboard Shortcut** - `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) - customizable
3. **Extension Icon** - Click the toolbar icon to view history

## 🔧 Installation

### Chrome / Edge / Brave / Opera

1. Download or clone this repository
2. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`
   - **Brave**: `brave://extensions/`
   - **Opera**: `opera://extensions/`
3. Enable **Developer Mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the extension folder

### Firefox

1. Download or clone this repository
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select the `manifest.json` file from the extension folder

**Note**: For Firefox, you may need to modify the manifest slightly for permanent installation. The temporary installation works perfectly for testing.

## 📦 Installation Assets

Before loading the extension, you'll need to add icon files. Create three PNG icons or use placeholder images:

```
icon16.png  (16x16 pixels)
icon48.png  (48x48 pixels)
icon128.png (128x128 pixels)
```

Alternatively, you can remove the icon references from `manifest.json` if you don't want custom icons.

## 🎮 Usage

### Viewing Performance Metrics

1. **Automatic Display**
   - Visit any webpage
   - Wait for page to fully load
   - Floating ⚡ button appears in bottom-right corner (if enabled)
   - Click the button to view metrics

2. **Keyboard Shortcut**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Panel slides in from the right (or left if configured)

3. **Extension Popup**
   - Click the extension icon in your browser toolbar
   - View performance history
   - See latest page metrics
   - Access settings
   - Refresh or clear history

### Configuring Settings

Click the extension icon → **Settings** button to access:

#### 🎯 General Settings
- **Enable Floating Button** - Show/hide the ⚡ button
- **Auto-Track Performance** - Automatically capture metrics
- **Show Performance Score** - Display 0-100 score
- **Console Logging** - Log metrics to DevTools console

#### 🚫 Website Exclusions
Disable the extension on specific sites:
```
https://internal-company-site.com
*.google.com
https://example.com/admin/*
```
Supports wildcards for flexible matching.

#### 🎨 Appearance
- **Button Position** - Bottom-right, bottom-left, top-right, top-left
- **Color Theme** - Custom gradient colors with 5 presets
- **Overlay Position** - Slide from right or left

#### ⚙️ Advanced
- **History Limit** - 10 to 1000 page loads
- **Performance Thresholds** - Customize good/warning/bad values
- **Keyboard Shortcut** - Change default Ctrl+Shift+P

### Interpreting Metrics

**Performance Score (0-100)**
- **90-100**: Excellent performance
- **70-89**: Good performance
- **50-69**: Needs improvement
- **0-49**: Poor performance

**Color Coding**
- 🟢 **Green**: Optimal performance
- 🟠 **Orange**: Acceptable but can be improved
- 🔴 **Red**: Poor performance, needs attention

**Benchmark Guidelines** (matches Chrome DevTools)
- Document Finish: < 1s (good), < 3s (acceptable), > 3s (poor)
- First Contentful Paint: < 1s (good), < 2.5s (acceptable), > 2.5s (poor)
- Waiting (TTFB): < 200ms (good), < 600ms (acceptable), > 600ms (poor)

## 🏗️ Project Structure

```
performance-tracker/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for data management
├── content.js            # Performance tracking & overlay UI
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── options.html          # Settings page
├── options.js            # Settings management
├── icon48.png            # Medium icon
├── icon96.png            # Large icon
└── README.md             # This file
└── LICENSE.md
```

## 🔍 Technical Details

### APIs Used
- **Navigation Timing API Level 2** - Modern performance metrics (no deprecated APIs)
- **Resource Timing API** - Resource load analysis
- **Paint Timing API** - FCP and FP metrics
- **Largest Contentful Paint API** - LCP tracking
- **Memory API** - JavaScript heap monitoring (Chrome)
- **Network Information API** - Connection details
- **Chrome Storage API** - Persistent data storage (sync + local)
- **Chrome Commands API** - Keyboard shortcuts

### Timing Accuracy
The extension uses **Navigation Timing API Level 2** which provides the exact same metrics as Chrome DevTools:
- Document Finish = `responseEnd - fetchStart` (matches Network tab)
- Waiting (TTFB) = `responseStart - requestStart` (matches exactly)
- Content Download = `responseEnd - responseStart` (matches exactly)

### Browser Compatibility
- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave (Chromium-based)
- ✅ Opera 74+
- ✅ Firefox 89+ (with minor adjustments)

### Data Storage
- Stores up to **1000 page loads** (configurable) in local storage
- Settings synced across devices via Chrome sync storage
- Persistent across browser sessions
- No external servers or data transmission
- Privacy-focused: all data stays local

## 🛠️ Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/anandpilania/page-load-extension.git
cd performance-tracker

# No build process required - it's vanilla JavaScript!
# Just load the extension in your browser
```

### Testing

1. Make changes to the source files
2. Go to `chrome://extensions/` (or equivalent)
3. Click the **Reload** button under the extension
4. Test on various websites

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Changelog

### Version 0.0.1 (2025-01-10)
- ✨ Initial release
- 📊 Performance tracking with Navigation Timing API Level 2 (no deprecated APIs)
- 🎯 Matches Chrome DevTools Network tab timing exactly
- 🎨 Beautiful floating button and sidebar UI
- ⚙️ Comprehensive settings page
- 🚫 Website exclusion support with wildcards
- 🎨 Customizable appearance (colors, positions)
- ⌨️ Customizable keyboard shortcuts
- 💾 Configurable history limit (10-1000)
- 📈 Performance scoring system
- 🎯 Resource breakdown by type
- 💻 Memory usage monitoring
- 🌐 Network connection info
- 📏 Page size analysis with compression stats

## 🐛 Known Issues

- Memory API is Chrome-only (gracefully degrades in other browsers)
- Network Information API limited browser support
- Some metrics may show as 0 on locally hosted files
- Floating button may overlap with page elements on some sites (position configurable)

## 🔮 Future Enhancements

- [ ] Export performance data to CSV/JSON
- [ ] Performance comparison charts
- [ ] Performance trends over time
- [ ] Dark mode support
- [ ] Network waterfall visualization
- [ ] Frame rate monitoring
- [ ] Screenshot capture on load
- [ ] Integration with Lighthouse API
- [ ] Performance budgets and alerts
- [ ] Multiple theme presets

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern Web Performance APIs
- Inspired by Chrome DevTools and Lighthouse
- Uses Navigation Timing API Level 2 for accurate metrics
- Icons from browser developer guidelines

## 💬 Support

Found a bug or have a feature request? Please:
- Open an issue on [GitHub Issues](https://github.com/anandpilania/page-load-extension/issues)
- Provide browser version and steps to reproduce
- Include screenshots if applicable

## 🌟 Star History

If you find this extension useful, please consider giving it a star on GitHub!

---

**Made with ⚡ and ❤️ for web performance enthusiasts**
