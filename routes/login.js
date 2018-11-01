const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const queries = require('../db/queries');

/* GET home page. */
router.post('/', async (req, res, next) => {
  const name = req.body.name;
  const inputPwd = req.body.pwd;

  if(name !== 'bot'){
    const databasePwd = await queries.findUser(name);
    bcrypt.compare(inputPwd, databasePwd[0].pwd, (err,result,body) => {
      if(result){
        res.json(name);
      }else{
        res.json({err: 'username or password incorrect'});
      }
    });
  }else{
    res.json({err: 'cannot login as bot'})
  }
});

module.exports = router;
