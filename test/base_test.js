"use strict";

var expect = require("expect.js");
var shared = require("./shared");

describe("Base", function () {
  before(shared.clerkFactory);

  describe("#request()", function () {

    it("should send a request", function (done) {
      this.client.request("GET", function (err, body, status) {
        if (!err) {
          expect(body).to.be.an("object");
          shared.shouldHave2xxStatus(status);
        }
        done(err);
      });
    });

    if (typeof Promise != "undefined") describe("with promises", function () {

      it("should return a promise", function () {
        var promise = this.client.request("GET");
        expect(promise).to.be.a(Promise);
        return promise;
      });

      it("should abort a request", function () {
        var promise = this.client.request("GET");
        expect(promise).to.be.a(Promise);
        return promise.abort().catch(function (err) {
          expect(err).to.have.property("message", "abort");
        });
      });

    });

  });

});
