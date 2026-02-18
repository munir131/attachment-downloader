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
            type: 'checkbox',
            name: 'options',
            message: 'How do you like to filter (Press <space> to select, <enter> to confirm)',
            choices: [
                { name: 'Using from email Id', value: 'from' },
                { name: 'Using label', value: 'label' },
                { name: 'Date range (before/after)', value: 'date' }
            ]
        }
    ])
        .then(answers => answers.options);
}

export function askForDate(type) {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'date',
            message: `Enter ${type} date (YYYY/MM/DD) [Leave empty to skip]:`,
            validate: function(value) {
                if (!value) return true;
                if (value.match(/^\d{4}\/\d{2}\/\d{2}$/)) return true;
                return 'Please enter a valid date in YYYY/MM/DD format';
            }
        }
    ]).then(answers => answers.date);
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
