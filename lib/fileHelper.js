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

export function getParentDir(argv, baseDir, time) {
  const date = new Date(Number(time));
  let dirPath = path.resolve(baseDir, 'files')
  if (argv.from) {
    dirPath = path.resolve(baseDir, 'files', argv.from)
  }
  if (argv.fy) {
    dirPath = path.resolve(dirPath, String(date.getFullYear()))
  }
  return dirPath
}
