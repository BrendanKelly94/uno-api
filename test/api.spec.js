process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../app');
const knex = require('../db/knex.js');
const queries = require('../db/queries.js');
const io = require('socket.io-client')
const socketUrl = 'http://localhost:3000/game';
const options ={
  // resource: 'game',
  newConnection: true,
  transports: ['websocket']
};

chai.use(chaiHttp);

const asyncHOF = (fn) => {
  return done => {
    fn.call().then(done, err => {
      done(err);
    });
  };
};

describe('API Routes', _ => {

  describe('/api/games', _ => {
    before( async () => {
      try{
        const x = await knex.migrate.rollback();
        const y = await knex.migrate.latest();
        const z = await knex.seed.run();
      }catch(e){
        console.log(e)
      }
    });

    it('should return a list of games for matchmaking' , asyncHOF( async () => {
        const res = await chai.request(server)
        .get('/api/games')
        res.should.have.status(200);
        res.body.should.have.property('games');
    }));
  });

  describe('/api/newGame', _ => {
    /*
      This test creates 2 games with id 3 & 4 and generates a deck
      These games will be used in later tests
    */

    it('should enter game into database', asyncHOF(async () => {
       const res = await chai.request(server)
       .post('/api/newGame')
       .send({botFill: false})
       res.should.have.status(200);
       res.body.should.have.property('id');
    }));

    it('should generate a game deck', asyncHOF(async () => {
        const res = await chai.request(server)
        .post('/api/newGame')
        .send({botFill: true})

        const deck = await queries.getDeck(res.body.id);
        deck.should.be.a('array');
        deck.should.have.length(108);
    }));

    it('should fill with bots if botfill is set to true', asyncHOF(async () => {
      const gameId = 2;
      const players = await queries.getPlayers(gameId);
      players.should.have.length(6);
    }))
  });

  describe('/api/game/:id', _ => {

    beforeEach(async () => {
      try{
        await knex.migrate.rollback();
        await knex.migrate.latest();
        await knex.seed.run();
      }catch(e){
        console.log(e)
      }
    })


    it('sends a socket join event upon joining', asyncHOF(async () => {
      const name = 'test';
      const gameId = 1;
      const socket = io.connect(socketUrl, options);
      let id;

      socket.on('joined', (data) => {
        data.gameId.should.equal(gameId)
        socket.disconnect();
      });

      const res = await chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})
      socket.emit('join', {gameId: gameId});
      res.should.have.status(200)

    }));

    it('should let a user join game without bots', asyncHOF(async () => {
      const name = 'test';
      const gameId = 1;
      const res = await chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})

      const player = await queries.findPlayer(name);
      res.should.have.status(200);
      player[0].user_name.should.equal(name);
      player[0].game_id.should.equal(gameId);
    }));

    it('should let a user join game with bots', asyncHOF(async () => {
      const name = 'test';
      const gameId = 2;
      const res = await chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})

      const player = await queries.findPlayer(name);
      const game = await queries.findGame(gameId);
      player[0].user_name.should.equal(name);
      player[0].game_id.should.equal(gameId);
      game[0].player_count.should.equal(6);
      res.should.have.status(200);
    }))

    it('should generate player hand', asyncHOF(async () => {
      const name = 'test';
      const gameId = 1;
      const res = await chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})

      const player = await queries.findPlayer(name);
      const hand = await queries.getHand(player[0].id);
      res.should.have.status(200);
      hand.should.be.a('array');
      hand.should.have.length(7);
  }));
});


  describe('/api/game/:gameId/start', _ => {


    beforeEach(async () => {
      try{
        await knex.migrate.rollback();
        await knex.migrate.latest();
        await knex.seed.run();
      }catch(e){
        console.log(e)
      }
    })

    it('should send a newTurn event with first turn id', asyncHOF(async () => {
      const name = 'brendan';
      const gameId = 1;
      const socket = io.connect(socketUrl, options);
      socket.emit('join', {gameId: 1})
      socket.on('newTurn', (data) => {
        data.should.have.property('id');
        socket.disconnect();
      })
      const res = await chai.request(server)
      .post(`/api/game/${gameId}/start`)
      .send({name: name})

      res.body.id.should.be.a('number');
      res.should.have.status(200);
    }));

    it('should set card in play', asyncHOF(async () => {
      const gameId = 1;
      const name = 'brendan'
      const res = await chai.request(server)
      .post(`/api/game/${gameId}/start`)
      .send({name: name})

      const card = await queries.getCardInPlay(gameId);
      card[0].is_in_play.should.equal(true);

    }));

  });

  describe('/api/game/:gameId/getHandOptions/:playerId', () => {
    const gameId = 1;
    const name = 'brendan';

    it('will generate a list of possible cards to play for player', asyncHOF(async () => {
      const player = await queries.findPlayer(name);
      const res = await chai.request(server)
      .get(`/api/game/${gameId}/getHandOptions/${player[0].id}`);

      res.should.have.status(200);
      res.body.should.have.property('options');
    }));

    // it('will submit turn if bot', (done) => {
    //   const name = 'bot';
    //   const gameId = 2;
    //   let player
    //   try{
    //     player = await queries.findPlayer(name);
    //   }
    //   const socket = io.connect(socketUrl, options);
    //   socket.emit('join', {gameId: 1});
    //   socket.on('newTurn', (data) => {
    //     data.should.have.property('id');
    //     socket.disconnect();
    //     done();
    //   });
    //   chai.request(server)
    //   .post(`/api/game/${gameId}/getHandOptions/${player[0].id}`)
    //   .end((err, res) => {
    //     res.should.have.status(200);
    //     res.should.have.property('options');
    //   })
    // })
  });

  //
  // //
  // // describe('api/game/:gameId/end', _ => {
  // //   it('will delete game off of database', (done) => {
  // //     chai.request(server)
  // //     .post('api/game/1/end')
  // //     .end((err, res) => {
  // //       res.should.have.status(200);
  // //     })
  // //   });
  // // });
  // //
  //
  //
  //
  // describe('api/game/:gameId/submitCard/:playerId', _ => {
  //
  //   beforeEach(async () => {
  //     try{
  //       await knex.migrate.rollback();
  //       await knex.migrate.latest();
  //       await knex.seed.run();
  //     }catch(e){
  //       console.log(e)
  //     }
  //   })
  //
  //   describe('if special card', _ => {
  //     const gameId = 1;
  //     const socket = io.connect(socketUrl, options);
  //     socket.emit('join', {gameId: gameId});
  //
  //     it('will reverse direction', async (done) => {
  //       let turnId;
  //       let lastDirection;
  //       try{
  //         const game = await queries.findGame(gameId);
  //         turnId = game[0].turn_id;
  //         lastDirection = game[0].direction;
  //       }catch(e){
  //         console.log(e);
  //       }
  //       chai.request(server)
  //       .post(`api/game/${gameId}/submitCard/${turnId}`)
  //       .send({card: {value: 10, color: 'red'}})
  //       .end(async (err, res) => {
  //         let game;
  //         try{
  //           game = await queries.findGame(gameId);
  //         }catch(e){
  //           console.log(e);
  //         }
  //         game[0].direction.should.equal(!lastDirection)
  //         res.should.have.status(200);
  //       })
  //     });
  //     it('will skip turn', async (done) => {
  //       const gameId = 1;
  //       let turnId, direction;
  //       try{
  //         const game = await queries.findGame(gameId);
  //         turnId = game[0].turn_id;
  //         direction = game[0].direction;
  //       }catch(e){
  //         console.log(e);
  //       }
  //       chai.request(server)
  //       .post(`api/game/${gameId}/submitCard/${turnId}`)
  //       .send({value: 11, color: 'red'})
  //       .end(async (err, res) => {
  //         let players, tIndex, nextTurn, currrentTurn;
  //         try{
  //           const game = await queries.findGame(gameId);
  //           currentTurn = game[0].turn_id;
  //           players = await queries.getPlayers(gameId);
  //           tIndex = players.findIndex(item => item.turn_id === turnId);
  //           if(direction){
  //             nextTurn = players[(tIndex + 2) % players.length];
  //           }else{
  //             nextTurn = players[(tIndex - 2 + players.length) % players.length];
  //           }
  //         }catch(e){
  //           console.log(e);
  //         }
  //         res.should.have.status(200);
  //         currentTurn.should.equal(nextTurn);
  //         done();
  //       })
  //     });
  //     it('will change color', async (done) => {
  //       let turnId;
  //       try{
  //         const game = await queries.findGame(gameId);
  //         turnId = game[0].turn_id;
  //       }catch(e){
  //         console.log(e);
  //       }
  //       chai.request(server)
  //       .post(`api/game/${gameId}/submitCard/${turnId}`)
  //       .send({value: 12, color: 'blue'})
  //       .end(async (err, res) => {
  //         let cardInPlay;
  //         try{
  //           cardInPlay = queries.getCardInPlay(gameId);
  //         }catch(e){
  //           console.log(e);
  //         }
  //         res.should.have.status(200);
  //         cardInPlay[0].value.should.equal(12);
  //         done();
  //       })
  //     });
  //     it('will give 2 cards', async (done) => {
  //       let turnId, numOfCards, nextTurn;
  //       try{
  //         const game = await queries.findGame();
  //         const players = await getPlayers();
  //         turnId = game[0].turn_id; //current turn
  //         const tIndex = players.findIndex(item => item.turn_id === turnId); //id of next turn
  //         if(game[0].direction){
  //           nextTurn = players[(tIndex + 1) % players.length];
  //         }else{
  //           nextTurn = players[(tIndex - 1 + players.length) % players.length]
  //         }
  //         const hand = await queries.getHand(nextTurn.id);
  //         numOfCards = hand.length;
  //       }catch(e){
  //         console.log(i);
  //       }
  //       chai.request(server)
  //       .post(`api/game/${gameId}/getHandOptions/${turnId}`)
  //       .send({value: 13, color: 'blue'})
  //       .end(async (err, res) => {
  //         let newNumOfCards;
  //         try{
  //           const game = await queries.findGame(gameId);
  //           const hand = await queries.getHand(nextTurn.id);
  //           newNumOfCards = hand.length;
  //         }catch(e){
  //           console.log(e);
  //         }
  //         newNumOfCards.should.equal(numOfCards + 2);
  //         res.should.have.status(200);
  //         done();
  //       })
  //     });
  //     it('will give 4 cards', async (done) => {
  //       let turnId, numOfCards, nextTurn;
  //       try{
  //         const game = await queries.findGame();
  //         const players = await getPlayers();
  //         turnId = game[0].turn_id; //current turn
  //         nextTurn = await queries.getNextTurn();
  //         const hand = await queries.getHand(nextTurn.id);
  //         numOfCards = hand.length;
  //       }catch(e){
  //         console.log(i);
  //       }
  //       chai.request(server)
  //       .post(`api/game/${gameId}/getHandOptions/${turnId}`)
  //       .send({value: 14, color: 'red'})
  //       .end(async (err, res) => {
  //         let newNumOfCards;
  //         try{
  //           const game = await queries.findGame(gameId);
  //           const hand = await queries.getHand(nextTurn.id);
  //           newNumOfCards = hand.length;
  //         }catch(e){
  //           console.log(e);
  //         }
  //         newNumOfCards.should.equal(numOfCards + 4);
  //         res.should.have.status(200);
  //         done();
  //       })
  //     });
  //   });
  //
  //   // it('will update card in play', (done) => {
  //   //   chai.request(server)
  //   //   .post(`api/game/2/getHandOptions/6`)
  //   //   .end((err, res) => {
  //   //     res.should.have.status(200);
  //   //   })
  //   // });
  //
  //   describe('if no card options', _ => {
  //     const gameId = 1;
  //     it('will draw a card for player', async (done) => {
  //       let turnId, oldCardCount;
  //       try{
  //         const game = await queries.findGame();
  //         turnId = game[0].turn_id; //current turn
  //         const hand = await queries.getHand(turnId)
  //         oldCardCount = hand.length;
  //       }catch(e){
  //         console.log(e);
  //       }
  //       chai.request(server)
  //       .post(`api/game/${gameId}/getHandOptions/${turnId}`)
  //       .send({value: -1})
  //       .end(async (err, res) => {
  //         let cardCount;
  //         try{
  //             const hand = queries.getHand(turnId);
  //             cardCount = hand.length;
  //         }catch(e){
  //           console.log(e)
  //         }
  //         cardCount.should.equal(oldCardCount + 1)
  //         res.should.have.status(200);
  //       })
  //     });
  //   });
  // });



})
