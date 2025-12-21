import { jest } from '@jest/globals';
import path from 'path';

const mockFs = {
    writeFile: jest.fn((path, content, cb) => cb(null)),
    stat: jest.fn((path, cb) => cb(null)),
};

jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    ...mockFs
}));

const FileHelper = await import('../internal/fileHelper.js');

describe('FileHelper', () => {
    describe('getNewFileName', () => {
        it('should append timestamp to filename with extension', () => {
             const name = 'test.txt';
             const newName = FileHelper.getNewFileName(name);
             expect(newName).toMatch(/test \(\d+\)\.txt/);
        });
        
        it('should append timestamp to filename without extension', () => {
             const name = 'test';
             const newName = FileHelper.getNewFileName(name);
             expect(newName).toMatch(/test \(\d+\)/);
        });
    });

    describe('isFileExist', () => {
        it('should return true if file exists', async () => {
            mockFs.stat.mockImplementation((p, cb) => cb(null));
            const exists = await FileHelper.isFileExist('file');
            expect(exists).toBe(true);
        });
        
        it('should return false if file does not exist', async () => {
             mockFs.stat.mockImplementation((p, cb) => cb(new Error('Noent')));
             const exists = await FileHelper.isFileExist('file');
             expect(exists).toBe(false);
        });
    });

    describe('saveFile', () => {
        it('should write file to disk', async () => {
             await FileHelper.saveFile('path', 'content');
             expect(mockFs.writeFile).toHaveBeenCalledWith('path', 'content', expect.any(Function));
        });
        
        it('should reject on error', async () => {
             mockFs.writeFile.mockImplementation((p, c, cb) => cb(new Error('Write error')));
             await expect(FileHelper.saveFile('path', 'content')).rejects.toThrow('Write error');
        });
    });

    describe('getParentDir', () => {
        it('should return baseDir if no options', () => {
             const dir = FileHelper.getParentDir({}, '/base', 1234567890000);
             expect(dir).toBe('/base');
        });

        it('should append from if provided', () => {
             const dir = FileHelper.getParentDir({ from: 'sender' }, '/base', 1234567890000);
             expect(dir).toBe(path.resolve('/base', 'sender'));
        });

        it('should append year if fy is true', () => {
             const time = new Date('2023-01-01').getTime();
             const dir = FileHelper.getParentDir({ fy: true }, '/base', time);
             expect(dir).toBe(path.resolve('/base', '2023'));
        });
        
        it('should append from and year', () => {
             const time = new Date('2023-01-01').getTime();
             const dir = FileHelper.getParentDir({ fy: true, from: 'sender' }, '/base', time);
             expect(dir).toBe(path.resolve('/base', 'sender', '2023'));
        });
    });
});
