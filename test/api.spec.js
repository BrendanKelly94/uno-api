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

    it('should return a list of games for matchmaking' ,(done) => {
      chai.request(server)
      .get('/api/games')
      .end(async (err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('array');
      })
      done();
    });
  });

  describe('api/newGame', _ => {
    /*
      This test creates 2 games with id 3 & 4 and generates a deck
      These games will be used in later tests
    */

    it('should enter game into database', (done) => {
      const name = 'brendan';
      let player;
       chai.request(server)
       .post('/api/newGame')
       .send({botFill: false})
       .end((err, res) => {
         res.should.have.status(200);
         res.body.should.have.property('id');
         done();
       })
    });
    it('should generate a game deck', (done) => {
      chai.request(server)
      .post('/api/newGame')
      .send({botFill: true})
      .end(async (err, res) => {
        if(res.body.err) done(err);
        let deck;
        try{
          deck = await queries.getDeck(res.body.id);
        }catch(e){
          console.log(e);
        }
        deck.should.be.a('array');
        deck.should.have.length(52);
        done();
      })
    });
    it('should fill with bots if botfill is set to true', async () => {
      let players;
      try{
        players = await queries.getPlayers(4);
      }catch(e){
        console.log(e);
      }
      players.should.have.length(6);
    })
  });

  describe('api/game/:id', _ => {

    it('sends a socket join event upon joining', (done) => {
      const name = 'bren1';
      const gameId = 3;
      const socket = io.connect(socketUrl, options);
      let id;

      socket.on('joined', (data) => {
        data.gameId.should.equal(gameId)
        socket.disconnect();
        done()
      });

      chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})
      .end(async (err, res) => {
        if(res.body.hasOwnProperty('err')){
          done(err);
        }else{
          socket.emit('join', {gameId: gameId});
          res.should.have.status(200)
        }

      })
    });

    it('should let a user join game without bots', async () => {
      const name = 'bren1';
      const gameId = 3;
      let player;
      try{
        player = await queries.findPlayer(name);
      }catch(e){
        console.log(e);
      }
      player[0].user_name.should.equal(name);
      player[0].game_id.should.equal(gameId);
    });

    it('should let a user join game with bots', (done) => {
      const name = 'bren2';
      const gameId = 4;
      chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})
      .end(async (err, res) => {
        let player;
        let game;
        try{
          player = await queries.findPlayer(name);
          game = await queries.findGame(gameId);
        }catch(e){
          console.log(e);
        }
        player[0].user_name.should.equal('bren2');
        player[0].game_id.should.equal(gameId);
        game[0].player_count.should.equal(6);
        res.should.have.status(200);
        done();
      });
    })

    it('should generate corresponding player hand', (done) => {
      const name = 'bren3';
      const gameId = 3;
      chai.request(server)
      .post(`/api/game/${gameId}`)
      .send({name: name})
      .end(async (err, res) => {
        let player, hand;
        try{
          player = await queries.findPlayer(name);
          hand = await queries.getHand(player[0].id);
        }catch(e){
          console.log(e)
        }
        res.should.have.status(200);
        hand.should.be.a('array');
        hand.should.have.length(7);
        done();
      })
    });
  });

  //
  // describe('api/game/:gameId/start', _ => {
  //
  //   it('should send a newTurn event with first turn id', (done) => {
  //     const name = 'bren2';
  //     const gameId = 4;
  //     const socket = io.connect(socketUrl, options);
  //     socket.on('newTurn', (data) => {
  //       data.should.exist();
  //       socket.disconnect();
  //       done();
  //     })
  //     chai.request(server)
  //     .post(`/api/game/${gameId}/start`)
  //     .send({name: 'brendan'})
  //     .end((err, res) => {
  //       res.should.have.status(200);
  //     })
  //   });
  //
  //   it('should set card in play', async () => {
  //     let card;
  //     try{
  //       card = await queries.getCardInPlay()
  //     }catch(e){
  //       console.log(e);
  //     }
  //     card[0].card_in_play.should.equal('true');
  //   });
  //
  // });

  //
  // describe('api/game/:gameId/end', _ => {
  //   it('will delete game off of database', (done) => {
  //     chai.request(server)
  //     .post('api/game/1/end')
  //     .end((err, res) => {
  //       res.should.have.status(200);
  //     })
  //   });
  // });
  //
  //
  // describe('/api/game/:gameId/getHandOptions/:playerId', _ => {
  //   it('will generate a list of possible cards to play', (done) => {
  //     chai.request(server)
  //     .post('api/game/1/getHandOptions/1')
  //     .end((err, res) => {
  //       res.should.have.status(200);
  //     })
  //   });
  //   it('will submit turn if bot', (done) => {
  //     chai.request(server)
  //     .post('api/game/2/getHandOptions/6')
  //     .end((err, res) => {
  //       res.should.have.status(200);
  //     })
  //   })
  // });
  //
  // describe('api/game/:gameId/submitCard/:playerId', _ => {
  //
  //   describe('if special card', _ => {
  //     it('will reverse direction', (done) => {
  //       chai.request(server)
  //       .post('api/game/1/submitCard/1')
  //       .end((err, res) => {
  //         res.should.have.status(200);
  //       })
  //     });
  //     it('will skip turn', (done) => {
  //       chai.request(server)
  //       .post('api/game/2/getHandOptions/6')
  //       .end((err, res) => {
  //         res.should.have.status(200);
  //       })
  //     });
  //     it('will give 2 cards', (done) => {
  //       chai.request(server)
  //       .post('api/game/2/getHandOptions/6')
  //       .end((err, res) => {
  //         res.should.have.status(200);
  //       })
  //     });
  //     it('will give 4 cards', (done) => {
  //       chai.request(server)
  //       .post('api/game/2/getHandOptions/6')
  //       .end((err, res) => {
  //         res.should.have.status(200);
  //       })
  //     });
  //   });
  //
  //   it('will update card in play', (done) => {
  //     chai.request(server)
  //     .post('api/game/2/getHandOptions/6')
  //     .end((err, res) => {
  //       res.should.have.status(200);
  //     })
  //   });
  //
  //   describe('if no card options', _ => {
  //     it('will draw a card for player', (done) => {
  //       chai.request(server)
  //       .post('api/game/2/getHandOptions/6')
  //       .end((err, res) => {
  //         res.should.have.status(200);
  //       })
  //     });
  //   });
  //
  //   it('will update next turn', (done) => {
  //     chai.request(server)
  //     .post('api/game/2/getHandOptions/6')
  //     .end((err, res) => {
  //       res.should.have.status(200);
  //     })
  //   });
  // });



})
