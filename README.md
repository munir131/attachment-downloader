# Gmail Bulk Attachment Downloader

Currently gmail is not providing to download attachments from different different mails with in single click. Using this program you can do it now.

You need `credentials.json` before start this utility. You can get it from https://developers.google.com/gmail/api/quickstart/nodejs by enable GMAIL API.
Save file `credentials.json` in the root folder of the project

Clone Project

`git clone https://github.com/munir131/attachment-downloader`

Install dependencies

`npm i`

Run program in interactive mode

`node index.js`

It will ask where to store files (default: `./files`) and filter criteria.

Run program in non-interactive mode

`node index.js --label LABEL_NAME`

### Custom Download Directory

You can specify the download directory using the `DIR` environment variable:

`DIR=/path/to/downloads node index.js`

### Automated Script (`auto.js`)

The `auto.js` script allows for automated execution with the following command-line arguments:

| Argument | Description |
|----------|-------------|
| `--from` | Download files only from emails sent by the specified email address. |
| `--ext`  | File extension to filter attachments (e.g. `pdf`). |
| `--fy`   | Organize downloaded files into a financial year based folder structure. |

**Example:**
```bash
node auto.js --from "example@gmail.com" --ext "pdf" --fy
```
