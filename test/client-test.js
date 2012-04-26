/*jslint undef:true */

if (typeof require != 'undefined') {
  var clerk = require('clerk')
    , expect = require('expect.js');
}

describe('Client', function(){

  beforeEach(function(){
    this.client = new clerk.Client('http://127.0.0.1:5984');
  });

  describe('#database', function(){
    it('should return Database object', function(){
      var db = this.client.database('test');
      expect(db).to.be.a(clerk.Database);
      expect(db).to.have.property('uri', 'http://127.0.0.1:5984/test');
    });
  });

  describe('#databases', function(){
    it('shoud databases', function(done){
      this.client.databases(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.an('array');
        }
        done(err);
      });
    });
  });

  describe('#uuids', function(){

    it('shoud return 1 uuid by default', function(done){
      this.client.uuids(having(1, done));
    });

    shouldReturnUUIDs(1);
    shouldReturnUUIDs(2);
    shouldReturnUUIDs(3);
    shouldReturnUUIDs(100);

    function having(n, done) {
      return function(err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.an('array');
          expect(body).to.have.length(n);
          expect(body).to.have.property('uuids');
          expect(body).to.be(body.uuids);
        }
        done(err);
      };
    }

    function shouldReturnUUIDs(n) {
      it('shoud return ' + n + ' uuid', function(done){
        this.client.uuids(n, having(n, done));
      });
    }

  });

  describe('#info', function(){
    it('shoud return server info', function(done){
      this.client.info(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.have.property('couchdb', 'Welcome');
          expect(body).to.have.property('version');
        }
        done(err);
      });
    });
  });

  describe('#stats', function(){
  });

  describe('#log', function(){
  });

  describe('#tasks', function(){
  });

  describe('#config', function(){
  });

  describe('#setConfig', function(){
  });

  describe('#delConfig', function(){
  });

  describe('#replicate', function(){
  });

  describe('#restart', function(){
  });

});
