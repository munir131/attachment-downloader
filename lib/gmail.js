/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
let counter = 0;

 module.exports.listLabels = function (auth, gmail) {
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
const getMail = function (gmail, auth, mailId) {

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

module.exports.getMail = getMail

module.exports.fetchMailsByMailIds = async function (gmail, auth, spinner, mailList) {
    let results = [];
    let promises = [];
    let processed = 0;
    spinner.text = "Fetching each mail"
    for (index in mailList) {
      if (mailList[index]) {
          promises.push(getMail(gmail, auth, mailList[index].id));
        counter++;
        processed++;
        if (counter === 100) {
          mails = await Promise.all(promises);
          results = results.concat(mails)
          promises = [];
          counter = 0;
          spinner.text = processed + " mails fetched"
        }
      }
    };
    mails = await Promise.all(promises);
    results = results.concat(mails)
    return results;
  }

module.exports.getListOfMailIdByFromId =  function (auth, mailId, maxResults = 500) {
    return new Promise((resolve, reject) => {
      gmail.users.messages.list({
        auth: auth,
        userId: 'me',
        q: 'from:' + mailId,
        maxResults: maxResults
      }, function (err, response) {
        if (err) {
          console.log('The API returned an error: ' + err);
          reject(err);
        }
        resolve(response.data.messages);
      });
    });
  }
