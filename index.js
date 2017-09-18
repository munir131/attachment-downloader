const _ = require('lodash');
const atob = require('atob');
const fs = require('fs');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const inquirer = require('inquirer');
const path = require('path');
const readline = require('readline');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
}

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Gmail API.
  authorize(JSON.parse(content), main);
  // authorize(JSON.parse(content), listLabels);

});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail('v1');
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

function main(auth) {
  let labels;
  let coredata = {};
  listLabels(auth)
    .then((response) => {
      console.log('labels');
      labels = response.labels;
      return labels;
    })
    .then(askForLabel)
    .then((selectedLabel) => {
      coredata.label = selectedLabel;
      return getListOfMailIdByLabel(auth, coredata.label.id);
    })
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

function fetchAndSaveAttachments(auth, attachments) {
  var promises = _.map(attachments, (attachment) => {
    return fetchAndSaveAttachment(auth, attachment);
  });
  return Promise.all(promises);
}

function fetchAndSaveAttachment(auth, attachment) {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail('v1');
    console.log(attachment.id);
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
      var data = response.data.replaceAll('-','+');
      data = data.replaceAll('_','/');
      fs.writeFile(path.resolve(__dirname, 'files', attachment.name), fixBase64(data), function(err) {
          if(err) {
              reject(err);
          }
          resolve(`${attachment.name} file was saved!`);
      });
      // console.log(response);
    });
  });
}

function pluckAttachment(mails) {
  return _.compact(_.map(mails, (m) => {
    const attachment = {
      mailId: m.id,
      name: m.payload.parts.length > 1 ? m.payload.parts[1].filename : undefined,
      id: m.payload.parts.length > 1 ? m.payload.parts[1].body.attachmentId: undefined
    };
    return m.payload.parts.length > 1 ? attachment : undefined;
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

function getListOfMailIdByLabel(auth, labelId, maxResults = 500) {
  return new Promise((resolve, reject) => {
    const gmail = google.gmail('v1');
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
        resolve(response.messages);
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
    const gmail = google.gmail('v1');
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