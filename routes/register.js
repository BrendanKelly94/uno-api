const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const queries = require('../db/queries');
const knex = require('../db/knex.js');

/* GET home page. */
router.post('/', (req, res, next) => {
  const name = req.body.name;
  const pwd = req.body.pwd;

  if(name !== 'bot'){
    bcrypt.hash(pwd, 1, async (err, hash) => {
      const result = await queries.addUser(name, hash);
      res.json(result);
    })
  }else{
    res.json({err: 'username bot is not valid'});
  }

});

module.exports = router;
