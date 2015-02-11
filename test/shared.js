"use strict";

var clerk = require("../clerk");
var expect = require("expect.js");

exports.clerkFactory = function () {
  this.baseURL = "http://127.0.0.1:5984";
  this.dbname = "clerk-test-" + (1000 * Math.random() | 0);
  this.client = clerk(this.baseURL);
  this.db = this.client.db(this.dbname);
};

exports.randomId = function () {
  return "clerk-test-" + Date.now() + (Math.random() * 1000000 | 0);
};

exports.docFactory = function () {
  this.doc = {
    _id: exports.randomId(),
    hello: "world"
  };
  this.docs = [];
  var i, j;
  for (i = 1; i < 10; i++) {
    this.docs.push({
      _id: exports.randomId(),
      hello: "world" + i
    });
  }
};

exports.createDB = function (key) {
  return function (done) {
    this[key].create(function (err, body, status, headers, res) {
      if (!err) {
        exports.shouldBeOk(body);
      } else {
        expect(status).to.be(412); // database exists
        err = null;
      }
      done(err);
    });
  };
};

exports.destroyDB = function (key) {
  return function (done) {
    this[key].destroy(done);
  };
};

exports.shouldBeOk = function (body) {
  expect(body).to.have.property("ok", true);
};

exports.shouldHave2xxStatus = function (status) {
  expect(status).to.be.within(200, 299);
};
