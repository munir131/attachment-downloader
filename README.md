# Gmail Bulk Attachment Downloader

**Note:** This application requires Node.js version 22 or higher.

Currently Gmail does not provide a way to download attachments from multiple emails in a single click. This utility allows you to do just that.

## Setup

1. Enable the GMAIL API and get `credentials.json` from [Google Developers Console](https://developers.google.com/gmail/api/quickstart/nodejs).
2. Save `credentials.json` in the root folder of the project.
3. Clone the project:
   ```bash
   git clone https://github.com/munir131/attachment-downloader
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Interactive Mode

Simply run the program without arguments to start the interactive wizard:

```bash
node index.js
```

It will ask you:
1. Where to store files (default: `./files`)
2. How to filter emails (by Label, From address, or All)

### Automated / CLI Mode

You can run the program in non-interactive mode by providing arguments. This is useful for scripts or cron jobs.

```bash
node index.js [options]
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
node index.js --from "boss@company.com" --dir "./work_docs"
```

Download files from a specific label organized by financial year:
```bash
node index.js --label "Receipts" --fy
```

## Contributors

Thanks to all the people who already contributed!

<a href="https://github.com/munir131/attachment-downloader/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=munir131/attachment-downloader" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
