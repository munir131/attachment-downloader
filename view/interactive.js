import { AttachmentDownloader } from '../core/attachmentDownloader.js';
import * as Prompts from './prompts.js';
import logger from '../internal/logger.js';
import ora from 'ora';

export async function startInteractive(auth, gmailClient) {
    try {
        const directory = await Prompts.askForDirectory();
        
        const options = await Prompts.askForFilter();
        let filter = {};

        if (options.includes('label')) {
            const labels = await gmailClient.listLabels();
            const selectedLabel = await Prompts.askForLabel(labels);
            filter.label = selectedLabel;
        }

        if (options.includes('from')) {
            const mailId = await Prompts.askForMail();
            filter.from = mailId;
        }

        if (options.includes('date')) {
            const before = await Prompts.askForDate('before');
            const after = await Prompts.askForDate('after');
            if (before) filter.before = before;
            if (after) filter.after = after;
        }

        if (Object.keys(filter).length === 0) {
            filter = { type: 'all' };
        }

        const spinner = ora('Starting...').start();

        const downloader = new AttachmentDownloader(gmailClient, {
            directory,
            onProgress: (progress) => {
                switch (progress.stage) {
                    case 'start':
                        spinner.text = 'Starting download...';
                        break;
                    case 'reading_page':
                        spinner.text = `Reading page ${progress.page}`;
                        break;
                    case 'fetched_messages':
                        spinner.text = `Fetched details for ${progress.count} messages...`;
                        break;
                    case 'batch_saved':
                        spinner.text = `Saved ${progress.count} attachments (Total: ${progress.total})`;
                        break;
                    case 'complete':
                        spinner.succeed(`Done. Total saved: ${progress.total}`);
                        break;
                }
            }
        });

        await downloader.download(filter);
    } catch (error) {
        if (error.name === 'ExitPromptError' || error.message.includes('force closed')) {
            console.log('\nOperation cancelled by user.');
            process.exit(0);
        } else {
            logger.error(error);
            process.exit(1);
        }
    }
}
