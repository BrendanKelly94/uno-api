module.exports = function(io){

const express = require('express');
const gameIo = io.of('/game');
const router = express.Router();
const queries = require('../db/queries.js');

//retrieve games
router.get('/games', async (req, res, next) => {
  try{
    const games = await queries.getGames();
    res.send(games);
  }catch(e){
    res.send(e);
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
      let allbots = false;
      let randomPlayer;
      for(let i = 0; i < 6; i++){
        randomPlayer = players[Math.floor(Math.random() * players.length)];
        if(randomPlayer.is_bot === true){
          found = true;
        }else{
          allbots = true;
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

//start game
router.post('/game/:id/start', async (req, res, next) => {
  const gameId = parseInt(req.params['id'], 10);
  const name = req.body.name;
  try{
    const host = await queries.findPlayer(name);
    if(host.is_host === 'true'){
      const x = await queries.setCardInPlay(gameId);
      const players = await queries.getPlayers(gameId);
      const randomPlayer = players[Math.random() * players.length]
      const setTurn = await queries.setTurn(gameId, randomPlayer.id);
      gameIo.to(gameId).emit('newTurn', {turn_id: randomPlayer.id})
    }else{
      res.send({err: 'You are not the host'});
    }
  }catch(e){
    res.send({err: e});
  }
})

gameIo.on('connection', (socket) => {
  socket.on('join', (data) => {
    socket.join(data.gameId);
    gameIo.to(data.gameId).emit('joined', { gameId: data.gameId });
  });

});


return router;
}
