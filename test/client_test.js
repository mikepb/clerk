"use strict";

var clerk = require("../clerk");
var expect = require("expect.js");
var shared = require("./shared");

describe("Client", function () {

  before(shared.clerkFactory);

  describe("#db", function () {
    it("should return DB object", function () {
      expect(this.db).to.be.a(clerk.DB);
      var uri = this.baseURL.replace(/^(https?:\/\/)([^@\/]+@)/, "$1") + "/" +
                this.dbname;
      expect(this.db).to.have.property("uri", uri);
    });
  });

  describe("#dbs", function () {
    it("shoud list databases", function (done) {
      this.client.dbs(function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.an("array");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe("#uuids", function () {

    it("shoud return 1 uuid by default", function (done) {
      this.client.uuids(having(1, done));
    });

    shouldReturnUUIDs(1);
    shouldReturnUUIDs(2);
    shouldReturnUUIDs(3);
    shouldReturnUUIDs(100);

    function having(n, done) {
      return function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.have.property("uuids");
          expect(body).to.be.an("array");
          expect(body).to.have.length(n);
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      };
    }

    function shouldReturnUUIDs(n) {
      it("shoud return " + n + " uuid", function (done) {
        this.client.uuids(n, having(n, done));
      });
    }

  });

  describe("#info", function () {
    it("shoud return server info", function (done) {
      this.client.info(function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.have.property("couchdb", "Welcome");
          expect(body).to.have.property("version");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe("#stats", function () {
    it("shoud return server stats", function (done) {
      this.client.stats(function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.have.property("couchdb");
          expect(body).to.have.property("httpd");
          expect(body).to.have.property("httpd_request_methods");
          expect(body).to.have.property("httpd_status_codes");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe("#log", function () {
    it("shoud return server log lines", function (done) {
      this.client.log(function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.ok();
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe("#tasks", function () {
    it("shoud return server running tasks", function (done) {
      this.client.tasks(function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.an("array");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });
  });

  describe("#config", function () {

    it("shoud return server config", function (done) {
      this.client.config(function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.an("object");
          expect(body).to.have.property("couchdb");
          expect(body).to.have.property("daemons");
          expect(body).to.have.property("httpd");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

    it("shoud return server config object", function (done) {
      this.client.config("couchdb", function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.an("object");
          expect(body).to.have.property("database_dir");
          expect(body).to.have.property("delayed_commits");
          expect(body).to.have.property("max_document_size");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

    it("shoud return server config value", function (done) {
      var self = this;
      this.client.config("log/level", function (err, body, status, headers, res) {
        if (!err) {
          expect(body).to.be.a("string");
          shared.shouldHave2xxStatus(status);
          self.value = body;
        }
        done(err);
      });
    });

    it("shoud set server config value", function (done) {
      this.client.config("log/level", this.value, function (err, body, status, headers, res) {
        if (!err) {
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

  });

  describe("#replicate", function () {

    before(function () {
      this.replica = this.client.db(this.dbname + "-client-replica");
    });

    before(shared.createDB("db"));
    before(shared.createDB("replica"));
    after(shared.destroyDB("db"));
    after(shared.destroyDB("replica"));

    it("shoud be ok", function (done) {
      var options = {
        source: this.db.name,
        target: this.replica.name
      };
      this.client.replicate(options, function (err, body, status, headers, res) {
        if (!err) {
          shared.shouldBeOk(body);
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

  });

});
