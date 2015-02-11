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

  });

});
