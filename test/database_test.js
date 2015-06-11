"use strict";

var clerk = require("../clerk");
var expect = require("expect.js");
var shared = require("./shared");

describe("DB", function () {
  before(shared.clerkFactory);

  describe("#create", function () {
    it("should create database", shared.createDB("db"));
  });

  describe("#replicate", function () {

    before(function () {
      this.replica = this.client.db(this.dbname + "-replica");
    });

    before(shared.createDB("replica"));
    after(shared.destroyDB("replica"));

    it("should be ok", function (done) {
      var options = {
        target: this.replica.name
      };
      this.db.replicate(options, function (err, body, status, headers, res) {
        if (!err) {
          shared.shouldBeOk(body);
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

  });

  describe("utils", function () {

    describe("#exists", function () {
      it("should be true", function (done) {
        this.db.exists(function (err, exists, status, headers, res) {
          if (!err) {
            expect(exists).to.be(true);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      it("should be false", function (done) {
        var db = this.client.db(this.dbname + "-404-" + Date.now());
        db.exists(function (err, exists, status, headers, res) {
          if (err) return done(err);
          expect(exists).to.be(false);
          expect(status).to.be(404);
          done();
        });
      });
    });

    describe("#info", function () {
      it("should return database info", function (done) {
        var self = this;
        this.db.info(function (err, body, status, headers, res) {
          if (!err) {
            expect(body).to.have.property("db_name", self.dbname);
            expect(body).to.have.property("doc_count", 0);
            expect(body).to.have.property("doc_del_count", 0);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#commit", function () {
      it("should be ok", function (done) {
        this.db.commit(function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#purge", function () {
      it("should be ok", function (done) {
        this.db.purge({}, function (err, body, status, headers, res) {
          if (!err) {
            expect(body).to.have.property("purged");
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#compact", function () {
      it("should be ok", function (done) {
        this.db.compact(function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#vacuum", function () {
      it("should be ok", function (done) {
        this.db.vacuum(function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

  });

  describe("putting documents", function () {
    beforeEach(shared.docFactory);

    describe("#post", function () {
      it("should store document", function (done) {
        this.db.post({}, function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shouldHaveIdRev(body, body._id, body._rev);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#put", function () {
      it("should store document", function (done) {
        var doc = this.doc;
        this.db.put(doc, function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shouldHaveIdRev(body, doc._id, "1-15f65339921e497348be384867bb940f");
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

  });

  describe("getting documents", function () {
    before(shared.docFactory);
    before(putDocument);

    describe("#get", function () {

      it("should return document", function (done) {
        var doc = this.doc;
        this.db.get(doc._id, function (err, body, status, headers, res) {
          if (!err) {
            shouldHaveIdRev(body, doc._id, doc._rev);
            shouldBeDocument(body, doc);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      it("should return not found", function (done) {
        this.db.get("notfound" + Math.random(), function (err, body, status, headers, res) {
          expect(err).to.be.an(Error);
          expect(err.status).to.be(404);
          expect(status).to.be(404);
          done();
        });
      });

    });

    describe("#head", function () {
      it("should return document metadata", function (done) {
        var doc = this.doc;
        this.db.head(doc._id, function (err, body, status, headers, res) {
          if (!err) {
            shouldHaveIdRev(body, doc._id, doc._rev);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

  });

  describe("updating documents", function () {
    beforeEach(shared.docFactory);
    beforeEach(putDocument);

    describe("#post", function () {
      it("should return document metadata", function (done) {
        var doc = this.doc;
        this.db.post(doc, function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shouldHaveIdRev(body, doc._id, "2-47661acbb62a2a63704c803bc0152f2b");
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#del", function () {
      it("should be ok", function (done) {
        var doc = this.doc;
        this.db.del(doc, function (err, body, status, headers, res) {
          if (!err) {
            shared.shouldBeOk(body);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#copy", function () {

      it("should copy id to id", function (done) {
        var id = shared.randomId();
        shouldCopy.call(this, done, this.doc._id, id, id, "1-");
      });

      it("should copy doc to id", function (done) {
        var id = shared.randomId();
        shouldCopy.call(this, done, this.doc, id, id, "1-");
      });

      it("should copy doc to doc", function (done) {
        var id = shared.randomId();
        var target = { _id: id };
        shouldCopy.call(this, done, this.doc, target, target._id, "1-");
      });

      it("should copy doc to doc with rev", function (done) {
        var id = shared.randomId();
        var target = { _id: id, _rev: this.doc._rev };
        shouldCopy.call(this, done, this.doc, target, target._id, "2-");
      });

      function shouldCopy(done, source, target, id, rev) {
        this.db.copy(source, target, function (err, body, status, headers, res) {
          if (!err) {
            // CouchDB 1.2 changes the rev on COPY
            // https://issues.apache.org/jira/browse/COUCHDB-1485
            var proto = body.__proto__ || body;
            expect(proto._id).to.be(id);
            // shouldHaveIdRev(body, id, rev);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      }

    });

  });

  describe("batch", function () {
    before(shared.docFactory);

    describe("#post", function () {
      it("should be ok", function (done) {
        var docs = this.docs;
        this.db.post(docs, function (err, body, status, headers, res) {
          var i = 0, j, len, item, doc;
          if (!err) {
            for (len = body.length; i < len; i++) {
              item = body[i], doc = docs[i];
              expect(item).to.have.property("id", doc._id);
              expect(item).to.have.property("rev");
              doc._rev = item.rev;
            }
            shared.shouldBeOk(item);
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });
    });

    describe("#del", function () {
      it("should be ok", function (done) {
        var docs = this.docs;
        this.db.del(docs, function (err, body, status, headers, res) {
          var i = 0,
            len, item, doc;
          if (!err) {
            for (len = body.length; i < len; i++) {
              item = body[i], doc = docs[i];
              shared.shouldBeOk(item);
              shouldHaveIdRev(item, doc._id, item._rev);
            }
          }
          shared.shouldHave2xxStatus(status);
          done(err);
        });
      });
    });

  });

  describe("querying documents", function () {

    describe("#all", function () {

      it("should return metadata", function (done) {
        this.db.all(function (err, body, status, headers, res) {
          var i = 0, len, item;
          if (!err) {
            expect(body).to.have.property("rows");
            expect(body).to.have.property("total_rows");
            expect(body.total_rows).greaterThan(0);
            expect(body).to.have.property("offset", 0);
            for (len = body.length; i < len; i++) {
              item = body[i];
              expect(item).to.have.property("id");
              expect(item).to.have.property("key");
              expect(item.value).to.have.property("rev");
            }
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

      it("should return documents", function (done) {
        this.db.all({
          include_docs: true
        }, function (err, body, status, headers, res) {
          var i = 0, len, item;
          if (!err) {
            expect(body).to.have.property("rows");
            expect(body).to.have.property("total_rows");
            expect(body.total_rows).greaterThan(0);
            expect(body).to.have.property("offset", 0);
            for (len = body.length; i < len; i++) {
              item = body[i];
              expect(item).to.have.property("id");
              expect(item).to.have.property("key", item.id);
              expect(item.value).to.have.property("rev");
              expect(item.doc).to.have.property("_id");
              expect(item.doc).to.have.property("_rev");
              if (/^clerk-test-/.test(item.id)) {
                expect(item.doc).to.have.property("hello");
              }
            }
            shared.shouldHave2xxStatus(status);
          }
          done(err);
        });
      });

    });

    describe("#find", function () {

    });

  });

  describe("realtime", function () {
    beforeEach(shared.docFactory);

    describe("#changes", function () {
      it("should get changes", function (done) {
        var db = this.db,
          doc = this.doc;
        putDocument.call(this, function (err) {
          if (err) return done(err);
          db.changes(function (err, body, status) {
            if (!err) {
              expect(body).to.have.property("results");
              expect(body).to.be.an("array");
              expect(body.length).to.be.greaterThan(0);
              var changes = body[body.length - 1];
              expect(changes).to.have.property("changes");
              expect(changes.changes).to.be.an("array");
              expect(changes.changes[0]).to.have.property("rev", doc._rev);
              shared.shouldHave2xxStatus(status);
            }
            done(err);
          });
        });
      });
    });

    describe("#follow", function () {
      it("should follow changes", function (done) {
        var db = this.db;
        var docs = this.docs;

        db.follow(function (err, body, status) {
          if (err) return done(err);
          if (body.id != docs[0]._id) return;

          var doc = docs.shift();

          expect(body).to.have.property("id", doc._id);
          expect(body.changes).to.be.an("array");
          expect(body.changes[0]).to.have.property("rev", doc._rev);
          shared.shouldHave2xxStatus(status);

          if (!docs.length) {
            done();
            return false;
          }
        });

        bulkDocuments.call(this, function (err) {
          if (err) return done(err);
        });
      });
    });

  });

  describe("#update", function () {

    it("should create an update handler", function (done) {
      this.db.put("_design/test", require("./design"), done);
    });

    it("should use an update handler", function (done) {
      this.db.update("test/test", "myrandomid", {Hello: "World"}, function (err, body) {
        if (!err) {
          expect(body).to.have.property("_id", "myrandomid");
          expect(body).to.have.property("Hello", "World");
          expect(body).to.have.property("dtcreated");
          expect(body).to.have.property("dtupdated");
        }
        done(err);
      });
    });

    it("should not set the path from the request body", function (done) {
      this.db.update("test/test", {_id: "foo", Hello: "World"}, function (err) {
        expect(err).to.be.an(Error);
        expect(err.status).to.be(400);
        expect(err.url).to.not.match(/\bfoo\b/)
        done();
      });
    });

  });


  describe("#destroy", function () {

    it("should destroy database", function (done) {
      this.db.destroy(function (err, body, status, headers, res) {
        if (!err) {
          shared.shouldBeOk(body);
        }
        done(err);
      });
    });

  });

  function putDocument(done) {
    var doc = this.doc;
    this.db.put(doc, function (err, body, status, headers, res) {
      if (!err) {
        shouldHaveIdRev(body, doc._id, body._rev);
        shared.shouldHave2xxStatus(status);
        doc._rev = body._rev;
      }
      done(err);
    });
  }

  function bulkDocuments(done) {
    var docs = this.docs;
    this.db.post(docs, function (err, body, status, headers, res) {
      var i = 0,
        j, len, item, doc;
      if (!err) {
        for (len = body.length; i < len; i++) {
          item = body[i], doc = docs[i];
          expect(item).to.have.property("id", doc._id);
          expect(item).to.have.property("rev");
          doc._rev = item.rev;
        }
        shared.shouldBeOk(item);
        shared.shouldHave2xxStatus(status);
      }
      done(err);
    });
  }

  function shouldHaveIdRev(body, id, rev) {
    expect(body._id).to.be(id);
    expect(body._rev).to.be(rev);
  }

  function shouldBeDocument(body, doc) {
    for (var key in doc) {
      expect(body).to.have.property(key, doc[key]);
    }
  }

});
