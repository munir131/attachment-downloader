const _ = require('lodash');
const atob = require('atob');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');

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
  let workflow;
  gmail = gmailInstance;
  if (detectCommandOptions()) {
    workflow = scanForLabelOption;
  } else {
    workflow = defaultBehaviour;
  }
  workflow(auth, gmail, coredata)
    .then((mailList) => {
      coredata.mailList = mailList;
      return fetchMailsByMailIds(auth, mailList);
    })
    .then((mails) => {
      coredata.attachments = pluckAttachment(mails);
      return fetchAndSaveAttachments(auth, coredata.attachments);
    })
    .then(() => {
      console.log('Done');
    })
    .catch((e) => console.log(e));
}

const detectCommandOptions = () => process.argv.length > 2;

const defaultBehaviour = (auth, gmail, coredata) => {
    return askForFilter()
            .then((option) => {
              if (option === 'label') {
                return listLabels(auth, gmail)
                  .then((response) => {
                    labels = response.data.labels;
                    return labels;
                  })
                  .then(askForLabel)
                  .then((selectedLabel) => {
                    coredata.label = selectedLabel;
                    return getListOfMailIdByLabel(auth, coredata.label.id, 200);
                  });
              } else {
                return askForMail()
                  .then((mailId) => {
                    return getListOfMailIdByFromId(auth, mailId, 50);
                  });
              }
            });
};

const scanForLabelOption = (auth, gmail) => {
  return new Promise((resolve,reject) => {
    const paramsNumber = process.argv.length;
    if (paramsNumber == 4) {
      const optionName = process.argv[2];
      if (optionName === '--label') {
        resolve(process.argv[3]);
      }
    }    
    reject("WARNING: expected --label LABEL_NAME option")
    })
    .then(labelName => {
      return listLabels(auth, gmail)
        .then(response => {
          const labelObj = _.find(response.data.labels, l => l.name === labelName);
          return getListOfMailIdByLabel(auth, labelObj.id, 200);
        });
      });
};

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
    var fileName = path.resolve(__dirname, 'files', attachment.name);
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
  return fileName.split('.')[0] + ' (' + Date.now() + ')' +  fileName.split('.')[1];
}

function saveFile(fileName, content) {
  return new Promise((resolve, reject) => {
    fs.writeFile(fileName, content, function(err) {
      if(err) {
          reject(err);
      }
      resolve(`${fileName} file was saved!`);
    });
  });
}

function pluckAttachment(mails) {
  return _.compact(_.map(mails, (m) => {
    if (!m.data || !m.data.payload || !m.data.payload.parts) {
      return undefined;
    }
    const attachment = {
      mailId: m.data.id,
      name: m.data.payload.parts.length > 1 ? m.data.payload.parts[1].filename : undefined,
      id: m.data.payload.parts.length > 1 ? m.data.payload.parts[1].body.attachmentId: undefined
    };
    return m.data.payload.parts.length > 1 ? attachment : undefined;
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
        choices: ['Using from email Id', 'Using label'],
        filter: val => {
          if (val === 'Using from email Id') {
            return 'from';
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
