/*!

  Copyright 2011 Michael Phan-Ba

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

 */


/** Module dependencies. */

var vows = require('vows')
  , assert = require('assert');

var clerk = require('../../lib/clerk')
  , fixtures = require('./fixtures');


/** Test fixtures. */

var client = fixtures.client
  , db = fixtures.db;

var map = function(doc) {
  if (doc.a === 4) emit(null, doc.b);
};

var reduce = function(keys, values) {
  return sum(values);
};


/** Basic tests.
    Based on CouchDB 1.1.0 `all_docs.js` test script.
 */

var suite = vows.describe("Integration: Basic tests");

suite.addBatch({
  'Client': {
    topic: client,
    'info': {
      topic: function(client) {
        client.info(this.callback);
      },
      'should have welcome message': function(err, data) {
        assert.strictEqual(data.couchdb, 'Welcome');
      }
    }
  }
});

suite.addBatch(fixtures.destroy);
suite.addBatch(fixtures.create);

suite.addBatch({
  'Database': {
    topic: db,
    'create with existing database': {
      topic: function(db) {
        db.create(this.callback);
      },
      'should return status 412': function(err, data, res) {
        assert.strictEqual(res.statusCode, 412);
      }
    }
  }
});

suite.addBatch({
  'Database with simple name': {
    topic: db,
    'delete': {
      topic: function(db) {
        var self = this;
        db.destroy(function() {
          self.callback(null, db);
        });
      },
      'create': {
        topic: function(db) {
          db.create(this.callback);
        },
        'should return Location header': function(err, data, res) {
          assert.strictEqual(res.headers.location, 'http://127.0.0.1/test_suite_db');
        }
      }
    }
  },
  'Database with name with slashes': {
    topic: client.database('test_suite_db/with_slashes'),
    'delete': {
      topic: function(db) {
        var self = this;
        db.destroy(function() {
          self.callback(null, db);
        });
      },
      'create': {
        topic: function(db) {
          db.create(this.callback);
        },
        'should return Location header': function(err, data, res) {
          assert.strictEqual(res.headers.location, 'http://127.0.0.1/test_suite_db%2Fwith_slashes');
        }
      }
    }
  }
});

suite.addBatch({
  'Database with simple name': {
    topic: db,
    'info': {
      topic: function(db) {
        db.info(this.callback);
      },
      'should include the database name': function(err, data, res) {
        assert.strictEqual(data.db_name, 'test_suite_db');
      },
      'should have no documents': function(err, data, res) {
        assert.strictEqual(data.doc_count, 0);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'save 0': {
      topic: function(db) {
        db.save({ _id: '0', a:1, b:1 }, this.callback);
      },
      'should be ok': function(err, data, res) {
        assert.isTrue(data.ok);
      },
      'should include the document ID': function(err, data, res) {
        assert.strictEqual(data.id, '0');
      },
      'should include the document revision': function(err, data, res) {
        assert.strictEqual(data.rev, '1-fb8a93eb436b7e799a7bbc578a08e9a5');
      },
      'should alias data.id and data._id': function(err, data, res) {
        assert.strictEqual(data.id, data._id);
      },
      'should alias data.rev and data._rev': function(err, data, res) {
        assert.strictEqual(data.rev, data._rev);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get 0 with revs="info"': {
      topic: function(db) {
        db.get('0', { revs: 'info' }, this.callback);
      },
      'should include revision data': function(err, data, res) {
        assert.ok(data._revs_info)
        assert.strictEqual(data._revs_info.length, 1)
        assert.deepEqual(data._revs_info[0], {
          rev: '1-fb8a93eb436b7e799a7bbc578a08e9a5',
          status: 'available'
        })
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get 0 with seq=true': {
      topic: function(db) {
        db.get('0', { local_seq: true }, this.callback);
      },
      'should include the sequence number': function(err, data, res) {
        assert.strictEqual(data._local_seq, 1)
      }
    }
  }
});

suite.addBatch(fixtures.save(db, 'save document 1', { _id: '1', a: 2, b: 4 }));
suite.addBatch(fixtures.save(db, 'save document 2', { _id: '2', a: 3, b: 9 }));
suite.addBatch(fixtures.save(db, 'save document 3', { _id: '3', a: 4, b: 16 }));

suite.addBatch({
  'Database': {
    topic: db,
    'view': {
      topic: function(db) {
        db.view(map, this.callback);
      },
      'should have 1 result': function(err, data, res) {
        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].value, 16);
      }
    },
    'info': {
      topic: function(db) {
        db.info(this.callback);
      },
      'should have 4 documents': function(err, data, res) {
        assert.strictEqual(data.doc_count, 4);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get 0': {
      topic: function(db) {
        var callback = this.callback;
        db.get('0', function(err, data, res) {
          callback(err, db, data, res);
        });
      },
      'should have value a=1': function(err, db, data, res) {
        assert.strictEqual(data.a, 1);
      },
      'modify a=4 and save': {
        topic: function(db, data) {
          data.a = 4;
          db.save(data, this.callback);
        },
        'should be ok': function(err, data, res) {
          assert.isTrue(data.ok);
        }
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'view': {
      topic: function(data) {
        db.view(map, this.callback);
      },
      'should have two results': function(err, data, res) {
        assert.strictEqual(data.length, 2);
      }
    }
  }
});

suite.addBatch(fixtures.save(db, 'save document 1 without ID', { a: 3, b: 9 }));
suite.addBatch(fixtures.save(db, 'save document 2 without ID', { a: 4, b: 16 }));

suite.addBatch({
  'Database': {
    topic: db,
    'view': {
      topic: function(db) {
        db.view(map, this.callback);
      },
      'should have 3 results': function(err, data, res) {
        assert.strictEqual(data.length, 3);
      }
    },
    'info': {
      topic: function(db) {
        db.info(this.callback);
      },
      'should have 6 documents': function(err, data, res) {
        assert.strictEqual(data.doc_count, 6);
      }
    },
    'view': {
      topic: function(db) {
        db.view({ map: map, reduce: reduce }, this.callback);
      },
      'should have a value of 33': function(err, data, res) {
        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].value, 33);
      }
    }
  }
});

suite.addBatch(fixtures.remove(db, 'save document 2 without ID', {
  _id: '0',
  _rev: '2-f11d7cac727db1834815181e355127f6'
}));

suite.addBatch(fixtures.isRemoved(db, 'get 0', '0'));

suite.addBatch({
  'Database': {
    topic: db,
    'view': {
      topic: function(db) {
        db.view(map, this.callback);
      },
      'should have 2 results': function(err, data, res) {
        assert.strictEqual(data.length, 2);
      }
    },
    'info': {
      topic: function(db) {
        db.info(this.callback);
      },
      'should have 6 documents': function(err, data, res) {
        assert.strictEqual(data.doc_count, 5);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get 0': {
      topic: function(db) {
        db.get('0', '2-f11d7cac727db1834815181e355127f6', this.callback);
      },
      'should return old revision of deleted document': function(err, data, res) {
        assert.isNull(err);
      }
    },
    'commit': {
      topic: function(db) {
        db.commit(this.callback);
      },
      'should have 6 documents': function(err, data, res) {
        assert.isTrue(data.ok);
      }
    }
  }
});

suite.addBatch({
  'Client': {
    topic: client,
    'restart': function(client) {
      client.restart(function(){});
    }
  }
});

suite.addBatch({
  'Wait 2 second': {
    topic: function() {
      var callback = this.callback;
      setTimeout(function() { callback(null, true) }, 2000);
    },
    'should be ok': function(err, ok) {
      assert.isTrue(ok);
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get 0': {
      topic: function(db) {
        db.get('0', '2-f11d7cac727db1834815181e355127f6', this.callback);
      },
      'should return old revision of deleted document': function(err, data, res) {
        assert.isNull(err);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'post document with no ID': {
      topic: function(db) {
        db.post({ foo: 'bar' }, this.callback);
      },
      'should be ok': function(err, data, res) {
        assert.isTrue(data.ok);
      },
      'should return Location header': function(err, data, res) {
        assert.ok(res.headers.location);
        var paths = res.headers.location.split('/').slice(-2);
        assert.deepEqual(
          res.headers.location.split('/').slice(-2),
          [ 'test_suite_db', data.id ]
        );
      }
    },
    'post oppossum': {
      topic: function(db) {
        db.post({ _id: 'oppossum', yar: 'matey' }, this.callback);
      },
      'should be ok': function(err, data, res) {
        assert.isTrue(data.ok);
      },
      'should return Location header': function(err, data, res) {
        assert.ok(res.headers.location);
        assert.strictEqual(data.id, 'oppossum');
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get oppossum': {
      topic: function(db) {
        db.get('oppossum', this.callback);
      },
      'should have value yar="matey"': function(err, data, res) {
        assert.strictEqual(data.yar, 'matey');
      }
    },
    'put newdoc': {
      topic: function(db) {
        db.put('newdoc', { a: 1 }, this.callback);
      },
      'should have Location header': function(err, data, res) {
        assert.strictEqual(res.headers.location, 'http://127.0.0.1/test_suite_db/newdoc');
      }
    },
    'remove non-existent document': {
      topic: function(db) {
        db.remove('doc-does-not-exist', this.callback);
      },
      'should return not_found error': function(err, data, res) {
        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(err, 'not_found');
      }
    }
  }
});

[
  { _id: 'goldfish', _zing: 4 },
  { _id: 'zebrafish', _zoom: 'hello' },
  { _id: 'mudfish', zane: 'goldfish', _fan: 'something smells delicious' },
  { _id: 'tastyfish', _bing: { 'wha?': 'soda can' } }
].forEach(function(doc) {
  var context = { topic: db };

  context['save invalid document ' + doc._id] = {
    topic: function(db) {
      db.save(doc, this.callback);
    },
    'should return an error': function(err, data, res) {
      assert.strictEqual(err, 'doc_validation');
      assert.strictEqual(data.error, 'doc_validation');
      assert.strictEqual(res.statusCode, 500);
    }
  };

  suite.addBatch({ 'Database': context });
});

suite.addBatch({
  'Database': {
    topic: db,
    'put array': {
      topic: function(db) {
        db.put('bar', [], this.callback);
      },
      'should return bad content request error': function(err, data, res) {
        assert.strictEqual(err, 'bad_request');
        assert.strictEqual(data.error, 'bad_request');
        assert.strictEqual(data.reason, 'Document must be a JSON object');
        assert.strictEqual(res.statusCode, 400);
      }
    },
    'all with keys=1': {
      topic: function(db) {
        db.all({ keys: 1 }, this.callback);
      },
      'should return bad content type error': function(err, data, res) {
        assert.strictEqual(err, 'bad_request');
        assert.strictEqual(data.error, 'bad_request');
        assert.strictEqual(data.reason, '`keys` member must be a array.');
        assert.strictEqual(res.statusCode, 400);
      }
    },
    'remove with no document id': {
      topic: function(db) {
        db.remove('', 'foobarbaz', this.callback);
      },
      'should return bad request error': function(err, data, res) {
        assert.strictEqual(err, 'bad_request');
        assert.strictEqual(data.error, 'bad_request');
        assert.strictEqual(data.reason, 'You tried to DELETE a database with a ?=rev parameter. Did you mean to DELETE a document instead?');
        assert.strictEqual(res.statusCode, 400);
      }
    }
  }
});

suite.addBatch(fixtures.destroy);

suite.export(module);
