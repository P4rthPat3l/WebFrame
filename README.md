# Website Screenshot Tool

A Node.js tool built with Puppeteer to capture screenshots of multiple websites at a specified resolution (1320x2868 by default).

## Features

- Capture full-page screenshots of multiple websites in one go
- Automatically creates organized directories for each website
- Generates detailed logs of the screenshot process
- Handles errors gracefully and provides a summary report
- Supports both HTTP and HTTPS URLs
- Configurable viewport size and timeout settings

## Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 16+
- [Git](https://git-scm.com/)

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Puppeteer-screenshort
   ```

2. Install dependencies:
   ```bash
   bun install
   ```
   or with npm:
   ```bash
   npm install
   ```

## Usage

### Basic Usage

```bash
bun start https://example.com https://example.org https://example.net
```

### Output

- Screenshots are saved in the `screenshots/` directory
- Each website gets its own subdirectory based on the domain name
- A log file is created at `screenshots/screenshot-log.txt`

### Example

```bash
bun start https://google.com https://github.com https://example.com
```

This will create:

```
screenshots/
├── google.com/
│   └── screenshot-2023-01-01T12-00-00-000Z.png
├── github.com/
│   └── screenshot-2023-01-01T12-00-30-000Z.png
├── example.com/
│   └── screenshot-2023-01-01T12-01-00-000Z.png
└── screenshot-log.txt
```

## Configuration

You can modify the following settings in `index.ts`:

```typescript
const CONFIG = {
  viewport: {
    width: 1320, // Viewport width in pixels
    height: 2868, // Viewport height in pixels
    deviceScaleFactor: 1, // Device scale factor
  },
  outputDir: path.join(__dirname, 'screenshots'), // Output directory
  logFile: 'screenshot-log.txt', // Log file name
  timeout: 30000, // Navigation timeout in milliseconds
};
```

## Error Handling

- Failed screenshots are logged with error details
- The tool continues processing other URLs if one fails
- A summary is displayed at the end showing success/failure counts

## License

MIT
