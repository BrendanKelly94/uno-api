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

const setTurn = async (gameId, playerId) => {
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

const getPlayer = (id) => {
  return knex('Players')
         .where('id', id)
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

const setFirstCardInPlay = async (gameId) => {
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

const setCardInPlay = async (gameId, playerId, card) => {
  try{
    const x = await removeCardInPlay(gameId);
  }catch(e){
    throw new Error(e);
  }
  return knex('GameCards')
         .where({
           game_id: gameId,
           player_id: playerId,
           value: card.value,
           color: card.color,
         })
         .update({
           is_available: false,
         })
}

const removeCardInPlay = async (gameId) => {
  return knex('GameCards')
         .where({
           game_id: gameId,
           is_in_play: true
         })
         .update({
           is_in_play: false,
           is_available: true
         });
}

const getCardInPlay = (gameId) => {
  return knex('GameCards')
         .where({
           is_in_play: true,
           game_id: gameId
         })
         .select();
}

const generateDeck = async (id) => {
  const cards = [];
  const colors = ['red', 'blue', 'yellow', 'green'];
  let colorI = 0;
  let val;
  for(let i = 0; i < 4; i++){
    cards.push({
      game_id: id,
      color: colors[i],
      value: 0,
      is_in_play: false,
      is_available: true
    })
  }
  for(let i = 0; i < 104; i++){
    if(i % 13 === 0 && i !== 0 ){
      colorI = (colorI + 1) % 4;
    }
    val = (i % 13) + 1;
    cards.push({
      game_id: id,
      color: colors[colorI],
      value: (val === 13 && i > 52)? 14: val,
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


//submit turn queries


const getNextTurn = async(gameId, currentTurn, isSkip) => {
  try{
    const game = await queries.findGame(gameId);
    const players = await queries.getPlayers(gameId);
    const currIndex = players.findIndex(item => item.id === currentTurn);
    let nextTurn;
    if(isSkip){
      if(game[0].direction){
        nextTurn = players[(tIndex + 2) % players.length];
      }else{
        nextTurn = players[(tIndex - 2 + players.length) % players.length]
      }
    }else{
      if(game[0].direction){
        nextTurn = players[(tIndex + 1) % players.length];
      }else{
        nextTurn = players[(tIndex - 1 + players.length) % players.length]
      }
    }
    return nextTurn;
  }catch(e){
    throw new Error(e);
  }
}

const nextTurn = async (gameId, isSkip) => {
  try{
    const game = await findGame(gameId)
    const nTurn = await getNextTurn(gameId, game[0].turn_id, isSkip);
    const x = await setTurn(gameId, nTurn.id);
    return nTurn.id;
  }catch(e){
    throw new Error(e);
  }
}


const setDirection = async (gameId) => {
  let lastDirection;
  try{
    const game = findGame(gameId);
    lastDirection = game[0].direction
  }catch(e){
    throw new Error(e);
  }
  return knex('Games')
         .where('id', gameId)
         .update({
           direction: !lastDirection
         });
}

const giveCards = async (gameId, num) => {
  try{
    const deck = await getDeck(gameId);
    const game = await findGame(gameId);
    let random;
    let cards = [];
    //generate cards to give
    while(cards.length !== num){
      random = deck[Math.floor(Math.random() * 52)];
      if(random.is_available){
        cards.push(random.id);
        random.is_available = false;
      }
    }
    //find who to give it to
    // let target = game[0].turn_id
    // do{
    //   const nextTurn = await getNextTurn(gameId, target, false);
    //   const nextHand = await getHand(nextTurn.id);
    //   let filterHand = nextHand.filter(item => cardFilter(item));
    //   if(filterHand.length > 0) target = nextTurn.id
    // }while(filterHand.length > 0);


    return knex('GameCards')
           .whereIn('id', cards)
           .update({
             player_id: nextTurn.id
           });

  }catch(e){
    throw new Error(e);
  }
}

const cardFilter = (item) => {
    if(num === 2){
      if(item.value === 13){
        return true;
      }else{
        return false;
      }
    }else{
      if(item.value === 13){
        return true;
      }else{
        return false;
      }
    }
}

const drawCard = async (gameId, playerId) => {
  try{
    const deck = await getDeck(gameId);
    let found = false;
    let random;
    while(!found){
      random = deck[Math.floor(Math.random() * 52)];
      if(random.is_available){
        found = true;
      }
    }
    return knex('GameCards')
           .where('id', random.id)
           .update({
             player_id: playerId
           });

  }catch(e){
    throw new Error(e);
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
  getPlayer: getPlayer,
  findPlayer: findPlayer,
  getDeck: getDeck,
  getHand: getHand,
  setFirstCardInPlay: setFirstCardInPlay,

  getCardInPlay: getCardInPlay,
  generateDeck: generateDeck,
  generateHand: generateHand
}
