const pgp = require('pg-promise')();

const connection = pgp('postgres://127.0.0.1:5432/unodev');


module.exports = connection;
