if (typeof require != 'undefined') {
  var clerk = require('..')
    , expect = require('expect.js');
}

describe('Client', function(){

  before(clerkFactory);

  describe('#db', function(){
    it('should return DB object', function(){
      var db = this.client.db('test');
      expect(db).to.be.a(clerk.DB);
      expect(db).to.have.property('uri', 'http://127.0.0.1:5984/test');
    });
  });

  describe('#dbs', function(){
    it('shoud list databases', function(done){
      this.client.dbs(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.an('array');
          shouldHave2xxStatus(status);
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
          expect(body).to.have.property('uuids');
          expect(body).to.be.an('array');
          expect(body).to.have.length(n);
          shouldHave2xxStatus(status);
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
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe('#stats', function(){
    it('shoud return server stats', function(done){
      this.client.stats(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.have.property('couchdb');
          expect(body).to.have.property('httpd');
          expect(body).to.have.property('httpd_request_methods');
          expect(body).to.have.property('httpd_status_codes');
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe('#log', function(){
    it('shoud return server log lines', function(done){
      this.client.log(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.ok();
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe('#tasks', function(){
    it('shoud return server running tasks', function(done){
      this.client.tasks(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.an('array');
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe('#config', function(){

    it('shoud return server config', function(done){
      this.client.config(function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.an('object');
          expect(body).to.have.property('couchdb');
          expect(body).to.have.property('daemons');
          expect(body).to.have.property('httpd');
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

    it('shoud return server config object', function(done){
      this.client.config('couchdb', function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.an('object');
          expect(body).to.have.property('database_dir');
          expect(body).to.have.property('delayed_commits');
          expect(body).to.have.property('max_document_size');
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

    it('shoud return server config value', function(done){
      this.client.config('couchdb/database_dir', function(err, body, status, headers, res){
        if (!err) {
          expect(body).to.be.a('string');
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

    describe('changing config value', function(){

      beforeEach(function(done){
        this.client.config('log/level', 'debug', function(err, body, status, headers, res){
          if (!err) {
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      beforeEach(function(done){
        this.client.config('log/level', function(err, body, status, headers, res){
          if (!err) {
            expect(body).to.be('debug');
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      afterEach(function(done){
        this.client.config('log/level', 'error', function(err, body, status, headers, res){
          if (!err) {
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      afterEach(function(done){
        this.client.config('log/level', function(err, body, status, headers, res){
          if (!err) {
            expect(body).to.be('error');
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      it('shoud set server config value', function(done){
        this.client.config('log/level', 'debug', function(err, body, status, headers, res){
          if (!err) {
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

  });

  describe('#replicate', function(){

    beforeEach(function(){
      this.db = this.client.db('clerk-test');
      this.replica = this.client.db('clerk-replicate-test');
    });

    beforeEach(forceDestroyDB);

    beforeEach(function(done){
      this.db.create(done);
    });

    beforeEach(function(done){
      this.replica.create(done);
    });

    afterEach(function(done){
      this.replica.destroy(done);
    });

    afterEach(function(done){
      this.db.destroy(done);
    });

    it('shoud be ok', function(done){
      var options = { source: this.db.name, target: this.replica.name };
      this.client.replicate(options, function(err, body, status, headers, res){
        if (!err) {
          shouldBeOk(body);
          shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

  });

});
