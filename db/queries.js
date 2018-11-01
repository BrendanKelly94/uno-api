const knex = require('./knex.js');

//Users

const addUser = async (name, pwd) => {
  return knex('Users').insert({name: name, pwd: pwd});
}

const getUsers = () => {
    return knex('Users').select();
}

const findUser = (name) => {
    return knex('Users').where({name: name}).select();
}


//Games

const getGames = () => {
  return knex('Games').select();
}

const findGame = (id) => {
  return knex('Games')
         .where('id', id)
         .select();
}

const createGame = async (botFill) => {
    return knex('Games')
    .insert({bot_fill: botFill})
    .returning('id')
}

const fillBots = async (gameId) => {
  const players = [
    {game_id: gameId, user_name: 'bot', is_bot: 'true', is_host: 'false'},
    {game_id: gameId, user_name: 'bot', is_bot: 'true', is_host: 'false'},
    {game_id: gameId, user_name: 'bot', is_bot: 'true', is_host: 'false'},
    {game_id: gameId, user_name: 'bot', is_bot: 'true', is_host: 'false'},
    {game_id: gameId, user_name: 'bot', is_bot: 'true', is_host: 'false'},
    {game_id: gameId, user_name: 'bot', is_bot: 'true', is_host: 'false'}
  ];
  try{
    const x = await updatePlayerCount(gameId, 6);
  }catch(e){
    console.log(e);
  }
  return knex('Players')
         .where('game_id', gameId)
         .insert(players);
}

const setHost = async (name) => {
  return knex('Players')
         .where('user_name', name)
         .update('is_host', true)
}

const setTurn = (gameId, playerId) => {
  return knex('Games')
         .where('id', gameId)
         .update('turn_id', playerId);
}


//Players

const addPlayer = async (gameId, name) => {
  let game;
  try{
    game = await findGame(gameId);
    const x = await updatePlayerCount(gameId, 1)
  }catch(e){
    console.log(e)
  }

  return knex('Players')
         .insert({
           game_id: gameId,
           user_name: name,
           is_bot: 'false',
           is_host: (game[0].player_count === 0)? true: false
         })
         .returning('id')
}

const updatePlayerCount = async (gameId, num) => {
    let game;
    try{
      game = await findGame(gameId);
    }catch(e){
      console.log(e);
    }
    return knex('Games')
           .where('id', gameId)
           .update({
             player_count: game[0].player_count + num
           })
}

const replacePlayer = async (id, name) => {
  return knex('Players')
         .where('id', id)
         .update({
           user_name: name,
           is_bot: (name === 'bot')? true: false,
         })
}

const getPlayers = (gameId) => {
  return knex('Players')
         .where('game_id', gameId)
         .orderBy('id', 'desc')
         .select();

}

const findPlayer = (name) => {
  return knex('Players')
         .where({user_name: name})
         .select()
}


//GameCards

const getDeck = (id) => {
  return knex('GameCards')
         .where({game_id: id})
         .select();
}

const getHand = (id) => {
  return knex('GameCards')
         .where({player_id: id})
         .select();
}

const setCardInPlay = async (gameId) => {
  try{
    const deck = await getDeck(gameId);
    let found = false;
    let random;
    while(!found){
      random = deck[Math.floor(Math.random() * deck.length)];
      if(random.is_available === true) found = true;
    }
    return knex('GameCards')
           .where('id', random.id)
           .update({
             is_available: false,
             is_in_play: true
           });

  }catch(e){
    console.log(e);
  }
}

const getCardInPlay = () => {
  return knex('GameCards')
         .where('is_in_play', true)
         .insert();
}

const generateDeck = async (id) => {
  const cards = [];
  const colors = ['red', 'blue', 'yellow', 'green'];
  let colorI = 0;
  for(let i = 0; i < 52; i++){
    if(i % 13 === 0 && i !== 0 ){
      colorI++;
    }
    cards.push({
      game_id: id,
      color: colors[colorI],
      value: (i % 13) + 1,
      is_in_play: false,
      is_available: true
    })
  }
  return knex('GameCards').insert(cards);
}

const generateHand = async (gameId, playerId) => {
  try{
    const deck = await getDeck(gameId);
    const hand = [];
    let randomItem;
    while(hand.length !== 7){
      randomItem = deck[Math.floor(Math.random() * deck.length)];
      if(randomItem.is_available === true){
        hand.push(randomItem.id);
        randomItem.is_available = false; //to ensure no repeats; safe b/c not used later
      }
    }
    return knex('GameCards')
           .whereIn('id', hand)
           .update({
             player_id: playerId,
             is_available: false
           });

  }catch(e){
    console.log(e);
  }
}

module.exports = {
  addUser: addUser,
  getUsers: getUsers,
  findUser: findUser,
  getGames: getGames,
  findGame: findGame,
  createGame: createGame,
  fillBots: fillBots,
  setHost: setHost,
  setTurn: setTurn,
  addPlayer: addPlayer,
  updatePlayerCount: updatePlayerCount,
  replacePlayer: replacePlayer,
  getPlayers: getPlayers,
  findPlayer: findPlayer,
  getDeck: getDeck,
  getHand: getHand,
  setCardInPlay: setCardInPlay,
  getCardInPlay: getCardInPlay,
  generateDeck: generateDeck,
  generateHand: generateHand
}
