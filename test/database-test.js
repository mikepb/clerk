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

  before(forceDestroyDB);

  beforeEach(function(){
    this.doc = { _id: '0', hello: 'world' };
    this.docs = [];
    for (var i = 1; i < 10; i++) {
      this.docs.push({ _id: '' + i, hello: 'world' + i });
    }
  });

  describe('#create', function(){

    afterEach(forceDestroyDB);

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
          var doc = this.doc;
          this.db.put(doc, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHaveIdRev(body, doc._id, '1-15f65339921e497348be384867bb940f');
            }
            done(err);
          });
        });

        it('shoud store document at id', function(done){
          var doc = this.doc, id = doc._id;
          delete doc._id;
          this.db.put(id, doc, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHaveIdRev(body, id, '1-15f65339921e497348be384867bb940f');
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
              shouldBeDocument(body, doc);
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
              shouldHaveIdRev(body, doc._id, '2-47661acbb62a2a63704c803bc0152f2b');
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

      describe('#copy', function(){

        it('shoud copy id to id', function(done){
          shouldCopy.call(this, done, this.doc._id, '1', '1', '1-095d0517d4ee0271cc517163c4e465ff');
        });

        it('shoud copy doc to id', function(done){
          shouldCopy.call(this, done, this.doc, '1', '1', '1-095d0517d4ee0271cc517163c4e465ff');
        });

        it('shoud copy doc to doc', function(done){
          var target = { _id: '1' };
          shouldCopy.call(this, done, this.doc, target, target._id, '1-095d0517d4ee0271cc517163c4e465ff');
        });

        it('shoud copy doc to doc with rev', function(done){
          var target = { _id: '1', _rev: this.doc._rev };
          shouldCopy.call(this, done, this.doc, target, target._id, '2-92c76f94974bbbb524cf9e18aedd3572');
        });

        function shouldCopy(done, source, target, id, rev) {
          this.db.copy(source, target, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, id, rev);
            }
            done(err);
          });
        }

      });

    });

    describe('batch', function(){

      describe('#bulk', function(){
        it('should be ok', function(done){
          this.db.bulk(this.docs, function(err, body, status, headers, res){
            if (!err) {
              expect(body).to.be.an('array');
              expect(body).to.have.length(9);
            }
            done(err);
          });
        });
      });

      describe('#delAll', function(){

        beforeEach(bulkDocuments);

        it('should be ok', function(done){
          var docs = this.docs;
          this.db.delAll(docs, function(err, body, status, headers, res){
            var i = 0, len, item, doc;
            if (!err) {
              for (len = body.length; i < len; i++) {
                item = body[i], doc = docs[i];
                shouldBeOk(item);
                shouldHaveIdRev(item, doc._id, item._rev);
              }
            }
            done(err);
          });
        });

      });

    });

    describe('querying documents', function(){

      beforeEach(bulkDocuments);

      describe('#all', function(){
        it('should return documents', function(done){
          var docs = this.docs;
          this.db.all({ include_docs: true }, function(err, body, status, headers, res){
            var i = 0, len, item, doc;
            if (!err) {
              expect(body).to.have.property('total_rows', 9);
              expect(body).to.have.property('offset', 0);
              for (len = body.length; i < len; i++) {
                item = body[i], doc = docs[i];
                expect(item).to.have.property('id', doc._id);
                expect(item).to.have.property('key', doc._id);
                expect(item.value).to.have.property('rev', doc._rev);
                shouldHaveIdRev(item.doc, doc._id, doc._rev);
                expect(item.doc).to.have.property('hello', doc.hello);
              }
            }
            done(err);
          });
        });
      });

      describe('#view', function(){

      });

    });

    describe('#update', function(){

    });

    describe('#replicate', function(){

    });

    describe('#commit', function(){

    });

    describe('#purge', function(){

    });

    describe('#compact', function(){

    });

    describe('#vacuum', function(){

    });

  });

  function forceDestroyDB(done) {
    this.db.destroy(function(){
      done();
    });
  }

  function putDocument(done) {
    var doc = this.doc;
    this.db.put(doc, function(err, body, status, headers, res){
      if (!err) {
        shouldHaveIdRev(body, doc._id, body._rev);
        doc._rev = body._rev;
      }
      done(err);
    });
  }

  function bulkDocuments(done) {
    var docs = this.docs;
    this.db.bulk(docs, function(err, body, status, headers, res){
      var i = 0, j, len, item, doc;
      if (!err) {
        for (len = body.length; i < len; i++) {
          item = body[i], doc = docs[i];
          expect(item).to.have.property('id', doc._id);
          expect(item).to.have.property('rev');
          doc._rev = item.rev;
        }
      }
      done(err);
    });
  }

  function shouldBeOk(body) {
    expect(body).to.have.property('ok', true);
  }

  function shouldHaveIdRev(body, id, rev) {
    expect(body.id).to.be(id);
    expect(body._id).to.be(id);
    expect(body.rev).to.be(rev);
    expect(body._rev).to.be(rev);
  }

  function shouldBeDocument(body, doc) {
    for (var key in doc) {
      expect(body).to.have.property(key, doc[key]);
    }
  }

});
