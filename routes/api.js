module.exports = function(io){

const express = require('express');
const gameIo = io.of('/game');
const router = express.Router();
const queries = require('../db/queries.js');

//retrieve games
router.get('/games', async (req, res, next) => {
  try{
    const games = await queries.getGames();
    res.send({games: games});
  }catch(e){
    res.send({error: e});
  }
});

//create game
router.post('/newGame', async (req, res, next) => {
  const botFill = req.body.botFill;
  try{
    const id = await queries.createGame(botFill);
    if(botFill){
      const bots = await queries.fillBots(id[0]);
    }
    const x = await queries.generateDeck(id[0]);
    res.send({id: id[0]});
  }catch(e){
    res.send({err: e})
  }
});

//join game
router.post('/game/:id', async (req, res, next) => {
  const gameId = parseInt(req.params['id'],10);
  const name = req.body.name;
  try{
    const game = await queries.findGame(gameId);
    //if game is full check check if there are bots
    //if so replace a bot with a player
    if(game[0].player_count === 6 && game[0].bot_fill === true){
      const players = await queries.getPlayers(gameId);
      let found = false;
      let allbots = true;
      let randomPlayer;
      for(let i = 0; i < 6; i++){
        randomPlayer = players[Math.floor(Math.random() * players.length)];
        if(randomPlayer.is_bot){
          found = true;
        }else{
          allbots = false;
        }
      }
      if(found){
        const x = await queries.replacePlayer(randomPlayer.id, name);
        if(allbots){
          const x = await queries.setHost(name)
        }
      }else{        //if no available spot
        res.send({err: 'Game is full'})
      }
      res.send({id: randomPlayer.id})

    }else{
      const playerId = await queries.addPlayer(gameId, name);
      const x = await queries.generateHand(gameId, playerId[0]);
      res.send({id: playerId[0]})
    }

  }catch(e){
    console.log(e)
    res.send({err: e})
  }
});

// start game
router.post('/game/:id/start', async (req, res, next) => {
  const gameId = parseInt(req.params['id'], 10);
  const name = req.body.name;
  try{
    const host = await queries.findPlayer(name);
    if(host[0].is_host){
      const x = await queries.setFirstCardInPlay(gameId);
      const players = await queries.getPlayers(gameId);
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      const setTurn = await queries.setTurn(gameId, randomPlayer.id);
      gameIo.to(gameId).emit('newTurn', {id: randomPlayer.id}); //will let players know a new card is in play
      res.send({id:randomPlayer.id})
    }else{
      res.send({err: 'You are not the host'});
    }
  }catch(e){
    console.log(e);
    res.send({err: e});
  }
});

router.get('/game/:id/getHandOptions/:playerId', async (req, res, next) => {
  const gameId = parseInt(req.params['id'], 10);
  const playerId = parseInt(req.params['playerId'], 10);
  try{
    const options = await getCardOptions(gameId, playerId);
    const player = await queries.getPlayer(playerId);
    if(player[0].is_bot){
      //call submit cards
      res.send({options: options});
    }else{
      res.send({options: options});
    }
  }catch(e){
    console.log(e);
    res.send({err: e})
  }
});

router.post('/game/:id/submitCard/:playerId', async (req, res, next) => {
  const gameId = parseInt(req.params['id'], 10);
  const playerId = parseInt(req.params['playerId'], 10);
  const card = req.body.card;
  try{
    const nextTurnId = await submitCard(gameId, playerId, card);
    res.send({id: nextTurnId});
    gameIo.to(gameId).emit('newTurn', {currTurn: nextTurnId, lastTurn: playerId})
  }catch(e){
    res.send({err: e});
  }
})

const submitCard = async (gameId, playerId, card) => {
  let nextTurn;
  try{
    if(card.value > 9){
      switch(card.value){
        case 10: //switch direction
          await queries.flipDirection(gameId);
          await queries.setCardInPlay(gameId, playerId, card)
          nextTurn = await queries.nextTurn(gameId, false);
          break;
        case 11: //skip
          await queries.setCardInPlay(gameId, playerId, card);
          nextTurn = await queries.nextTurn(gameId, true)
          break;
        case 12: //give 2
          await queries.giveCards(gameId, 2);
          await queries.setCardInPlay(gameId, playerId, card)
          nextTurn = await queries.nextTurn(gameId, false);
          break;
        case 13: // wild card
          //color selection will happen on front end
          await queries.setCardInPlay(gameId, playerId, card)
          nextTurn = await queries.nextTurn(gameId,false);
          break;
        case 14: // wild card give 4
          await queries.giveCards(gameId, 4);
          await queries.setCardInPlay(gameId, playerId, card)
          nextTurn = await queries.nextTurn(gameId, false);
          break;
      }
      return nextTurn;

    }else if(card.value === -1){
      const drawCardId = await queries.drawCard(gameId, playerId);
      const drawCard = await queries.getCard(drawCardId[0]);
      const newOptions = await getCardOptions(gameId, playerId);
      const i = newOptions.findIndex(x => x.id === drawCardId[0])
      if(i != -1){
        submitCard(drawCard[0]);
      }else{
        nextTurn = await queries.nextTurn(gameId, false);
        return nextTurn;
      }
    }else{
      await queries.setCardInPlay(gameId, playerId, card)
      nextTurn = await queries.nextTurn(gameId, false);
      return nextTurn;
    }
  }catch(e){
    console.log(e)
    throw new Error(e);
  }

}

const getCardOptions = async (gameId, playerId) =>{
  try{
    const cardInPlay = await queries.getCardInPlay(gameId);
    const hand = await queries.getHand(playerId);
    const options = hand.filter(card => {
      if(card.value > 12){
        return true;
      }else if(card.color === cardInPlay[0].color){
        return true;
      }else if(card.value === cardInPlay[0]. value){
        return true;
      }else{
        return false;
      }
    });
    return options
  }catch(e){
    console.log(e);
    return false;
  }
}

gameIo.on('connection', (socket) => {
  socket.on('join', (data) => {
    socket.join(data.gameId);
    gameIo.to(data.gameId).emit('joined', { gameId: data.gameId });
  });

});


return router;
}
