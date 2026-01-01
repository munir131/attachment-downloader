# Gmail Bulk Attachment Downloader

**Note:** This application requires Node.js version 22 or higher, or Bun.js version 1.0.0 or higher.

Currently Gmail does not provide a way to download attachments from multiple emails in a single click. This utility allows you to do just that.

## Setup

1. Enable the GMAIL API and get `credentials.json` from [Google Developers Console](https://developers.google.com/gmail/api/quickstart/nodejs).
2. Save `credentials.json` in the root folder of the project.
3. Clone the project:
   ```bash
   git clone https://github.com/munir131/attachment-downloader
   ```
4. Install dependencies:
   
   **Using npm (Node.js):**
   ```bash
   npm install
   ```
   
   **Using bun:**
   ```bash
   bun install
   ```

## Usage

### Interactive Mode

Simply run the program without arguments to start the interactive wizard:

**Using Node.js:**
```bash
node index.js
```

**Using bun:**
```bash
bun index.js
```

It will ask you:
1. Where to store files (default: `./files`)
2. How to filter emails (by Label, From address, or All)

### Automated / CLI Mode

You can run the program in non-interactive mode by providing arguments. This is useful for scripts or cron jobs.

**Using Node.js:**
```bash
node index.js [options]
```

**Using bun:**
```bash
bun index.js [options]
```

**Options:**

| Option | Description | Example |
|--------|-------------|---------|
| `--from` | Download attachments from emails sent by a specific address | `--from "example@gmail.com"` |
| `--label`| Download attachments from emails with a specific label | `--label "Invoices"` |
| `--dir`  | Directory to save attachments (default: `./files`) | `--dir "./downloads"` |
| `--fy`   | Organize downloaded files into folder structure by Financial Year | `--fy` |

**Examples:**

Download all attachments from a specific sender:
```bash
# Using Node.js
node index.js --from "boss@company.com" --dir "./work_docs"

# Using bun
bun index.js --from "boss@company.com" --dir "./work_docs"
```

Download files from a specific label organized by financial year:
```bash
# Using Node.js
node index.js --label "Receipts" --fy

# Using bun
bun index.js --label "Receipts" --fy
```

## Development

### Testing

**Using Node.js:**
```bash
npm test
```

**Using bun:**
```bash
bun test
```

### Development Mode

**Using Node.js:**
```bash
npm run dev
```

**Using bun:**
```bash
npm run dev:bun
```

## Binary Downloads

For convenience, pre-compiled binaries are available in the [GitHub Releases](https://github.com/munir131/attachment-downloader/releases) page. These binaries include all dependencies and don't require Node.js or Bun.js to be installed.

### Available Binaries:
- `attachment-downloader-linux-x64` - Linux x64
- `attachment-downloader-macos-x64` - macOS x64  
- `attachment-downloader-windows-x64.exe` - Windows x64

### Using Binaries:

1. Download the appropriate binary for your platform from the releases page
2. Make the binary executable (Linux/macOS only):
   ```bash
   chmod +x attachment-downloader-linux-x64
   ```
3. Run the binary:
   ```bash
   # Linux/macOS
   ./attachment-downloader-linux-x64 --help
   
   # Windows
   .\attachment-downloader-windows-x64.exe --help
   ```

All command-line options work identically to the Node.js/Bun.js versions.

### Building Binaries Locally:

You can also build binaries locally using Bun.js:

```bash
# Install Bun.js if not already installed
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Build binary for current platform
bun run build:binary

# Build for all platforms (requires cross-compilation setup)
bun run build:binary:all
```

## Bun.js Support

This project fully supports Bun.js as an alternative to Node.js. Bun.js offers:

- **Faster installation times** with its built-in package manager
- **Improved performance** due to its JavaScriptCore engine
- **Native TypeScript support** (though this project uses JavaScript)
- **Smaller bundle sizes** and faster startup times
- **Binary compilation** for creating standalone executables

All features work identically whether using Node.js, Bun.js, or the pre-compiled binaries.

## Contributors

Thanks to all the people who already contributed!

<a href="https://github.com/munir131/attachment-downloader/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=munir131/attachment-downloader" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
