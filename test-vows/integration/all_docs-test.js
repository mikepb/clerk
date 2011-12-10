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


/** All docs tests.
    Based on CouchDB 1.1.0 `all_docs.js` test script.
 */

var suite = vows.describe("Integration: _all_docs tests");

suite.addBatch(fixtures.destroy);
suite.addBatch(fixtures.create);

suite.addBatch(fixtures.save(db, 'save document 0', { _id: '0', a: 1, b: 1 }));
suite.addBatch(fixtures.save(db, 'save document 3', { _id: '3', a: 4, b: 16 }));
suite.addBatch(fixtures.save(db, 'save document 1', { _id: '1', a: 2, b: 4 }));
suite.addBatch(fixtures.save(db, 'save document 2', { _id: '2', a: 3, b: 9 }));

suite.addBatch({
  'Database': {
    topic: db,
    'all documents': {
      topic: function(db) {
        db.all(this.callback);
      },
      'should be ok': function(err, data, res) {
        assert.strictEqual(data.length, 4);
        data.forEach(function(row) {
          assert.isTrue(row.id <= '4');
        });
      }
    },
    'all documents with decending=true': {
      topic: function(db) {
        db.all({ decending: true }, this.callback);
      },
      'should be ok': function(err, data, res) {
        assert.strictEqual(data.length, 4);
      }
    },
    'all documents with startkey="2"': {
      topic: function(db) {
        db.all({ startkey: '2' }, this.callback);
      },
      'should be ok': function(err, data, res) {
        assert.strictEqual(data.offset, 2);
      }
    },
    'changes': {
      topic: function(db) {
        db.changes(this.callback);
      },
      'should return the docs in the order they were created': function(err, data, res) {
        assert.strictEqual(data.length, 4);
        assert.strictEqual(data[0].id, '0');
        assert.strictEqual(data[1].id, '3');
        assert.strictEqual(data[2].id, '1');
        assert.strictEqual(data[3].id, '2');
      }
    },
    'changes in reverse': {
      topic: function(db) {
        db.changes({ descending: true }, this.callback);
      },
      'should return the docs in reverse order they were created': function(err, data, res) {
        assert.strictEqual(data.length, 4);
        assert.strictEqual(data[0].id, '2');
        assert.strictEqual(data[1].id, '1');
        assert.strictEqual(data[2].id, '3');
        assert.strictEqual(data[3].id, '0');
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get and delete 1': {
      topic: function(db) {
        var callback = this.callback;
        db.get('1', function(err, data, res) {
          if (err) return callback(err, data, res);
          db.remove(data, callback);
        });
      },
      'should be ok': function(err, data, res) {
        assert.isTrue(data.ok);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'changes': {
      topic: function(db) {
        db.changes(this.callback);
      },
      'show deletion': function(err, data, res) {
        assert.strictEqual(data.length, 4);
        assert.strictEqual(data[3].id, '1');
        assert.isTrue(data[3].deleted);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'get and update 3': {
      topic: function(db) {
        var callback = this.callback;
        db.get('3', function(err, data, res) {
          if (err) return callback(err, data, res);
          data.updated = 'totally';
          db.save(data, callback);
        });
      },
      'should be ok': function(err, data, res) {
        assert.isTrue(data.ok);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'changes': {
      topic: function(db) {
        db.changes(this.callback);
      },
      'show update': function(err, data, res) {
        assert.strictEqual(data.length, 4);
        assert.strictEqual(data[3].id, '3');
      }
    },
    'changes with fetch=true': {
      topic: function(db) {
        db.changes({ fetch: true }, this.callback);
      },
      'should have 4 records': function(err, data, res) {
        assert.strictEqual(data.length, 4);
      },
      'should show update': function(err, data, res) {
        assert.strictEqual(data[3].id, '3');
        assert.ok(data[3].doc);
        assert.strictEqual(data[3].doc.updated, 'totally');
      },
      'should show delete': function(err, data, res) {
        assert.ok(data[2].doc);
        assert.isTrue(data[2].doc._deleted);
      }
    },
    'all keys=["1"] with fetch=true': {
      topic: function(db) {
        db.all({ fetch: true, keys: ['1'] }, this.callback);
      },
      'should have 1 record': function(err, data, res) {
        assert.strictEqual(data.length, 1);
        assert.strictEqual(data[0].key, '1');
        assert.strictEqual(data[0].id, '1');
        assert.isTrue(data[0].value.deleted);
        assert.isNull(data[0].doc);
      }
    }
  }
});

suite.addBatch(fixtures.save(db, 'save conflicting document 1', {
  _id: '3',
  _rev: '2-aa01552213fafa022e6167113ed01087',
  value: 'X'
}, { new_edits: false }));

suite.addBatch(fixtures.save(db, 'save conflicting document 2', {
  _id: '3',
  _rev: '2-ff01552213fafa022e6167113ed01087',
  value: 'Z'
}, { new_edits: false }));

suite.addBatch({
  'Database': {
    topic: db,
    'get document with conflicts': {
      topic: function(db) {
        var callback = this.callback;
        db.get('3', function(err, doc) {
          callback(err, db, doc);
        });
      },
      'changes': {
        topic: function(db, doc) {
          var callback = this.callback;
          db.changes({ fetch: true, conflicts: true, style: 'all_docs' }, function(err, changes) {
            callback(err, doc, changes);
          });
        },
        'should be ok': function(err, doc, changes) {
          assert.strictEqual(changes[3].id, '3');
          assert.strictEqual(changes[3].changes.length, 3);
          assert.strictEqual(changes[3].changes[0].rev, doc._rev);
          assert.strictEqual(changes[3].doc._id, '3');
          assert.strictEqual(changes[3].doc._rev, doc._rev);
          assert.isArray(changes[3].doc._conflicts);
          assert.strictEqual(changes[3].doc._conflicts.length, 2);
        }
      },
      'all': {
        topic: function(db, doc) {
          var callback = this.callback;
          db.all({ fetch: true, conflicts: true }, function(err, all) {
            callback(err, doc, all);
          });
        },
        'should be ok': function(err, doc, all) {
          assert.strictEqual(all.length, 3);
          assert.strictEqual(all[2].key, '3');
          assert.strictEqual(all[2].id, '3');
          assert.strictEqual(all[2].value.rev, doc._rev);
          assert.strictEqual(all[2].doc._rev, doc._rev);
          assert.strictEqual(all[2].doc._id, '3');
          assert.isArray(all[2].doc._conflicts);
          assert.strictEqual(all[2].doc._conflicts.length, 2);
        }
      }
    }
  }
});

suite.addBatch(fixtures.save(db, 'save document 1 for collating', { _id: 'Z', foo: 'Z' }));
suite.addBatch(fixtures.save(db, 'save document 1 for collating', { _id: 'a', foo: 'a' }));

suite.addBatch({
  'Database': {
    topic: db,
    'all startkey="Z" endkey="Z"': {
      topic: function(db) {
        db.all({ startkey: 'Z', endkey: 'Z' }, this.callback);
      },
      'should have 1 result': function(err, data, res) {
        assert.strictEqual(data.length, 1);
      }
    }
  }
});

suite.addBatch(fixtures.destroy);

suite.export(module);
