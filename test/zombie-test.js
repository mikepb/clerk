var zombie = require("zombie")
  , expect = require("expect.js")
  , express = require('express');

describe('zombie', function(){

  before(function(done){
    this.app = express.createServer();
    this.app.use(express.logger());
    this.app.use(express.static(__dirname));
    this.app.use(express.errorHandler());
    this.server = this.app.listen(8888, done);
  });

  after(function(){
    this.server.close();
  });

  beforeEach(function(){
    this.browser = new zombie();
  });

  it('should pass tests', visit('http://127.0.0.1:8888'));
  it('should pass tests for minified version', visit('http://127.0.0.1:8888/index-min.html'));

  function visit(uri) {
    return function(done) {
      this.timeout(10000);
      this.browser.visit(uri, function(err, browser){
        if (!err) {
          expect(browser.success).to.be.ok();
        }
        done(err);
      });
    };
  }

});
