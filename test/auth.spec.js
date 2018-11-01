process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../app');
const knex = require('../db/knex.js');
const queries = require('../db/queries.js');

chai.use(chaiHttp);

describe('Authentication Routes', _ => {

  before(async () => {
    try{
      const x = await knex.migrate.rollback();
      const y = await knex.migrate.latest();
      const z = await knex.seed.run();
    }catch(e){
      console.log(e)
    }
  })

  describe('Registration', () => {
    it('should register a new account', (done) => {
      chai.request(server)
      .post('/register')
      .send({name: 'test', pwd: 'test'})
      .end(async (err, res) => {
        res.should.have.status(200);
        const user = await queries.findUser('test');
        user[0].name.should.equal('test');
        done();
      })
    });

    it('should not be able to register as bot', (done) => {
      chai.request(server)
      .post('/register')
      .send({name: 'bot', pwd: 'bot'})
      .end(async (err, res) => {
        res.should.have.status(200)
        res.body.should.have.property('err');
        done();
      })
    })
  });

  describe('Login', () => {
    it('should log a user into their account', (done) => {
      const name = 'brendan';
      const pwd = 'test'
      chai.request(server)
      .post('/login')
      .send({name: name, pwd: pwd})
      .end(async (err,res) => {
        res.should.have.status(200);
        res.body.should.equal(name);
        done();
      })
    })

    it('should not be able to login as bot', (done) => {
      chai.request(server)
      .post('/login')
      .send({name: 'bot', pwd: 'bot'})
      .end(async (err, res) => {
        res.should.have.status(200)
        res.body.should.have.property('err');
        done();
      })
    });
  });

});
