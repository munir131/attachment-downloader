import _ from 'lodash';
import atob from 'atob';

/**
 * Decodes a base64 string (including URL-safe variants) into a Uint8Array.
 * @param {string} binaryData - The base64 string.
 * @returns {Uint8Array} - The decoded data.
 */
export function fixBase64(binaryData) {
  const base64str = binaryData.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64str.replace(/\s/g, ''));
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);

  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }

  return view;
}

/**
 * Extracts attachment metadata from a list of email message objects.
 * @param {Array} mails - List of mail objects from Gmail API.
 * @returns {Array} - List of attachment objects { mailId, name, id }.
 */
export function pluckAllAttachments(mails) {
  return _.compact(_.flatten(_.map(mails, (m) => {
    if (!m.data || !m.data.payload || !m.data.payload.parts) {
      return undefined;
    }
    return _.map(m.data.payload.parts, (p) => {
      if (!p.body || !p.body.attachmentId) {
        return undefined;
      }
      return {
        mailId: m.data.id,
        name: p.filename,
        id: p.body.attachmentId,
        time: m.data.internalDate
      };
    });
  })));
}

/**
 * Sanitizes a filename by replacing directory separators with underscores.
 * @param {string} fileName - The original filename.
 * @returns {string} - The sanitized filename.
 */
export function sanitizeFileName(fileName) {
  return fileName.replace(/[\\/]/g, '_');
}
