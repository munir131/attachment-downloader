import { jest } from '@jest/globals';

// Define mocks first
const mockGmailClient = {
    listMessages: jest.fn(),
    getMessage: jest.fn(),
    getAttachment: jest.fn()
};

const mockFileHelper = {
    getParentDir: jest.fn(() => '/mock/dir'),
    isFileExist: jest.fn(() => Promise.resolve(false)),
    saveFile: jest.fn(() => Promise.resolve()),
    getNewFileName: jest.fn(name => name)
};

const mockMkdirp = {
    mkdirp: jest.fn(() => Promise.resolve())
};

const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../internal/fileHelper.js', () => mockFileHelper);
jest.unstable_mockModule('mkdirp', () => mockMkdirp);
jest.unstable_mockModule('../internal/logger.js', () => ({ default: mockLogger }));

// Import SUT (System Under Test)
const { AttachmentDownloader } = await import('../core/attachmentDownloader.js');

describe('AttachmentDownloader', () => {
    let downloader;

    beforeEach(() => {
        jest.clearAllMocks();
        downloader = new AttachmentDownloader(mockGmailClient, { directory: '/tmp' });
    });

    describe('fetchMessageIds', () => {
        it('should list messages based on filter', async () => {
            mockGmailClient.listMessages.mockResolvedValue({
                data: {
                    messages: [{ id: '1' }],
                    nextPageToken: 'token'
                }
            });

            const result = await downloader.fetchMessageIds({ type: 'label', value: { id: 'LABEL_ID' } });
            
            expect(mockGmailClient.listMessages).toHaveBeenCalledWith(expect.objectContaining({
                labelIds: ['LABEL_ID']
            }));
            expect(result.messages).toHaveLength(1);
            expect(result.nextPageToken).toBe('token');
        });

        it('should handle errors', async () => {
            mockGmailClient.listMessages.mockRejectedValue(new Error('API Error'));
            await expect(downloader.fetchMessageIds({ type: 'all' }))
                .rejects.toThrow('API Error');
        });
    });

    describe('download', () => {
        it('should process messages and save attachments', async () => {
            // Mock listMessages to return one page then stop
            mockGmailClient.listMessages.mockResolvedValueOnce({
                data: { messages: [{ id: 'msg1' }], nextPageToken: null }
            });

            // Mock getMessage to return a message with attachment
            mockGmailClient.getMessage.mockResolvedValue({
                data: {
                    id: 'msg1',
                    internalDate: '1234567890',
                    payload: {
                        headers: [{ name: 'From', value: 'sender@example.com' }],
                        parts: [{
                            filename: 'file.txt',
                            body: { attachmentId: 'att1' }
                        }]
                    }
                }
            });

            // Mock getAttachment
            mockGmailClient.getAttachment.mockResolvedValue({
                data: { data: 'SGVsbG8=' } // "Hello" base64
            });

            await downloader.download({ type: 'all' });

            expect(mockGmailClient.listMessages).toHaveBeenCalledTimes(1);
            expect(mockGmailClient.getMessage).toHaveBeenCalledWith('msg1');
            expect(mockGmailClient.getAttachment).toHaveBeenCalledWith('msg1', 'att1');
            expect(mockFileHelper.saveFile).toHaveBeenCalled();
        });
    });
});
