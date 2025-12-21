import fs from 'fs';
import path from 'path';

export function getNewFileName(fileName) {
  const chunks = fileName.split('.')
  if (chunks.length > 1) {
    const ext = `.${chunks[chunks.length - 1]}`
    return chunks.slice(0, chunks.length - 1).join('.') + ' (' + Date.now() + ')' + ext;
  }
  return fileName + ' (' + Date.now() + ')';

}

export function saveFile(fileName, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, function (err) {
      if (err) {
        reject(err);
      }
      resolve(`${fileName} file was saved!`);
    });
  });
}

export function isFileExist(fileName) {
  return new Promise((resolve, reject) => {
    fs.stat(fileName, (err) => {
      if (err) {
        resolve(false);
      }
      resolve(true);
    })
  });
}

/**
 * Resolves the target directory based on options and timestamp.
 * @param {Object} options - { from: string|undefined, fy: boolean }
 * @param {string} baseDir - The base directory to save to.
 * @param {string|number} time - The timestamp of the attachment/email.
 */
export function getParentDir(options, baseDir, time) {
  const date = new Date(Number(time));
  let dirPath = baseDir;
  
  if (options.from) {
    dirPath = path.resolve(baseDir, options.from);
  }
  
  if (options.fy) {
    dirPath = path.resolve(dirPath, String(date.getFullYear()));
  }
  return dirPath;
}
