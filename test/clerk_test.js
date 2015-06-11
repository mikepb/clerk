"use strict";

var clerk = require("../clerk");
var expect = require("expect.js");
var shared = require("./shared");

var sinon = require("sinon");

describe("clerk", function () {
  before(shared.clerkFactory);

  describe("#Promise", function () {
    it("should default to the global Promise implementation", function () {
      var ThePromise;
      if (typeof Promise !== "undefined") ThePromise = Promise;
      expect(clerk.Promise).to.be(ThePromise);
    });
  });

  it("should delegate to clerk.make()", function () {
    sinon.spy(clerk, "make");
    clerk();
    expect(clerk.make.calledOnce).to.be.ok();
    clerk.make.restore();
  });

  describe("#make", function () {
    it("should make client", function () {
      var client = clerk.make();
      expect(client).to.be.a(clerk.Client);
      expect(client).to.have.property("uri", "http://127.0.0.1:5984");
    });

    it("should make client with URI", function () {
      var client = clerk.make("http://127.0.0.1:5984");
      expect(client).to.be.a(clerk.Client);
      expect(client).to.have.property("uri", "http://127.0.0.1:5984");
    });

    it("should make db with URI", function () {
      var db = clerk.make("http://127.0.0.1:5984/test");
      expect(db).to.be.a(clerk.DB);
      expect(db).to.have.property("uri", "http://127.0.0.1:5984/test");
    });
  });
});
