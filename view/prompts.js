import inquirer from 'inquirer';
import _ from 'lodash';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function askForFilter(labels) {
    return inquirer.prompt([
        {
            type: 'select',
            name: 'option',
            message: 'How do you like to filter',
            choices: [
                { name: 'Using from email Id', value: 'from' },
                { name: 'Using label', value: 'label' },
                { name: 'All', value: 'all' }
            ]
        }
    ])
        .then(answers => answers.option);
}

export function askForMail() {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'from',
            message: 'Enter from mailId:'
        }
    ])
        .then(answers => answers.from);
}

export function askForLabel(labels) {
    return inquirer.prompt([
      {
        type: 'select',
        name: 'label',
        message: 'Choose label for filter mails:',
        choices: _.map(labels, l => ({ name: l.name, value: l }))
      }
    ])
      .then(answers => answers.label);
}

export function askForDirectory() {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'directory',
            message: 'Where do you want to store the attachments?',
            default: path.resolve(__dirname, '..', 'files')
        }
    ]).then(answers => answers.directory);
}
