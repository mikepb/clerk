if (typeof require != 'undefined') {
  var clerk = require('..')
    , expect = require('expect.js')
    , sinon = require('sinon')
    , fs = require('fs');
}

describe('clerk', function(){
  before(clerkFactory);

  it('should delegate to clerk.make()', function(){
    sinon.spy(clerk, 'make');
    clerk();
    expect(clerk.make.calledOnce).to.be.ok();
    clerk.make.restore();
  });

  if (typeof require != 'undefined') describe('#uuids', function(){

    it('shoud return 1 uuid by default', function(){
      var uuids = clerk.uuids();
      expect(uuids).to.be.an('array');
      expect(uuids).to.have.length(1);
    });

    shouldReturnUUIDs(1);
    shouldReturnUUIDs(2);
    shouldReturnUUIDs(3);
    shouldReturnUUIDs(100);

    shouldReturnUUIDs(1, 'hex');
    shouldReturnUUIDs(2, 'hex');
    shouldReturnUUIDs(3, 'hex');
    shouldReturnUUIDs(100, 'hex');

    shouldReturnUUIDs(1, '123');
    shouldReturnUUIDs(2, '123');
    shouldReturnUUIDs(3, '123');
    shouldReturnUUIDs(100, '123');

    shouldReturnUUIDs(1, 'base64');
    shouldReturnUUIDs(2, 'base64');
    shouldReturnUUIDs(3, 'base64');
    shouldReturnUUIDs(100, 'base64');

    shouldReturnUUIDs(1, 'base64', 32);
    shouldReturnUUIDs(2, 'base64', 32);
    shouldReturnUUIDs(3, 'base64', 32);
    shouldReturnUUIDs(100, 'base64', 32);

    function shouldReturnUUIDs(n, encoding, nbytes) {
      if (!nbytes) nbytes = 16;
      var base64re = new RegExp('[0-9a-z\\-~]{' + Math.ceil(nbytes * 8 / 6) + '}', 'i');
      it('shoud return ' + n + ' uuid', function(){
        var uuids = clerk.uuids(n, encoding, nbytes);
        expect(uuids).to.be.an('array');
        expect(uuids).to.have.length(n);
        uuids.forEach(function(uuid){
          expect(uuid).to.match(
            encoding === 'base64' ? base64re :
            /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
          );
        });
      });
    }

  });

  if (fs) describe('package', function(){

    before(function(done){
      var self = this;
      fs.readFile('package.json', function(err, source){
        self.source = source.toString();
        done(err);
      });
    });

    before(function(){
      this.package = JSON.parse(this.source);
    });

    it('should match package.json version', function(){
      expect(clerk).to.have.property('version', this.package.version);
    });

  });

  describe('#make', function(){

    it('should make client', function(){
      var client = clerk.make();
      expect(client).to.be.a(clerk.Client);
      expect(client).to.have.property('uri', typeof require != 'undefined' ? 'http://127.0.0.1:5984' : '');
    });

    it('should make client with URI', function(){
      var client = clerk.make('http://127.0.0.1:5984');
      expect(client).to.be.a(clerk.Client);
      expect(client).to.have.property('uri', 'http://127.0.0.1:5984');
    });

    it('should make db with URI', function(){
      var db = clerk.make('http://127.0.0.1:5984/test');
      expect(db).to.be.a(clerk.DB);
      expect(db).to.have.property('uri', 'http://127.0.0.1:5984/test');
    });

  });

});
