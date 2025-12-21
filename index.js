import _ from 'lodash';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';
import ora from 'ora';
import util from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import * as AuthFetcher from './lib/googleAPIWrapper.js';
import * as FileHelper from './lib/fileHelper.js';
import { fixBase64, pluckAllAttachments, sanitizeFileName } from './lib/utils.js';
import { askForFilter, askForLabel, askForMail, askForDirectory } from './lib/questions.js';
import logger from './lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pageCounter = 1;
let messageIds = [];
let gmail;

const spinner = ora('Reading 1 page');
AuthFetcher.getAuthAndGmail(main);

async function listLabels(auth, gmail) {
  const list = util.promisify(gmail.users.labels.list).bind(gmail.users.labels);
  const response = await list({ auth, userId: 'me' });
  return response;
}

async function main(auth, gmailInstance) {
  let coredata = {};
  let workflow;
  gmail = gmailInstance;

  if (process.env.DIR) {
    coredata.directory = process.env.DIR;
  } else {
    coredata.directory = await askForDirectory();
  }

  if (detectCommandOptions()) {
    workflow = scanForLabelOption;
  } else {
    workflow = defaultBehaviour;
  }

  try {
    const mailList = await workflow(auth, gmail, coredata);
    coredata.mailList = mailList;
    
    const mails = await fetchMailsByMailIds(auth, mailList);
    coredata.attachments = pluckAllAttachments(mails);
    
    await fetchAndSaveAttachments(auth, coredata.attachments, coredata.directory);
    spinner.stop();
    logger.info('Done');
  } catch (e) {
    logger.error(e);
  }
}

const detectCommandOptions = () => process.argv.length > 2;

const defaultBehaviour = async (auth, gmail, coredata) => {
  const option = await askForFilter();
  
  if (option === 'label') {
    const response = await listLabels(auth, gmail);
    const labels = response.data.labels;
    const selectedLabel = await askForLabel(labels);
    coredata.label = selectedLabel;
    spinner.start();
    return getListOfMailIdByLabel(auth, coredata.label.id, 50);
  } else if (option === 'from') {
    const mailId = await askForMail();
    spinner.start();
    return getListOfMailIdByFromId(auth, mailId, 200);
  } else {
    spinner.start();
    return getAllMails(auth, 500);
  }
};

const scanForLabelOption = async (auth, gmail) => {
  const paramsNumber = process.argv.length;
  if (paramsNumber === 4 && process.argv[2] === '--label') {
    const labelName = process.argv[3];
    const response = await listLabels(auth, gmail);
    const labelObj = _.find(response.data.labels, l => l.name === labelName);
    return getListOfMailIdByLabel(auth, labelObj.id, 200);
  }
  throw new Error("WARNING: expected --label LABEL_NAME option");
};

async function fetchAndSaveAttachments(auth, attachments, dir) {
  let results = [];
  let promises = [];
  let counter = 0;
  let processed = 0;
  
  spinner.text = "Fetching attachment from mails";
  
  for (const attachment of attachments) {
    if (attachment.id) {
      promises.push(fetchAndSaveAttachment(auth, attachment, dir));
      counter++;
      processed++;
      
      if (counter === 100) {
        const attachs = await Promise.all(promises);
        results = results.concat(attachs);
        promises = [];
        counter = 0;
        spinner.text = processed + " attachments are saved";
      }
    }
  }
  
  const attachs = await Promise.all(promises);
  results = results.concat(attachs);
  return results;
}

async function fetchAndSaveAttachment(auth, attachment, dir) {
  const getAttachment = util.promisify(gmail.users.messages.attachments.get).bind(gmail.users.messages.attachments);
  
  try {
    const response = await getAttachment({
      auth: auth,
      userId: 'me',
      messageId: attachment.mailId,
      id: attachment.id
    });

    if (!response) {
      logger.warn('Empty response');
      return;
    }

    const content = fixBase64(response.data.data);
    const cleanFileName = sanitizeFileName(attachment.name);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    
    const fileName = path.resolve(dir, cleanFileName);
    const isExist = await FileHelper.isFileExist(fileName);
    
    let availableFileName = fileName;
    if (isExist) {
      availableFileName = FileHelper.getNewFileName(fileName);
    }
    
    return await FileHelper.saveFile(availableFileName, content);

  } catch (err) {
    logger.error('The API returned an error: ' + err);
    throw err;
  }
}


function getListOfMailIdByLabel(auth, labelId, maxResults = 500, nextPageToken) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.list({
      auth: auth,
      userId: 'me',
      labelIds: labelId,
      maxResults: maxResults,
      pageToken: nextPageToken
    }, (err, response) => {
      if (err) {
        logger.error('The API returned an error: ' + err);
        reject(err);
        return;
      }
      
      if (response.data && response.data.messages) {
        messageIds = messageIds.concat(response.data.messages);
      }
      
      if (response.data && response.data.nextPageToken) {
        spinner.text = "Reading page: " + ++pageCounter;
        resolve(getListOfMailIdByLabel(auth, labelId, maxResults, response.data.nextPageToken));
      } else {
        resolve(messageIds);
      }
    });
  });
}

function getAllMails(auth, maxResults = 500, nextPageToken) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.list({
      auth: auth,
      userId: 'me',
      maxResults: maxResults,
      pageToken: nextPageToken
    }, (err, response) => {
      if (err) {
        logger.error('The API returned an error: ' + err);
        reject(err);
        return;
      }
      
      if (response.data && response.data.messages) {
        messageIds = messageIds.concat(response.data.messages);
      }
      
      if (response.data && response.data.nextPageToken) {
        spinner.text = "Reading page: " + ++pageCounter;
        resolve(getAllMails(auth, 500, response.data.nextPageToken));
      } else {
        spinner.text = "All pages are read";
        resolve(messageIds);
      }
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
    }, (err, response) => {
      if (err) {
        logger.error('The API returned an error: ' + err);
        reject(err);
        return;
      }
      resolve(response.data.messages || []);
    });
  });
}

async function fetchMailsByMailIds(auth, mailList) {
  let results = [];
  let promises = [];
  let counter = 0;
  let processed = 0;
  
  spinner.text = "Fetching each mail";
  
  for (const mail of mailList) {
    if (mail) {
      promises.push(getMail(auth, mail.id));
      counter++;
      processed++;
      
      if (counter === 100) {
        const mails = await Promise.all(promises);
        results = results.concat(mails);
        promises = [];
        counter = 0;
        spinner.text = processed + " mails fetched";
        await sleep(3000);
      }
    }
  }
  
  const mails = await Promise.all(promises);
  results = results.concat(mails);
  return results;
}

function sleep(ms) {
  spinner.text = `sleeping for ${ms/1000} s`;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMail(auth, mailId) {
  return new Promise((resolve, reject) => {
    gmail.users.messages.get({
      userId: 'me',
      id: mailId,
      auth,
    }, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}
