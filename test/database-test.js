if (typeof require != 'undefined') {
  var clerk = require('..')
    , expect = require('expect.js');
}

describe('DB', function(){

  before(function(){
    this.client = new clerk.Client('http://127.0.0.1:5984');
    this.db = this.client.db('clerk-test');
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

    it('should create database', function(done){
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

    it('should destroy database', function(done){
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
      it('should return database info', function(done){
        this.db.info(function(err, body, status, headers, res){
          if (!err) {
            expect(body).to.have.property('db_name', 'clerk-test');
            expect(body).to.have.property('doc_count', 0);
            expect(body).to.have.property('doc_del_count', 0);
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe('putting documents', function(){

      describe('#exists', function(){
        it('should be true', function(done){
          this.db.exists(function(err, body, status, headers, res){
            if (!err) {
              expect(body).to.be(true);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

      describe('#post', function(){
        it('should store document', function(done){
          this.db.post({}, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHaveIdRev(body, body._id, body._rev);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

      describe('#put', function(){
        it('should store document', function(done){
          var doc = this.doc;
          this.db.put(doc, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHaveIdRev(body, doc._id, '1-15f65339921e497348be384867bb940f');
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

    });

    describe('getting documents', function(){

      beforeEach(putDocument);

      describe('#get', function(){
        it('should return document', function(done){
          var doc = this.doc;
          this.db.get(this.doc._id, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, doc._id, doc._rev);
              shouldBeDocument(body, doc);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

      describe('#head', function(){
        it('should return document metadata', function(done){
          var doc = this.doc;
          this.db.head(this.doc._id, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, doc._id, doc._rev);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

    });

    describe('updating documents', function(){

      beforeEach(putDocument);

      describe('#post', function(){
        it('should return document metadata', function(done){
          var doc = this.doc;
          this.db.post(doc, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, doc._id, '2-47661acbb62a2a63704c803bc0152f2b');
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

      describe('#del', function(){
        it('should be ok', function(done){
          var doc = this.doc;
          this.db.del(doc, function(err, body, status, headers, res){
            if (!err) {
              shouldBeOk(body);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

      describe('#copy', function(){

        it('should copy id to id', function(done){
          shouldCopy.call(this, done, this.doc._id, '1', '1', '1-095d0517d4ee0271cc517163c4e465ff');
        });

        it('should copy doc to id', function(done){
          shouldCopy.call(this, done, this.doc, '1', '1', '1-095d0517d4ee0271cc517163c4e465ff');
        });

        it('should copy doc to doc', function(done){
          var target = { _id: '1' };
          shouldCopy.call(this, done, this.doc, target, target._id, '1-095d0517d4ee0271cc517163c4e465ff');
        });

        it('should copy doc to doc with rev', function(done){
          var target = { _id: '1', _rev: this.doc._rev };
          shouldCopy.call(this, done, this.doc, target, target._id, '2-92c76f94974bbbb524cf9e18aedd3572');
        });

        function shouldCopy(done, source, target, id, rev) {
          this.db.copy(source, target, function(err, body, status, headers, res){
            if (!err) {
              shouldHaveIdRev(body, id, rev);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        }

      });

    });

    describe('batch', function(){

      describe('#post', function(){
        it('should be ok', function(done){
          this.db.post(this.docs, function(err, body, status, headers, res){
            if (!err) {
              expect(body).to.be.an('array');
              expect(body).to.have.length(9);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });

      describe('#del', function(){

        beforeEach(bulkDocuments);

        it('should be ok', function(done){
          var docs = this.docs;
          this.db.del(docs, function(err, body, status, headers, res){
            var i = 0, len, item, doc;
            if (!err) {
              for (len = body.length; i < len; i++) {
                item = body[i], doc = docs[i];
                shouldBeOk(item);
                shouldHaveIdRev(item, doc._id, item._rev);
              }
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });

      });

    });

    describe('querying documents', function(){

      beforeEach(bulkDocuments);

      describe('#all', function(){

        it('should return metadata', function(done){
          var docs = this.docs;
          this.db.all(function(err, body, status, headers, res){
            var i = 0, len, item, doc;
            if (!err) {
              expect(body).to.have.property('rows');
              expect(body).to.have.property('total_rows', 9);
              expect(body).to.have.property('offset', 0);
              for (len = body.length; i < len; i++) {
                item = body[i], doc = docs[i];
                expect(item).to.have.property('id', doc._id);
                expect(item).to.have.property('key', doc._id);
                expect(item.value).to.have.property('rev', doc._rev);
              }
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });

        it('should return documents', function(done){
          var docs = this.docs;
          this.db.all({ include_docs: true }, function(err, body, status, headers, res){
            var i = 0, len, item, doc;
            if (!err) {
              expect(body).to.have.property('rows');
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
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });

      });

      describe('#view', function(){

      });

    });

    describe('#changes', function(){
      it('should get changes', function(done){
        var db = this.db, doc = this.doc;
        putDocument.call(this, function(err){
          if (err) return done(err);
          db.changes(function(err, body, status){
            if (!err) {
              expect(body).to.have.property('results');
              expect(body).to.be.an('array');
              expect(body).to.have.length(1);
              expect(body[0]).to.have.property('changes');
              expect(body[0].changes).to.be.an('array');
              expect(body[0].changes[0]).to.have.property('rev', doc._rev);
              shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });
    });

    describe('#follow', function(){
      it('should follow changes', function(done){
        var db = this.db
          , docs = this.docs;

        db.follow(function(err, body, status){
          if (err) return done(err);
          var doc = docs.shift();

          expect(body).to.have.property('id', doc._id);
          expect(body.changes).to.be.an('array');
          expect(body.changes[0]).to.have.property('rev', doc._rev);
          shouldHave2xxStatus(status);

          if (!docs.length) {
            done();
            return false;
          }
        });

        bulkDocuments.call(this, function(err){
          if (err) return done(err);
        });
      });
    });

    describe('#update', function(){

    });

    describe('#replicate', function(){

      beforeEach(function(){
        this.replica = this.client.db('clerk-replicate-test');
      });

      beforeEach(function(done){
        this.replica.create(done);
      });

      afterEach(function(done){
        this.replica.destroy(done);
      });

      it('should be ok', function(done){
        var options = { target: this.replica.name };
        this.db.replicate(options, function(err, body, status, headers, res){
          if (!err) {
            shouldBeOk(body);
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

    });

    describe('#commit', function(){
      it('should be ok', function(done){
        this.db.commit(function(err, body, status, headers, res){
          if (!err) {
            shouldBeOk(body);
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe('#purge', function(){
      it('should be ok', function(done){
        this.db.purge({}, function(err, body, status, headers, res){
          if (!err) {
            expect(body).to.have.property('purged');
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe('#compact', function(){
      it('should be ok', function(done){
        this.db.compact(function(err, body, status, headers, res){
          if (!err) {
            shouldBeOk(body);
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe('#vacuum', function(){
      it('should be ok', function(done){
        this.db.vacuum(function(err, body, status, headers, res){
          if (!err) {
            shouldBeOk(body);
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

  });

  function putDocument(done) {
    var doc = this.doc;
    this.db.put(doc, function(err, body, status, headers, res){
      if (!err) {
        shouldHaveIdRev(body, doc._id, body._rev);
        shouldHave2xxStatus(status);
        doc._rev = body._rev;
      }
      done(err);
    });
  }

  function bulkDocuments(done) {
    var docs = this.docs;
    this.db.post(docs, function(err, body, status, headers, res){
      var i = 0, j, len, item, doc;
      if (!err) {
        for (len = body.length; i < len; i++) {
          item = body[i], doc = docs[i];
          expect(item).to.have.property('id', doc._id);
          expect(item).to.have.property('rev');
          doc._rev = item.rev;
        }
        shouldHave2xxStatus(status);
      }
      done(err);
    });
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
