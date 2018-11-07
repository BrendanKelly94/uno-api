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
    const id = await queries.createGame({botFill: botFill});
    if(botFill){
      const bots = await queries.fillBots({gameId: id[0]});
    }
    const x = await queries.generateDeck({gameId: id[0]});
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
    const game = await queries.findGame({gameId: gameId});
    //if game is full check if there are bots
    //if so replace a bot with a player
    if(game[0].player_count === 6 && game[0].bot_fill === true){
      const players = await queries.getPlayers({gameId: gameId});
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
        const x = await queries.replacePlayer({playerId: randomPlayer.id, name: name});
        if(allbots){
          const x = await queries.setHost({name: name})
        }
      }else{        //if no available spot
        res.send({err: 'Game is full'})
      }
      res.send({id: randomPlayer.id})

    }else{
      const playerId = await queries.addPlayer({gameId: gameId, name: name});
      const x = await queries.generateHand({gameId: gameId, playerId: playerId[0]});
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
    const host = await queries.findPlayer({name: name});
    if(host[0].is_host){
      const x = await queries.setFirstCardInPlay({gameId: gameId});
      const players = await queries.getPlayers({gameId: gameId});
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      const setTurn = await queries.setTurn({gameId: gameId, playerId: randomPlayer.id});
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
    const options = await getCardOptions({gameId: gameId, playerId: playerId});
    const player = await queries.getPlayer({playerId: playerId});
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
    const nextTurnId = await submitCard({gameId: gameId, playerId: playerId, card: card});
    const nextPlayer = await queries.getPlayer({playerId: nextTurnId});
    gameIo.to(gameId).emit('newTurn', {currTurn: nextTurnId, lastTurn: playerId, card: {value: card.value, color: card.color}});
    if(nextPlayer[0].is_bot){
      await submitBotTurn({gameId: gameId, playerId: nextTurnId});
      const game = await queries.findGame({gameId: gameId});
      res.send({id: game[0].turn_id})
    }else{
      res.send({id: nextTurnId});
    }
  }catch(e){
    res.send({err: e});
  }
});

router.get('/game/:id/drawCard/:playerId', async (req, res, next) => {
  const gameId = parseInt(req.params['id'], 10);
  const playerId = parseInt(req.params['playerId'], 10);
  try{
    const drawCardId = await queries.drawCard({gameId: gameId, playerId: playerId});
    const drawCard = await queries.getCard({cardId: drawCardId[0]});
    const nextTurn = await queries.nextTurn({gameId: gameId, isSkip: false});
    res.send({card: {value: drawCard.value, color: drawCard.color}});
  }catch(e){
    res.send({err: e});
  }
})

const submitCard = async ({gameId, playerId, card}) => {
  let nextTurn;
  try{
    if(card.value > 9){
      switch(card.value){
        case 10: //switch direction
          await queries.flipDirection({gameId: gameId});
          await queries.setCardInPlay({gameId: gameId, playerId: playerId, card: card})
          nextTurn = await queries.nextTurn({gameId: gameId, isSkip: false});
          break;
        case 11: //skip
          await queries.setCardInPlay({gameId: gameId, playerId: playerId, card: card});
          nextTurn = await queries.nextTurn({gameId: gameId, isSkip: true})
          break;
        case 12: //give 2
          await queries.giveCards({gameId: gameId, num: 2});
          await queries.setCardInPlay({gameId: gameId, playerId: playerId, card: card})
          nextTurn = await queries.nextTurn({gameId: gameId, isSkip: false});
          break;
        case 13: // wild card
          //color selection will happen on front end
          await queries.setCardInPlay({gameId: gameId, playerId: playerId, card: card})
          nextTurn = await queries.nextTurn({gameId: gameId, isSkip: false});
          break;
        case 14: // wild card give 4
          await queries.giveCards({gameId: gameId, num: 4});
          await queries.setCardInPlay({gameId: gameId, playerId: playerId, card: card})
          nextTurn = await queries.nextTurn({gameId: gameId, isSkip: false});
          break;
      }
      return nextTurn;

    }else{
      await queries.setCardInPlay({gameId: gameId, playerId: playerId, card: card})
      nextTurn = await queries.nextTurn({gameId: gameId, isSkip: false});
      return nextTurn;
    }
  }catch(e){
    console.log(e)
    throw new Error(e);
  }

}

const submitBotTurn = async ({gameId, playerId}) => {
  try{
    const options = await getCardOptions({gameId: gameId, playerId: playerId});
    if(options.length > 0){
      const random = options[Math.floor(Math.random() * options.length)];
      const nextTurn = await submitCard({gameId: gameId, playerId: playerId, card: random});
      gameIo.to(gameId).emit('newTurn', {currTurn: nextTurn, lastTurn: playerId, card: {value: random.value, color: random.color}});
      const nextPlayer = await queries.getPlayer({playerId: nextTurn});
      if(nextPlayer[0].is_bot){
        await submitBotTurn({gameId: gameId, playerId: nextTurn});
        return;
      }else{
        return;
      }
    }else{
      const drawCardId = await queries.drawCard({gameId: gameId, playerId: playerId});
      const newOptions = await getCardOptions({gameId: gameId, playerId: playerId})
      if(newOptions.length > 0){
        await submitBotTurn({gameId: gameId, playerId: playerId})
      }else{
        const nextTurn = queries.nextTurn({gameId: gameId, isSkip: false});
      }
    }

  }catch(e){
    throw new Error(e);
  }


}

const getCardOptions = async ({gameId, playerId}) =>{
  try{
    const cardInPlay = await queries.getCardInPlay({gameId: gameId});
    const hand = await queries.getHand({playerId: playerId});
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
