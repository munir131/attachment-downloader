import { RateLimiter } from 'limiter';
import _ from 'lodash';
import { fixBase64, pluckAllAttachments, sanitizeFileName } from '../internal/utils.js';
import * as FileHelper from '../internal/fileHelper.js';
import logger from '../internal/logger.js';
import path from 'path';
import fs from 'fs';
import { mkdirp } from 'mkdirp';

export class AttachmentDownloader {
    constructor(gmailClient, options = {}) {
        this.gmail = gmailClient;
        this.baseDir = options.directory || './files';
        this.limiter = new RateLimiter({ tokensPerInterval: 1500, interval: 'minute' });
        this.onProgress = options.onProgress || (() => {});
        this.folderStructure = options.folderStructure || {}; // { fy: boolean, from: boolean }
    }

    async download(filter) {
        let nextPageToken = null;
        let totalSaved = 0;
        let pageCount = 0;

        this.onProgress({ stage: 'start' });

        do {
            pageCount++;
            this.onProgress({ stage: 'reading_page', page: pageCount });
            
            const result = await this.fetchMessageIds(filter, nextPageToken);
            
            if (result.messages.length > 0) {
                 const messages = await this.fetchMessagesDetails(result.messages);
                 const attachments = pluckAllAttachments(messages);
                 const savedCount = await this.saveAttachments(attachments);
                 totalSaved += savedCount;
                 this.onProgress({ stage: 'batch_saved', count: savedCount, total: totalSaved });
            }
            
            nextPageToken = result.nextPageToken;
        } while (nextPageToken);

        this.onProgress({ stage: 'complete', total: totalSaved });
    }

    async fetchMessageIds(filter, pageToken) {
        const options = { maxResults: 500, pageToken };
        const queryParts = ['has:attachment'];

        if (filter.label) {
            options.labelIds = [filter.label.id];
        }

        if (filter.from) {
            queryParts.push(`from:${filter.from}`);
        }

        if (filter.before) {
            queryParts.push(`before:${filter.before}`);
        }

        if (filter.after) {
            queryParts.push(`after:${filter.after}`);
        }

        options.q = queryParts.join(' ');
        
        try {
            const response = await this.gmail.listMessages(options);
            return {
                messages: response.data.messages || [],
                nextPageToken: response.data.nextPageToken
            };
        } catch (error) {
            logger.error('Error fetching message IDs: ' + error);
            throw error;
        }
    }

    async fetchMessagesDetails(messageIds) {
        const chunks = _.chunk(messageIds, 50); // Batch size
        let allMessages = [];

        for (const chunk of chunks) {
            // Respect rate limits
            await this.limiter.removeTokens(chunk.length);
            
            const promises = chunk.map(msg => this.gmail.getMessage(msg.id).catch(e => {
                logger.warn(`Failed to fetch message ${msg.id}: ${e.message}`);
                return null;
            }));
            
            const results = await Promise.all(promises);
            allMessages = allMessages.concat(_.compact(results));
        }
        return allMessages;
    }

    async saveAttachments(attachments) {
        let count = 0;
        for (const attachment of attachments) {
            try {
                const content = await this.fetchAttachmentContent(attachment);
                if (content) {
                    await this.saveFile(attachment, content);
                    count++;
                }
            } catch (error) {
                logger.error(`Failed to save attachment ${attachment.name}: ${error.message}`);
            }
        }
        return count;
    }

    async fetchAttachmentContent(attachment) {
        await this.limiter.removeTokens(1);
        const response = await this.gmail.getAttachment(attachment.mailId, attachment.id);
        if (!response || !response.data || !response.data.data) {
            return null;
        }
        return fixBase64(response.data.data);
    }

    async saveFile(attachment, content) {
        const dirPath = FileHelper.getParentDir(
            { from: this.folderStructure.from ? 'unknown' : undefined, fy: this.folderStructure.fy }, // Simulating argv for now, reusing fileHelper logic if possible or creating new
            this.baseDir, 
            attachment.time
        );

        // Adjust dirPath based on structure options more correctly
        // Reuse logic from FileHelper or implement here? 
        // FileHelper.getParentDir logic: 
        // if argv.from -> resolve(baseDir, 'files', argv.from) (Wait, argv.from is the query string?)
        // if argv.fy -> resolve(..., Year)
        
        // I'll reimplement clean directory logic here to avoid dependence on 'argv' structure
        let targetDir = this.baseDir;
        if (this.folderStructure.from && attachment.fromAddress) {
             // We don't have fromAddress in attachment object yet. pluckAllAttachments needs to be updated or we assume we sort by filter 'from'
             // If the filter was 'from', we can use that.
        }
        
        // Use existing FileHelper for now, but I might need to fix it.
        // internal/fileHelper.js expects (argv, baseDir, time).
        // argv.from and argv.fy are checked.
        
        const argvShim = {
            from: this.folderStructure.from ? (attachment.from || 'filtered') : undefined,
            fy: this.folderStructure.fy
        };
        
        const finalDir = FileHelper.getParentDir(argvShim, this.baseDir, attachment.time);
        
        if (!fs.existsSync(finalDir)) {
            await mkdirp(finalDir);
        }

        const cleanFileName = sanitizeFileName(attachment.name);
        const fileName = path.resolve(finalDir, cleanFileName);
        
        let availableFileName = fileName;
        if (await FileHelper.isFileExist(fileName)) {
            availableFileName = FileHelper.getNewFileName(fileName);
        }

        await FileHelper.saveFile(availableFileName, content);
    }
}
