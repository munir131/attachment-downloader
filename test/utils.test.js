import { fixBase64, pluckAllAttachments, sanitizeFileName } from '../lib/utils.js';
import _ from 'lodash';

describe('utils', () => {
  describe('fixBase64', () => {
    it('should decode a simple base64 string', () => {
      const input = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const result = fixBase64(input);
      const text = new TextDecoder().decode(result);
      expect(text).toBe('Hello World');
    });

    it('should handle URL-safe base64 characters', () => {
      // Base64 URL safe: '-' instead of '+', '_' instead of '/'
      const input = 'a-_b'; // "a+/b" in standard base64 would be decoded
      // Let's use a known string. "Subject?" -> "U3ViamVjdD8="
      // "Subject~" -> "U3ViamVjdH4="
      
      // Let's try manually.
      // input with '-' and '_'
      // "abc_def-" -> "abc/def+"
      const original = "ab\xcd\xef\xbe"; // some binary
      // Just testing the replacement logic:
      // fixBase64 replaces '-' with '+' and '_' with '/'
      // Let's mock atob behavior implicitly by checking if it decodes correctly.
      
      const standard = 'SGVsbG8gV29ybGQ=';
      const urlSafe = 'SGVsbG8gV29ybGQ='; // No + or / here.
      
      const inputWithSpecial = 'SGVsbG8gV29ybGQ-'; // Not valid but testing replacement
      // "Hello World" in standard is "SGVsbG8gV29ybGQ="
      // "+" -> 43, "/" -> 47
      
      // Let's use a string that definitely produces + and /
      // "???" -> "Pz8/"
      // ">>>" -> "Pj4+"
      
      const inputP = 'Pj4-'; // ">>>" URL safe
      const result = fixBase64(inputP);
      const text = new TextDecoder().decode(result);
      expect(text).toBe('>>>');
    });
  });

  describe('pluckAllAttachments', () => {
    it('should extract attachments from mails', () => {
      const mails = [
        {
          data: {
            id: 'mail1',
            payload: {
              parts: [
                {
                  filename: 'test.pdf',
                  body: { attachmentId: 'att1' }
                },
                {
                  filename: 'ignore.txt',
                  body: {} // no attachmentId
                }
              ]
            }
          }
        },
        {
          data: {
            id: 'mail2',
            // no parts
          }
        }
      ];

      const result = pluckAllAttachments(mails);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        mailId: 'mail1',
        name: 'test.pdf',
        id: 'att1'
      });
    });

    it('should return empty array if no attachments found', () => {
      const mails = [{ data: { id: 'mail1' } }];
      const result = pluckAllAttachments(mails);
      expect(result).toEqual([]);
    });
  });

  describe('sanitizeFileName', () => {
    it('should replace slashes with underscores', () => {
      expect(sanitizeFileName('folder/file.txt')).toBe('folder_file.txt');
      expect(sanitizeFileName('folder\\file.txt')).toBe('folder_file.txt');
    });

    it('should leave safe filenames alone', () => {
      expect(sanitizeFileName('file.txt')).toBe('file.txt');
    });
  });
});
