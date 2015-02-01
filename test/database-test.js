if (typeof require != 'undefined') {
  var clerk = require('..')
    , expect = require('expect.js');
}

describe('DB', function(){

  before(clerkFactory);
  before(forceDestroyDB);

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
    beforeEach(createDB);

    it('should destroy database', function(done){
      this.db.destroy(function(err, body, status, headers, res){
        if (!err) {
          shouldBeOk(body);
        }
        done(err);
      });
    });

  });

  describe('#replicate', function(){
    before(createDB);
    after(destroyDB);

    before(function(){
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

  describe('utils', function(){
    before(createDB);
    after(destroyDB);

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

  describe('putting documents', function(){
    beforeEach(createDB);
    beforeEach(docFactory);
    afterEach(destroyDB);

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
    before(createDB);
    before(docFactory);
    before(putDocument);
    after(destroyDB);

    describe('#get', function(){
      it('should return document', function(done){
        var doc = this.doc;
        this.db.get(doc._id, function(err, body, status, headers, res){
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
        this.db.head(doc._id, function(err, body, status, headers, res){
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
    beforeEach(createDB);
    beforeEach(docFactory);
    beforeEach(putDocument);
    afterEach(destroyDB);

    describe('#post', function(){
      it('should return document metadata', function(done){
        var doc = this.doc;
        this.db.post(doc, function(err, body, status, headers, res){
          if (!err) {
            shouldBeOk(body);
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
            // CouchDB 1.2 changes the rev on COPY
            // https://issues.apache.org/jira/browse/COUCHDB-1485
            var proto = body.__proto__ || body;
            expect(proto._id).to.be(id);
            // shouldHaveIdRev(body, id, rev);
            shouldHave2xxStatus(status);
          }
          done(err);
        });
      }

    });

  });

  describe('batch', function(){
    before(docFactory);
    beforeEach(createDB);
    afterEach(destroyDB);

    describe('#post', function(){
      it('should be ok', function(done){
        var docs = this.docs;
        this.db.post(docs, function(err, body, status, headers, res){
          var i = 0, len, item, doc;
          if (!err) {
            expect(body).to.be.an('array');
            expect(body).to.have.length(9);
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
          }
          shouldHave2xxStatus(status);
          done(err);
        });
      });

    });

  });

  describe('querying documents', function(){
    before(createDB);
    before(docFactory);
    before(bulkDocuments);
    after(destroyDB);

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

    describe('#find', function(){

    });

  });

  describe('realtime', function(){
    beforeEach(createDB);
    beforeEach(docFactory);
    afterEach(destroyDB);

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

  });

  describe('#update', function(){

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
        shouldBeOk(item);
        shouldHave2xxStatus(status);
      }
      done(err);
    });
  }

  function shouldHaveIdRev(body, id, rev) {
    var proto = body.__proto__ || body;
    expect(proto._id).to.be(id);
    expect(proto._rev).to.be(rev);
  }

  function shouldBeDocument(body, doc) {
    for (var key in doc) {
      expect(body).to.have.property(key, doc[key]);
    }
  }

});
