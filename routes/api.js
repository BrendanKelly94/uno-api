module.exports = function(io){

  const express = require('express');
  const models = require('../models');
  const Cards = require('../cards.js');
  const gameIO = io.of('/game');
  const db = require('../db');
  const router = express.Router();

  /* get list of games possibly for a lobby page*/
  router.get('/games', async (req, res, next) => {
    try{
      const games = await db.any('SELECT id, has_started, player_count FROM "Games" WHERE has_started="false"')
    }
    catch(e){
      console.log(e);
    }
    res.send({games: games});
  });

  /* fetch a game for "matchmaking" */
  router.get('/game', async (req, res, next) => {
    try{
      const game = await db.one('SELECT MAX(player_count), id FROM "Games" WHERE has_started="false"');
    }catch(e){
      console.log(e);
    }
    res.send({game: game});
  });

  /* fetch players in game */
  router.get('/game/:gameId/players', async (req, res) => {
    let joinQuery = 'SELECT "Players".id, "Users".name FROM ';
    joinQuery += '"Players" INNER JOIN "Users" ON "Players".user_id = "Users".id ';
    joinQuery += 'ORDER BY "Players".id DESC';

    const players = await db.any(joinQuery);
    res.send({players: players});
  });

  /* fetch player's cards */
  router.get('game/player/:playerId/hand', async (req, res) => {
    const playerId = parseInt(req.params['playerId'], 10);

    try{
      const hand = await db.any(`SELECT FROM id, color, value FROM "GameCards" WHERE player_id=${playerId}`);
    }catch(e){
      console.log(e);
    }
    res.send({hand: hand});
  });

  /* join game */
  router.post('/game/:id', async (req, res, next) => {
    const gameId = parseInt(req.params['id'],10);
    const userId = parseInt(req.body['userId'],10);

    let playerQuery = 'INSERT INTO "Players"';
    playerQuery += '(game_id, user_id) VALUES'
    playerQuery += `(${gameId} , ${userId}) RETURNING id`;

    try{
      const playerId = await db.none(playerQuery);
    }catch(e){
      console.log(e);
    }
    generateHand(playerId, gameId);
    res.send({playerId:playerId});
  });

  /* create game */
  router.post('/game/new', async (req, res) => {
    try{
      const id = await db.none('INSERT INTO "Games" RETURNING id');
    }catch(e){
      console.log("failed to create game");
    }
    generateDeck(id);
    res.send();
  });

  /* start a game */
  router.post('/game/:gameId/start', (req, res) => {
    const gameId = parseInt(req.params['gameId'],10);
    gameIO.to(gameId).emit("newTurn", {turnId: 0});

  });
  /* end a game */
  router.post('/game/:gameId/end' , (req, res) => {
    const gameId = parseInt(req.params['gameId'], 10);
    db.none(`DELETE FROM "Games" WHERE id=${gameId}`);
  });

  router.get('/game/:gameId/getHandOptions/:playerId', async (req, res) => {
    const gameId = parseInt(req.params['gameId'], 10);
    const playerId = parseInt(req.params['playerId'], 10);

    try{
      const isBot = await db.one(`SELECT is_bot FROM "Players" WHERE player_id=${playerId}`)
      const playerCards = await db.any('SELECT * FROM "GameCards" WHERE player_id =' + playerId);
      const cardInPlay = await db.one(`SELECT * FROM "GameCards" WHERE is_in_play="true" AND game_id=${gameId}`);
    }catch(e){
      console.log(e);
    }

    let options = playerCards.filter(card => {
      isOption(card);
    });
    if(isBot){
      const random = Math.floor(Math.random() * playerCards.length);
      nextTurn(gameId, playerId, options[random]);
      res.send();
    }else{
      res.send(options);
    }
  });

  function generateDeck(gameId){
    cardQuery = 'INSERT INTO "GameCards" (is_available, player_id ,game_id , value, color) VALUES'
    Cards.forEach(card => {
      cardQuery += `('true' , 'null' , ${gameId}, ${card.value} , ${card.color})`;
    });

    db.none(cardQuery)
    .catch(err => console.log(err));
  }

  /* selects cards from game's deck and assigns them to player*/
  async function generateHand(playerId, gameId){

    let gCardQuery = 'SELECT * FROM "GameCards" WHERE '
    gCardQuery += `gameId=${gameId} AND is_available = "true"`;

    try{
      let cards = await db.any(gCardQuery);
    }catch(e){
      console.log(e);
    }

    let random;
    let length = 7;
    let updateQuery = 'UPDATE "GameCards"';
    updateQuery += `SET player_id = ${playerId}, is_available = "false" WHERE id IN (`;

    //build query to update 7 random cards from deck and assign hand id
    for(let i = 0; i < length; i++){
      random = Math.floor(Math.random() * cards.length);
      if(cards[random] === null){
        length++;
        continue;
      }else{
        updateQuery += `${cards[random].id},`;
        cards[random] = null;
      }
    }
    updateQuery.slice(0, updateQuery.length - 1);
    updateQuery += ')';

    db.none(updateQuery)
    .catch(e => console.log(e));
  }


  async function nextTurn(gameId, playerId, card){

    if(card.id != -1){
      if(card.value > 9){
        cardAction(card, gameId);
      }

      let cardInPlayQuery = 'UPDATE "GameCards" SET is_available = "true",';
      cardInPlayQuery += 'is_in_play = "false" WHERE is_in_play="true"';

      let newCardQuery = 'UPDATE "GameCards" SET is_in_play = "true",';
      newCardQuery += `is_available= "false"WHERE id=${card.id}`;

      db.none(cardInPlayQuery).catch(e => console.log(e));
      db.none(newCardQuery).catch(e => console.log(e));

    }else{
      //if client doesn't have any card options draw one
      const newCard = getNewCards(1,gameId, playerId)[0];
      db.none(`UPDATE "GameCards" SET is_available="false", player_id=${playerId} WHERE id =${newCardId}`)
      .catch(e => console.log(e));
      //if new card is option repeat process in above if block
      if(isOption(newCard)){
        nextTurn(gameId, playerId, newCard);
      }
    }

    const newTurnId = getNextTurn(gameId);
    db.none(`UPDATE "Games" SET turn_id=${newTurnId} WHERE id=${gameId}`).catch(e => console.log(e));

    //notify clients of new card
    gameIO.to(gameId).emit('turnComplete' , {card: card});
    //client checks if this value is equal to their own
    gameIO.to(gameId).emit('newTurn', {turnId: newTurnId});
  }

  async function getNextTurn(game){
    try{
      const curGame = await db.one(`SELECT turn_id, direction, playerCount FROM "Games" WHERE id=${gameId}`);
    }catch(e){
      console.log(e);
    }

    let newId;
    if(curGame.direction){
      newId = (curGame.turnId + 1) % curGame.playerCount;
    }else{
      if(curGame.turn_id == (curGame.playerCount - 1)){
        newId = 0;
      }
    }
    return newId;

  }

  async function getNewCards(num,gameId){
    const cards = db.any(`SELECT * FROM "GameCards" WHERE game_id=${gameId} AND is_available='true'`);
    const newCards = [];
    let random;
    let length = num;
    for(let i = 0; i < length; i++){
      if(cards[random] === null){
        length++;
        continue;
      }else{
        random = Math.floor(Math.random() * cards.length);
        newCards.push(cards[random]);
        cards[random] = null;
      }
    }
    return newCards;
  }

  function isOption(card){
    if(card.color === cardInPlay.color){
      return true;
    }else if(card.value === cardInPlay.value){
      return true;
    }else if(card.value > 11){
      return true;
    }else{
      return false;
    }
  }

  async function cardAction(card,gameId){
    try{
      const game = await db.one(`SELECT * FROM "Games" WHERE id=${gameId}`);
    }catch(e){
      console.log(e);
    }

    switch(card.value){
      case 10:
        const newDirection = !game.direction;
        db.none(`UPDATE "Game" SET direction=${newDirection}`);
        break;
      case 11:
        giveCards(2, game);
        break;
      case 12:
        giveCards(4, game);
        break;
      case 13:

        break;
    }
  }

  async function giveCards(num, game){
    const newCards = getNewCards(num, game.id);
    const nextTurn = getNextTurn(game);

    let updateQuery = `UPDATE "GameCards" SET player_id=${nextTurn}, is_available="false"`;
    updateQuery += `WHERE id IN (`;
    for(let i =0; i < newCards.length; i++){
      updateQuery += `${newCards[i].id},`
    }
    updateQuery.slice(0,updateQuery.length - 1);
    db.none(updateQuery).catch(e => console.log(e));

    gameIO.to(game.id).emit('cardsGiven', {id: nextTurn});
  }

  gameIO.on('connection', (socket) => {

    socket.on('join', (data) => {
        socket.join(data.roomNo);
        gameIO.to(data.roomNo).emit('joined', { gameId: data.roomNo });
      });

      socket.on('myTurn', (data) => {
        getHandOptions(data.gameId, data.playerId, socket);
      });

      socket.on('submitCard', (data) => {
        nextTurn(data.gameId, data.playerId, data.card);
      });

  });



  return router;
}
