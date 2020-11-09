const _ = require('lodash');
const atob = require('atob');
const fs = require('fs');
const inquirer = require('inquirer');
const path = require('path');
const ora = require('ora');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const AuthFetcher = require('./lib/googleAPIWrapper');
const FileHelper = require('./lib/fileHelper');
const GmailHelper = require('./lib/gmail');
const { time } = require('console');
const mkdirp = require('mkdirp');

var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(300, 'minute');

let pageCounter = 1;
let listCounter = 0;
let mailCounter = 0;
let attachmentCounter = 0;

let gmail;
let coredata = {};

String.prototype.replaceAll = function (search, replacement) {
  var target = this;
  return target.split(search).join(replacement);
}
const argv = yargs(hideBin(process.argv))
    .option('ext', {
      type: 'string',
      description: 'File extention which we want to save'
    })
    .option('from', {
      type: 'string',
      description: 'Download files only from mail which come from given mail id'
    })
    .option('fy', {
      type: 'boolean',
      description: 'Financial year wise folder structure'
    })
    .argv

const spinner = ora('Reading 1 page');
AuthFetcher.getAuthAndGmail(main);

async function main(auth, gmailInstance) {

  let labels;
  let nextPageToken = null;
  gmail = gmailInstance;
  spinner.start()
  do {
    nextPageToken = await workflow(auth, spinner, nextPageToken)
    // In case of rate limit hit
    // await sleep(30000)
  } while (nextPageToken)
  spinner.stop()
  console.log("Check your folder :)")
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function workflow(auth, spinner, nextPageToken = null) {
  let token;
  return getMailIdsFromPage(auth, 500, nextPageToken)
    .then((response) => {
      coredata.mailList = response.ids;
      if (response.token) {
        token = response.token
      }
        return GmailHelper.fetchMailsByMailIds(gmail, auth, spinner, response.ids);
    })
    .then((mails) => {
      coredata.attachments = pluckAttachments(mails);
      return fetchAndSaveAttachments(auth, coredata.attachments);
    })
    .then(() => {
      return token
    })
    .catch((e) => console.log(e));
}

async function fetchAndSaveAttachments(auth, attachments) {
  let results = [];
  let promises = [];
  let processed = 0;
  let counter = 0;
  spinner.text = "Fetching attachment from mails"
  if (attachments.length > 0) {
    for (index in attachments) {
      if (attachments[index].id) {
        promises.push(fetchAndSaveAttachment(auth, attachments[index]));
        counter++;
        processed++;
        if (counter === 100) {
          attachs = await Promise.all(promises);
          _.merge(results, attachs);
          promises = [];
          counter = 0;
        }
      }
    }
    attachs = await Promise.all(promises);
    _.merge(results, attachs);
  }
  return results;
}

function fetchAndSaveAttachment(auth, attachment) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.attachments.get({
      auth: auth,
      userId: 'me',
      messageId: attachment.mailId,
      id: attachment.id
    }, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err);
      }
      if (!response) {
        console.log('Empty response: ' + response);
        reject(response);
      }
      var data = response.data.data.replaceAll('-', '+');
      data = data.replaceAll('_', '/');
      var content = fixBase64(data);
      resolve(content);
    });
  })
    .then((content) => {
      dirPath = FileHelper.getParentDir(argv, __dirname, attachment.time);
      mkdirp.sync(dirPath)
      var fileName = path.resolve(dirPath, attachment.name);
      return FileHelper.isFileExist(fileName)
        .then((isExist) => {
          if (isExist) {
            return FileHelper.getNewFileName(fileName);
          }
          return fileName;
        })
        .then((availableFileName) => {
          spinner.text = ++attachmentCounter + " attachemets are saved"
          return FileHelper.saveFile(availableFileName, content);
        })
    })
}


function pluckAttachments(mails) {
  return _.compact(_.flatten(_.map(mails, (m) => {
    if (!m.data || !m.data.payload || !m.data.payload.parts) {
      return undefined;
    }
    return _.map(m.data.payload.parts, (p) => {
      if (!p.body || !p.body.attachmentId) {
        return undefined;
      }
      const attachment = {
        mailId: m.data.id,
        name: p.filename,
        id: p.body.attachmentId,
        time: m.data.internalDate
      };
      return attachment;
    })
  })));
}

function getMailIdsFromPage(auth, maxResults = 500, nextPageToken) {
  let messageIds = [];
  const response = {
    token: nextPageToken,
    ids: []
  }
  return new Promise((resolve, reject) => {
    const listOptions = {
      auth: auth,
      userId: 'me',
      maxResults: maxResults,
      pageToken: nextPageToken ? nextPageToken : undefined
    }
    if (argv.from) {
      listOptions.q = `from: ${argv.from}`;
    }
    gmail.users.messages.list(listOptions, function (err, response) {
      if (err) {
        console.log('The API returned an error: ' + err);
        reject(err);
      }
      if (response.data && response.data.nextPageToken) {
        messageIds = messageIds.concat(response.data.messages)
        spinner.text = "Reading page: " + ++pageCounter
        response.ids = messageIds
        response.token = response.data.nextPageToken
        resolve(response)
      } else {
        response.ids = response.data.messages
        response.token = undefined
        spinner.text = "All pages are read"
        resolve(response)
      }
    });
  });
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
