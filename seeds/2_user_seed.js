const bcrypt = require('bcrypt');

//name all passwords test for simplicity when testing
const users = [
  {name: 'bot', pwd: 'bot'},
  {name: 'brendan', pwd: 'test'}, //used for setting up game without bots
  {name: 'brendan1', pwd: 'test'}, // ""
  {name: 'brendan2', pwd: 'test'}, // ""
  {name: 'bren', pwd: 'test'},  //used for setting up game with bots
  {name: 'bren1', pwd: 'test'}, //used for testing join game endpoints
  {name: 'bren2', pwd: 'test'}, //""
  {name: 'bren3', pwd: 'test'} //""
]
exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('Users').del()
    .then(async () => {
      // Inserts seed entries
      users.map(user => {
        bcrypt.hash(user.pwd, 1, (err, hash) => {
          user.pwd = hash;
        })
      })

      try{
        return await knex('Users').insert(users);
      }catch(e){
        console.log(e);
      }


    });
};
