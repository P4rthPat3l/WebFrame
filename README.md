# 🖥️ Puppeteer Screenshot Tool

A powerful Node.js application for capturing and enhancing website screenshots with device frames using Puppeteer and Sharp. This tool allows you to take high-quality screenshots of websites and apply device frames (iPhone/Android) to create realistic device mockups.

## ✨ Features

- 📱 Capture website screenshots with customizable viewport settings
- 📸 Apply realistic device frames (iPhone/Android) to screenshots
- 🖼️ Process direct image URLs or full web pages
- ⚡ Fast and efficient screenshot processing with Puppeteer
- 🎨 High-quality image composition using Sharp
- 🌐 Web interface for easy interaction
- 🔄 Hot-reloading development server

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ / Bun (recommended)
- Chromium/Chrome browser
- npm, yarn, or bun package manager

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/puppeteer-screenshort.git
   cd puppeteer-screenshort
   ```

2. Install dependencies:

   ```bash
   # Using Bun (recommended)
   bun install

   # Or using npm
   npm install

   # Or using yarn
   yarn install
   ```

3. Start the development server:

   ```bash
   bun run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`

## 🛠️ Usage

### Web Interface

1. Open the web interface at `http://localhost:3000`
2. Enter a website URL or image URL
3. Select device type (iPhone/Android)
4. Click "Capture Screenshot"
5. View and download your enhanced screenshot

### API Endpoints

- `POST /api/screenshot` - Capture a screenshot

  - Body: `{ "url": "https://example.com", "device": "iphone" }`
  - Returns: Image file

- `POST /api/upload` - Upload and process an image
  - Form Data: `file` (image file)
  - Query Params: `device` (optional)
  - Returns: Processed image with frame

## 🏗️ Project Structure

```
.
├── src/                    # Source files
│   ├── index.ts           # Main application entry point
│   └── utils/             # Utility functions
│       ├── config.ts      # Configuration settings
│       ├── screenshot.ts  # Screenshot capture logic
│       ├── composition.ts # Image composition utilities
│       └── logger.ts      # Logging utilities
├── views/                 # EJS templates
│   └── index.ejs          # Main web interface
├── public/                # Static assets
├── screenshots/           # Output directory for screenshots
├── package.json           # Project dependencies
└── tsconfig.json          # TypeScript configuration
```

## ⚙️ Configuration

Edit `src/utils/config.ts` to customize:

- Viewport dimensions
- Device frames (iPhone/Android)
- Output directory
- Timeout settings
- User agent strings

## 🌟 Features in Detail

### Device Frames

The tool includes support for both iPhone and Android device frames. The frames are automatically applied to your screenshots, creating realistic device mockups.

### Responsive Screenshots

Easily capture screenshots at different viewport sizes by modifying the configuration. The default is set to an iPhone 14 Pro Max viewport.

### Direct Image Processing

You can process existing images by providing a direct URL to an image file. The tool will download the image and apply the selected device frame.

## 🚨 Troubleshooting

### Common Issues

1. **Browser not found**:

   - Ensure Chromium/Chrome is installed
   - Set the correct path in the Puppeteer launch options

2. **Screenshot timeouts**:

   - Increase the timeout in `config.ts` for slower websites
   - Check your internet connection

3. **Image processing errors**:
   - Ensure the output directory has write permissions
   - Check that the frame image files exist in the project root

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Puppeteer](https://pptr.dev/) - Headless Chrome Node.js API
- [Sharp](https://sharp.pixelplumbing.com/) - High-performance image processing
- [Fastify](https://www.fastify.io/) - Fast and low overhead web framework

---

Made with ❤️ by [Your Name]
