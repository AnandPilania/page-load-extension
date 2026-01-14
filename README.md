# ⚡ Performance Tracker - Browser Extension
# 🚧 In Development

A comprehensive, enterprise-grade browser extension that tracks and analyzes web page performance with developer-focused insights. Perfect for development teams, QA engineers, and performance optimization.

![Performance Tracker](https://img.shields.io/badge/version-1.0.0-blue)
![Browser Support](https://img.shields.io/badge/browser-Chrome%20%7C%20Firefox%20%7C%20Edge-brightgreen)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 **Smart Access Control**
- **Allowlist Mode** - Enable only on specific domains (default: `*.niitmtscrm.com`, `*.niitls.com`, `*.test`)
- **Blocklist Mode** - Disable on specific websites with wildcard support
- **All Sites Mode** - Enable everywhere for public testing
- **Enterprise-Ready** - Secure by default, perfect for internal development

### 🚀 **Automatic Performance Tracking**
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
- **Website Access Control** - Allowlist/blocklist with wildcard support
- **Custom Appearance** - Change button position, colors, and overlay side
- **Performance Thresholds** - Set your own good/warning/bad values
- **Keyboard Shortcuts** - Customize shortcut keys
- **History Limit** - Control storage (10-1000 page loads)
- **Console Logging** - Optional detailed logging to DevTools

### � **Developer & QA Focused Metrics**
- **Backend vs Frontend Timing** - Separate server and client-side performance
- **Performance Bottlenecks** - Automatic detection with severity levels
- **DOM Complexity Analysis** - Node count, resource breakdown
- **Cache Effectiveness** - Hit rate calculation and optimization insights
- **Security Compliance** - HTTPS checking and mixed content detection
- **Resource Issues** - Slow resources and failed requests tracking
- **Environment Info** - Network quality, device capabilities, user agent

### � **Comprehensive Metrics**

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

#### Developer-Specific Metrics
- **Backend Time** - Server response and processing time
- **Frontend Time** - Client-side rendering and processing
- **DOM Nodes** - Total number of DOM elements
- **Resource Counts** - Images, scripts, stylesheets, iframes
- **Cache Hit Rate** - Percentage of resources served from cache
- **Slow Resources** - Count of resources taking >1 second
- **Failed Resources** - Count of HTTP 4xx/5xx responses

#### Performance Bottlenecks Detection
- **DNS Issues** - Slow domain lookups (>100ms)
- **Connection Problems** - Slow TCP/SSL handshakes (>200ms)
- **Server Response Delays** - Slow backend responses (>500ms)
- **Slow Resources** - Top 3 slowest loading resources with names
- **Severity Classification** - High/medium priority with visual indicators

#### Page Size Analysis
- **Total Transferred** - Actual bytes over network (with headers)
- **Encoded Size** - Compressed size (gzip/brotli)
- **Decoded Size** - Uncompressed size
- **Compression Ratio** - Percentage saved by compression
- **Document Size** - Just the HTML document

#### Navigation & Protocol Info
- **Navigation Type** - navigate, reload, back_forward, prerender
- **HTTP Version** - HTTP/1.1, HTTP/2, HTTP/3 detection
- **Protocol** - h2, h3, or legacy protocols
- **Redirect Count** - Number of redirects
- **Redirect Time** - Time spent in redirects
- **Cache Lookup Time** - Time checking browser cache

#### Environment & Security
- **Network Quality** - Connection type, bandwidth, RTT, data saver mode
- **Security Status** - HTTPS/HTTP with mixed content detection
- **Device Info** - Viewport size, pixel ratio, user agent
- **Memory Usage** - JavaScript heap analysis (Chrome only)

#### Resource Analysis
- **Resource Count** - Total resources loaded
- **Resource Breakdown** - By type (scripts, stylesheets, images, etc.)
- **Transfer Size** - Total bandwidth used per resource type
- **Performance Issues** - Automatic bottleneck identification

### 🚀 **Three Ways to Access**
1. **Click Floating ⚡ Button** - Automatically appears after page load (can be disabled)
2. **Keyboard Shortcut** - `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac) - customizable
3. **Extension Icon** - Click toolbar icon for historical data and quick controls

### 📈 **Popup vs Overlay**
- **Webpage Overlay** - Detailed current page analysis for developers
- **Extension Popup** - Historical data, statistics, and quick settings
- **Complementary** - Each serves different purposes for complete workflow

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
   - Visit any webpage in your allowlist (if allowlist mode is enabled)
   - Wait for page to fully load
   - Floating ⚡ button appears in configured position
   - Click button to view detailed metrics

2. **Keyboard Shortcut**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Panel slides in from configured side

3. **Extension Popup**
   - Click extension icon in your browser toolbar
   - View performance history across all sites
   - Access quick settings and controls
   - See statistical overview and trends

### Configuring Settings

Click the extension icon → **Settings** button to access:

#### 🎯 Access Control
- **Extension Mode** - Choose between Allowlist/Blocklist/All Sites
- **Allowed Websites** - For allowlist mode (default: `*.niitmtscrm.com`, `*.niitls.com`, `*.test`)
- **Blocked Websites** - For blocklist mode with wildcard support

#### 🎯 General Settings
- **Enable Floating Button** - Show/hide ⚡ button
- **Auto-Track Performance** - Automatically capture metrics
- **Show Performance Score** - Display 0-100 score
- **Console Logging** - Log metrics to DevTools console

#### 🎨 Appearance
- **Button Position** - Bottom-right, bottom-left, top-right, top-left
- **Color Theme** - Custom gradient colors with 5 presets
- **Overlay Position** - Slide from right or left

#### ⚙️ Advanced
- **History Limit** - 10 to 1000 page loads
- **Performance Thresholds** - Customize good/warning/bad values
- **Keyboard Shortcut** - Change default Ctrl+Shift+P

### 🐛 For Development Teams

#### Performance Optimization Workflow
1. **Use Allowlist Mode** - Focus on your development domains
2. **Monitor Backend Time** - Identify server-side bottlenecks
3. **Check Frontend Time** - Optimize client-side rendering
4. **Track Cache Hit Rate** - Improve caching strategies
5. **Identify Slow Resources** - Optimize assets and APIs
6. **Use Bottleneck Detection** - Prioritize performance fixes

#### QA Testing Workflow
1. **Security Compliance** - Verify HTTPS and no mixed content
2. **Resource Validation** - Check for failed requests
3. **Performance Regression** - Compare scores across deployments
4. **Cross-Browser Testing** - Test with different network conditions
5. **DOM Complexity** - Monitor for performance regressions

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

**Developer Metrics**
- **Backend Time**: Server processing + network latency
- **Frontend Time**: DOM processing + rendering
- **Cache Hit Rate**: Higher is better (>80% is good)
- **Bottlenecks**: High severity needs immediate attention

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

### Version 1.0.0 (2025-01-14)
- ✨ Enterprise-grade performance tracking with developer-focused metrics
- 🎯 Smart access control with allowlist/blocklist/all-sites modes
- 🐛 Automatic bottleneck detection with severity classification
- 📊 Comprehensive resource and security analysis
- 🎨 Beautiful UI with floating button and sidebar overlay
- ⚙️ Extensive customization options
- 📈 Historical data tracking with popup interface
- 🌐 Network quality and environment monitoring
- � Security compliance checking (HTTPS, mixed content)
- � Memory usage analysis and cache effectiveness tracking
- � Default allowlist for development domains (`*.niitmtscrm.com`, `*.niitls.com`, `*.test`)

## 🐛 Known Issues

- Memory API is Chrome-only (gracefully degrades in other browsers)
- Network Information API limited browser support
- Some metrics may show as 0 on locally hosted files

## 🔮 Future Enhancements

### ✅ **All Features Implemented**

#### 📊 Export Data (CSV/JSON)
- **Comprehensive Export**: All performance metrics with metadata
- **Multiple Formats**: CSV for spreadsheet analysis, JSON with metadata
- **One-Click Download**: Automatic file generation and download
- **Data Integrity**: Includes timestamps, URLs, and all performance metrics

#### 📈 Performance Charts & Trends  
- **Historical Visualization**: Line charts showing performance trends
- **Multi-Metric Tracking**: Load Time, FCP, TTFB on same chart
- **Last 10 Pages**: Visual representation of recent performance
- **Color-Coded Metrics**: Different colors for each metric type
- **Responsive Canvas**: Adapts to available popup space
- **Interactive Tooltips**: Hover to see exact values

#### 🌙 Dark Mode Support
- **System-Wide Theme**: CSS variables for consistent theming
- **Toggle Control**: Easy switch in settings and popup
- **Smooth Transitions**: Animated theme changes
- **Accessibility**: Better contrast for low-light environments
- **Persistent State**: Remembers user preference across sessions

#### 🌊 Network Waterfall Visualization
- **Top Resources Display**: Shows 20 slowest loading resources
- **Color-Coded Types**: Different colors for JS, CSS, images, fonts
- **Interactive Tooltips**: Hover to see resource names and timing
- **Proportional Sizing**: Visual representation of load times
- **Resource Analysis**: File extension and duration display
- **Performance Insights**: Identifies bottlenecks at a glance

#### 📊 Performance Budgets & Alerts System
- **Configurable Budgets**: Load time, FCP, page size, resource count
- **Real-Time Alerts**: Visual notifications when budgets are exceeded
- **Severity Classification**: High/medium levels based on violation severity
- **Auto-Dismiss**: Alerts auto-remove after 8-10 seconds
- **Percentage Thresholds**: User-defined violation sensitivity (default 25%)

#### 📉 Performance Regression Detection
- **Baseline Calculation**: Uses historical data to establish performance baselines
- **Regression Analysis**: Detects when performance degrades beyond threshold
- **Smart Alerts**: Shows percentage increase and current vs baseline
- **Domain-Specific**: Tracks regression per website/domain
- **Configurable Thresholds**: User-defined regression sensitivity
- **Statistical Analysis**: Requires minimum 3 data points for accuracy

### 🏗️ Technical Implementation

**Error Handling**: Comprehensive null checks and graceful degradation
**Data Validation**: Proper variable scoping and parameter validation
**Performance**: Optimized DOM manipulation and efficient rendering
**Security**: All data stored locally, no external dependencies
**Compatibility**: Works across Chrome, Firefox, Edge, Safari

### 🎯 Enterprise-Ready Features

**Development Workflow**: Complete performance monitoring toolkit
**Quality Assurance**: Automated regression detection and budget enforcement
**Data Analysis**: Export capabilities for detailed investigation
**User Experience**: Intuitive interfaces with dark mode support
**Customization**: Extensive configuration options for all use cases

## 📋 Previous Status

All future enhancements have been successfully implemented and are now available in the extension. The system provides enterprise-grade performance monitoring with comprehensive alerting, visualization, and analysis capabilities.

## 📋 Previous Status

All future enhancements listed in the README have been successfully implemented and are now available in the extension. The system provides enterprise-grade performance monitoring with comprehensive alerting, visualization, and analysis capabilities.

## 📄 License

This project is licensed under MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern Web Performance APIs
- Inspired by Chrome DevTools and Lighthouse
- Uses Navigation Timing API Level 2 for accurate metrics
- Icons from browser developer guidelines
- Designed for development teams and QA engineers

## 💬 Support

Found a bug or have a feature request? Please:

- Open an issue on [GitHub Issues](https://github.com/anandpilania/page-load-extension/issues)
- Provide browser version and steps to reproduce
- Include screenshots if applicable
- For enterprise support, include deployment details

## 🌟 Star History

If you find this extension useful for your development workflow, please consider giving it a star on GitHub!

---

**Made with ⚡ and ❤️ for web performance enthusiasts and development teams**
