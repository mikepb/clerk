"use strict";

var browser = typeof window != "undefined";

var clerk = require(browser ? "../lib/clerk" : "../index");
var expect = require("expect.js");

exports.clerkFactory = function () {
  this.baseURL = "http://127.0.0.1:5984";
  this.dbname = "clerk-test-" + (1000 * Math.random() | 0);
  this.client = clerk(this.baseURL);
  this.db = this.client.db(this.dbname);
};

exports.docFactory = function () {
  this.doc = {
    _id: "0",
    hello: "world"
  };
  this.docs = [];
  for (var i = 1; i < 10; i++) {
    this.docs.push({
      _id: "" + i,
      hello: "world" + i
    });
  }
};

exports.forceDestroyDB = function (done) {
  this.db.destroy(function () {
    done();
  });
};

exports.createDB = function (done) {
  this.db.create(done);
};

exports.destroyDB = function (done) {
  this.db.destroy(done);
};

exports.shouldBeOk = function (body) {
  expect(body).to.have.property("ok", true);
};

exports.shouldHave2xxStatus = function (status) {
  expect(status).to.be.within(200, 299);
};
