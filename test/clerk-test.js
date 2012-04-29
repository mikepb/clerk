if (typeof require != 'undefined') {
  var clerk = require('clerk')
    , expect = require('expect.js');
}

describe('clerk', function(){

  beforeEach(function(){
    this.client = new clerk.Client('http://127.0.0.1:5984');
  });

});
