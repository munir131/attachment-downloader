module.exports.askForFilter = function (labels) {
    return inquirer.prompt([
        {
            type: 'list',
            name: 'option',
            message: 'How do you like to filter',
            choices: ['Using from email Id', 'Using label', "All"],
            filter: val => {
                if (val === 'Using from email Id') {
                    return 'from';
                } else if (val === 'Using label') {
                    return 'label';
                } else {
                    return 'all'
                }
            }
        }
    ])
        .then(answers => answers.option);
}

module.exports.askForMail = function () {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'from',
            message: 'Enter from mailId:'
        }
    ])
        .then(answers => answers.from);
}

module.exports.askForLabel = function (labels) {
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
