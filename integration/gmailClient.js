import util from 'util';
import { google } from 'googleapis';

export class GmailClient {
    constructor(auth) {
        this.auth = auth;
        this.gmail = google.gmail({ version: 'v1', auth });
    }

    async listLabels() {
        const list = util.promisify(this.gmail.users.labels.list).bind(this.gmail.users.labels);
        const response = await list({ userId: 'me' });
        return response.data.labels;
    }

    async listMessages(options) {
        const list = util.promisify(this.gmail.users.messages.list).bind(this.gmail.users.messages);
        return await list({
            userId: 'me',
            ...options
        });
    }

    async getMessage(id) {
        const get = util.promisify(this.gmail.users.messages.get).bind(this.gmail.users.messages);
        return await get({
            userId: 'me',
            id: id
        });
    }

    async getAttachment(messageId, attachmentId) {
        const get = util.promisify(this.gmail.users.messages.attachments.get).bind(this.gmail.users.messages.attachments);
        return await get({
            userId: 'me',
            messageId: messageId,
            id: attachmentId
        });
    }
}
