/*jslint undef:true */

if (typeof require != 'undefined') {
  var clerk = require('clerk')
    , expect = require('expect.js');
}

describe('Database', function(){

  before(function(){
    this.client = new clerk.Client('http://127.0.0.1:5984');
    this.db = this.client.database('clerk-test');
  });

  before(destroyDB);

  beforeEach(function(){
    this.doc = { _id: '0' };
  });

  describe('#create', function(){

    afterEach(destroyDB);

    it('shoud create database', function(done){
      this.db.create(function(err, body, status, headers, res){
        if (!err) {
          shouldBeOk(body);
        }
        done(err);
      });
    });

  });

  describe('#destroy', function(){

    beforeEach(function(done){
      this.db.create(function(){
        done();
      });
    });

    it('shoud destroy database', function(done){
      this.db.destroy(function(err, body, status, headers, res){
        if (!err) {
          shouldBeOk(body);
        }
        done(err);
      });
    });

  });

  describe('using "clerk-test" database', function(){

    beforeEach(function(done){
      this.db.create(done);
    });

    afterEach(function(done){
      this.db.destroy(done);
    });

    describe('#info', function(){
      it('shoud return database info', function(done){
        this.db.info(function(err, body, status, headers, res){
          if (!err) {
            expect(body).to.have.property('db_name', 'clerk-test');
            expect(body).to.have.property('doc_count', 0);
            expect(body).to.have.property('doc_del_count', 0);
          }
          done(err);
        });
      });
    });

    describe('putting documents', function(){

      describe('#exists', function(){
        it('shoud be true', function(done){
          this.db.exists(function(err, body, status, headers, res){
            if (!err) {
              expect(body).to.be(true);
            }
            done(err);
          });
        });
      });

      describe('#post', function(){
        it('shoud store document', function(done){
          this.db.post({}, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHaveIdRev(body, body._id, body._rev);
            }
            done(err);
          });
        });
      });

      describe('#put', function(){
        it('shoud store document', function(done){
          this.db.put('0', {}, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHaveIdRev(body, '0', '1-967a00dff5e02add41819138abb3284d');
            }
            done(err);
          });
        });
      });

    });

    describe('getting documents', function(){

      beforeEach(putDocument);

      describe('#get', function(){
        it('shoud return document', function(done){
          var doc = this.doc;
          this.db.get(this.doc._id, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, doc._id, doc._rev);
            }
            done(err);
          });
        });
      });

      describe('#head', function(){
        it('shoud return document metadata', function(done){
          var doc = this.doc;
          this.db.head(this.doc._id, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, doc._id, doc._rev);
            }
            done(err);
          });
        });
      });

    });

    describe('updating documents', function(){

      beforeEach(putDocument);

      describe('#post', function(){
        it('shoud return document metadata', function(done){
          var doc = this.doc;
          this.db.post(doc, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, doc._id, '2-7051cbe5c8faecd085a3fa619e6e6337');
            }
            done(err);
          });
        });
      });

      describe('#del', function(){
        it('shoud be ok', function(done){
          var doc = this.doc;
          this.db.del(doc._id, doc._rev, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
            }
            done(err);
          });
        });
      });

      xdescribe('#copy', function(){
        it('shoud return value', function(done){
          this.db.copy(function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
            }
            done(err);
          });
        });
      });

    });
  });

  function destroyDB(done){
    this.db.destroy(function(){
      done();
    });
  }

  function putDocument(done){
    var doc = this.doc;
    this.db.put(doc, function(err, body, status, headers, res){
      if (!err) {
        shouldHaveIdRev(body, doc._id, body._rev);
        doc._rev = body._rev;
      }
      done(err);
    });
  }

  function shouldBeOk(body) {
    expect(body).to.have.property('ok', true);
  }

  function shouldHaveIdRev(body, id, rev) {
    expect(body).to.have.property('id', id);
    expect(body).to.have.property('_id', id);
    expect(body).to.have.property('rev', rev);
    expect(body).to.have.property('_rev', rev);
  }

});
