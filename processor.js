const _ = require('lodash');
const atob = require('atob');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const sqlite = require('./lib/sqliteHelper');
const db = sqlite.getDBConn();
const AuthFetcher = require('./lib/googleAPIWrapper');
let gmail;
String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
}

AuthFetcher.getAuthAndGmail(main);

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth, gmail) {
  return new Promise((resolve, reject) => {
    gmail.users.labels.list({
      auth: auth,
      userId: 'me',
    }, (err, response) => {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err);
      }
      resolve(response);
    });
  })
}

function main(auth, gmailInstance) {
  let labels;
  let coredata = {};
  gmail = gmailInstance;
    // getListOfMailId(auth) 
    // .then((mailList) => {
    //     db.run("BEGIN TRANSACTION");
    //     db.parallelize(function() {
    //         _.each(mailList, function(mail, index) {
    //             db.run('REPLACE into mails (id, threadId, created_at) values (?,?,?)', [mail.id, mail.threadId, Date.now()], () => {
    //                 console.log(index + ' inserted');
    //             });    
    //             });
    //     });
    //     db.run("COMMIT");
    // })
    // .then(() => {
    //   return fetchMailsByMailIds(auth, mailList);
    // })
    // .then((mails) => {
    //   coredata.attachments = pluckAttachment(mails);
    //   return fetchAndSaveAttachments(auth, coredata.attachments);
    // })
    // .catch((e) => console.log(e));
    db.all('select count(*) as count from mails', (err, data) => {
      const total = data[0].count;
      chunkFetchAndStore(auth, total, 20, 1420);
    });
}

function chunkFetchAndStore(auth, total, size, offset = 0) {
    if (offset + size < total) {
      db.all(`select * from mails limit ${size} offset ${offset}`, (err, mailList) => {
        return fetchMailsByMailIds(auth, mailList)
          .then((mails) => {
            let attachments = pluckAttachment(mails);
            return fetchAndSaveAttachments(auth, attachments);
          })
          .then(() => {
            console.log(`${offset + size} done`);
            chunkFetchAndStore(auth, total, size, offset + size);
          })
        });
    } else {
      console.log('Done');
    }
}

function fetchAndSaveAttachments(auth, attachments) {
  var promises = [];
  _.each(attachments, (attachment) => {
    if (attachment.id) {
      promises.push(fetchAndSaveAttachment(auth, attachment));
    }
  });
  return Promise.all(promises);
}

function fetchAndSaveAttachment(auth, attachment) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.attachments.get({
      auth: auth,
      userId: 'me',
      messageId: attachment.mailId,
      id: attachment.id
    }, function(err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err);
      }
      if (!response) {
        console.log('Empty response: ' + response);
        reject(response);
      }
      var data = response.data.data.replaceAll('-','+');
      data = data.replaceAll('_','/');
      var content = fixBase64(data);
      resolve(content);
    });
  })
  .then((content) => {
    const dirName = path.resolve(__dirname, 'files', attachment.from);
    isFileExist(dirName)
      .then((isExist) => {
        if (!isExist) {
          fs.mkdirSync(dirName);
        }
      })
      .then(() => {
        var fileName = path.resolve(__dirname, 'files', attachment.from, attachment.name);
        return isFileExist(fileName)
        .then((isExist) => {
          if (isExist) {
            return getNewFileName(fileName);
          }
          return fileName;
        })
        .then((availableFileName) => {
          return saveFile(availableFileName, content);
        })
      })
    
  })
}

function isFileExist(fileName) {
  return new Promise((resolve, reject) => {
    fs.stat(fileName, (err) => {
      if (err) {
        resolve(false);
      }
      resolve(true);
    })
  });
}

function getNewFileName(fileName) {
  let filePathChunks  = fileName.split('.');
  return filePathChunks.splice(0, filePathChunks.length -1).join('.') + '-' + Date.now() + '-.' +  filePathChunks;
}

function saveFile(fileName, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, function(err) {
      if(err) {
          reject(err);
      }
      console.log(`${fileName} file was saved!`);
      resolve(`${fileName} file was saved!`);
    });
  });
}

function pluckAttachment(mails) {
  return _.compact(_.map(mails, (m) => {
    if (!m.data) {
      return undefined;
    }
    let fromMeta = _.find(m.data.payload.headers, {'name': 'From'});
    if (!fromMeta) {
      fromMeta = _.find(m.data.payload.headers, {'name': 'FROM'});
      console.log(fromMeta);
    }
    let fromId = fromMeta ? fromMeta.value.split(">")[0].split('<')[1] : 'UNKNOWN'; 
    if (!fromId) {
      fromId = fromMeta.value;
    }
    const attachment = {
      from: fromId,
      mailId: m.data.id,
      name: m.data.payload.parts && m.data.payload.parts.length > 1 ? m.data.payload.parts[1].filename : undefined,
      id: m.data.payload.parts && m.data.payload.parts.length > 1 ? m.data.payload.parts[1].body.attachmentId: undefined
    };
    return m.data.payload.parts && m.data.payload.parts.length > 1 ? attachment : undefined;
  }));
}

function askForLabel(labels) {
  return inquirer.prompt([
      {
        type: 'list',
        name: 'label',
        message: 'Choose label for filter mails:',
        choices: _.map(labels, 'name'),
        filter: val => _.find(labels, l => l.name === val)
      }
    ])
    .then(answers => answers.label);
}

function askForFilter(labels) {
  return inquirer.prompt([
      {
        type: 'list',
        name: 'option',
        message: 'How do you like to filter',
        choices: ['Using from email Id', 'Using label', 'all'],
        filter: val => {
          if (val === 'Using from email Id') {
            return 'from';
          } else if(val === 'all') {
            return 'all';
          } else {
            return 'label';
          }
        }
      }
    ])
    .then(answers => answers.option);
}

function askForMail() {
  return inquirer.prompt([
    {
      type: 'input',
      name: 'from',
      message: 'Enter from mailId:'
    }
  ])
  .then(answers => answers.from);
}

function getListOfMailIdByLabel(auth, labelId, maxResults = 500) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        labelIds: labelId,
        maxResults: maxResults
      }, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          reject(err);
        }
        resolve(response.data.messages);
      });
  });
}

function getListOfMailId(auth, maxResults = 5000) {
  let messages = [];
  let pageToken = undefined;
  let getList = function () {
    return new Promise((resolve, reject) => {
      gmail.users.messages.list({
          auth: auth,
          userId: 'me',
          maxResults: maxResults,
          pageToken: pageToken
        }, function(err, response) {
          if (err) {
            console.log('The API returned an error: ' + err);
            reject(err);
          }
          messages = messages.concat(response.data.messages);
          console.log(messages.length);
          if (response.data.nextPageToken) {
            console.log('Next token found - ' + response.data.nextPageToken);
            pageToken = response.data.nextPageToken;
            getList()
              .then(resolve);
          } else {
            console.log('No token found - ' + response.data.nextPageToken);
            pageToken = undefined;
            resolve();
          }
        });
    });
  }
  return getList()
    .then(() => {
      return messages;
    });
}

function getListOfMailIdByFromId(auth, mailId, maxResults = 500) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        q: 'from:' + mailId,
        maxResults: maxResults
      }, function(err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          reject(err);
        }
        resolve(response.data.messages);
      });
  });
}

function fetchMailsByMailIds(auth, mailList) {
  const promises = _.map(mailList, (mail) => {
    return getMail(auth, mail.id);
  });
  return Promise.all(promises);
}

function getMail(auth, mailId) {

  return new Promise((resolve, reject) => {
    gmail.users.messages.get({
      userId: 'me',
      id: mailId,
      auth,
    }, (err, response) => {
      if (err) {
        reject(err);
      }
      resolve(response);
    })
  })
}

function fixBase64(binaryData) {
  const base64str = binaryData// base64 string from  thr response of server
  const binary = atob(base64str.replace(/\s/g, ''));// decode base64 string, remove space for IE compatibility
  const len = binary.length;         // get binary length
  const buffer = new ArrayBuffer(len);         // create ArrayBuffer with binary length
  const view = new Uint8Array(buffer);         // create 8-bit Array

  // save unicode of binary data into 8-bit Array
  for (let i = 0; i < len; i++) {
    view[i] = binary.charCodeAt(i);
  }

  return view;
}