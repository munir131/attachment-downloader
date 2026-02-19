import { AttachmentDownloader } from '../core/attachmentDownloader.js';
import logger from '../internal/logger.js';
import ora from 'ora';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

export async function startAutomated(auth, gmailClient) {
    const argv = yargs(hideBin(process.argv))
        .option('from', {
            type: 'string',
            description: 'Download files only from mail which come from given mail id'
        })
        .option('fy', {
            type: 'boolean',
            description: 'Financial year wise folder structure'
        })
        .option('label', {
            type: 'string',
            description: 'Label to filter by'
        })
        .option('dir', {
            type: 'string',
            description: 'Directory to save files'
        })
        .option('before', {
            type: 'string',
            description: 'Filter emails before this date (YYYY/MM/DD)'
        })
        .option('after', {
            type: 'string',
            description: 'Filter emails after this date (YYYY/MM/DD)'
        })
        .argv;

    let filter = {};
    
    if (argv.from) {
        filter.from = argv.from;
    }

    if (argv.label) {
        try {
            const labels = await gmailClient.listLabels();
            const labelObj = labels.find(l => l.name === argv.label);
            if (labelObj) {
                filter.label = labelObj;
            } else {
                logger.error(`Label ${argv.label} not found.`);
                process.exit(1);
            }
        } catch (e) {
            logger.error('Failed to list labels: ' + e.message);
            process.exit(1);
        }
    }

    if (argv.before) {
        filter.before = argv.before;
    }

    if (argv.after) {
        filter.after = argv.after;
    }

    if (Object.keys(filter).length === 0) {
        filter = { type: 'all' };
    }

    const spinner = ora('Starting automated download...').start();

    const downloader = new AttachmentDownloader(gmailClient, {
        directory: argv.dir || process.env.DIR || './files',
        folderStructure: {
            fy: argv.fy,
            from: !!argv.from
        },
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

    try {
        await downloader.download(filter);
    } catch (error) {
        spinner.fail('Error occurred');
        logger.error(error);
        process.exit(1);
    }
}
