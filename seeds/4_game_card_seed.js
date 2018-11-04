const queries = require('../db/queries.js');

exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex('GameCards').del()
    .then(async function() {
      // Inserts seed entries
      try{
        await queries.generateDeck(1);
        await queries.generateDeck(2);
        for(let id = 1; id< 4; id++){
            await queries.generateHand(1, id);
        }
        for(let id = 4; id < 10; id++){
            await queries.generateHand(2, id);
        }
        await queries.setFirstCardInPlay(1);
        await queries.setFirstCardInPlay(2);
      }catch(e){
        console.log(e);
      }

    });
};
