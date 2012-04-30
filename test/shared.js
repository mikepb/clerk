if (typeof require != 'undefined') {
  var clerk = require('..')
    , expect = require('expect.js');
}

(function(){

  this.clerkFactory = function() {
    this.client = clerk('http://127.0.0.1:5984');
    this.db = this.client.db('clerk-test');
  };

  this.docFactory = function() {
    this.doc = { _id: '0', hello: 'world' };
    this.docs = [];
    for (var i = 1; i < 10; i++) {
      this.docs.push({ _id: '' + i, hello: 'world' + i });
    }
  };

  this.forceDestroyDB = function(done) {
    this.db.destroy(function(){
      done();
    });
  };

  this.createDB = function(done){
    this.db.create(done);
  };

  this.destroyDB = function(done){
    this.db.destroy(done);
  };

  this.shouldBeOk = function(body) {
    expect(body).to.have.property('ok', true);
  };

  this.shouldHave2xxStatus = function(status) {
    expect(status).to.be.within(200, 299);
  };

})();
