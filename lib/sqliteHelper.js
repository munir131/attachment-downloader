const sqlite3 = require('sqlite3').verbose();

module.exports.getDBConn = function () {
  return new sqlite3.Database('./db/gmail.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error(err.stack);
    }
    console.log('Connected to the gmail database.');
  });
}
