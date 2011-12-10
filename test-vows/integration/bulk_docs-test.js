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
  , merge = require('connector').merge
  , fixtures = require('./fixtures');


/** Test fixtures. */

var client = fixtures.client
  , db = fixtures.db;

var docs = factory(5);


/** Fixtures. */

function factory(start, end, template) {
  template = template ? JSON.stringify(templateDoc) : '{}';

  if (end === undefined) {
    end = start;
    start = 0;
  }

  var docs = [], doc;

  for (var i = start; i < end; ++i) {
    doc = eval('(' + template + ')');
    doc._id = '' + i;
    doc.integer = i;
    doc.string = '' + i;
    docs.push(doc);
  }

  return docs;
}


/** Bulk docs tests.
    Based on CouchDB 1.1.0 `bulk_docs.js` test script.
 */

var suite = vows.describe("Integration: bulk docs");

suite.addBatch(fixtures.destroy);
suite.addBatch(fixtures.create);

suite.addBatch({
  'Database': {
    topic: db,
    'bulk save 5 documents': {
      topic: function(db) {
        db.bulk(docs, this.callback);
      },
      'should have 5 results': function(err, data, res) {
        assert.strictEqual(data.length, 5);
      },
      'should have generated documents IDs': function(err, data, res) {
        for (var i = 0; i < 5; ++i) {
          assert.strictEqual(data[i].id, '' + i);
          assert.ok(data[i].rev);
        }
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'bulk update string': {
      topic: function(db) {
        for (var i = 0; i < 5; ++i) docs[i].string += '.00';
        db.bulk(docs, this.callback);
      },
      'should have 5 results': function(err, data, res) {
        assert.strictEqual(data.length, 5);
      },
      'should have documents IDs': function(err, data, res) {
        for (var i = 0; i < 5; ++i) assert.strictEqual(data[i].id, '' + i);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'bulk delete with conflict': {
      topic: function(db) {
        var callback = this.callback;
        for (var i = 0; i < 5; ++i) docs[i]._deleted = true;
        db.get('0', function(err, data, res) {
          db.save(data, function(err, data, res) {
            db.bulk(docs, callback);
          });
        });
      },
      'should have 5 results': function(err, data, res) {
        assert.strictEqual(data.length, 5);
      },
      'should have document 0 as a conflict': function(err, data, res) {
        assert.strictEqual(data[0].id, '0');
        assert.strictEqual(data[0].error, 'conflict');
        assert.isUndefined(data[0].rev);
      },
      'should have documents 1 - 4 be ok': function(err, data, res) {
        for (var i = 1; i < 5; ++i) {
          assert.strictEqual(data[i].id, '' + i);
          assert.ok(data[i].rev);
        }
      }
    }
  }
});

suite.addBatch(fixtures.isRemoved(db, 'get 1', '1'));
suite.addBatch(fixtures.isRemoved(db, 'get 2', '2'));
suite.addBatch(fixtures.isRemoved(db, 'get 3', '3'));
suite.addBatch(fixtures.isRemoved(db, 'get 4', '4'));

suite.addBatch({
  'Database': {
    topic: db,
    'bulk atomic delete with conflict': {
      topic: function(db) {
        var callback = this.callback;
        for (var i = 0; i < 5; ++i) docs[i]._deleted = true;
        db.get('0', function(err, doc, res) {
          docs[0] = merge({}, doc);
          db.bulk(doc, { atomic: true }, function(err, data, res) {
            db.save(docs, callback);
          });
        });
      },
      'should have 5 results': function(err, data, res) {
        assert.strictEqual(data.length, 5);
      },
      'should have be ok': function(err, data, res) {
        assert.isUndefined(data.error);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'bulk atomic save with conflict': {
      topic: function(db) {
        var callback = this.callback;
        db.get('0', function(err, doc, res) {
          docs[0] = merge({ shooby: 'dooby' }, doc);
          db.save(doc, function(err, data, res) {
            db.bulk(docs, { atomic: true }, callback);
          });
        });
      },
      'should have 5 results': function(err, data, res) {
        assert.strictEqual(data.length, 5);
      },
      'should have be ok': function(err, data, res) {
        assert.isUndefined(data.error);
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
        db.get('0', { conflicts: true }, function(err, doc, res) {
          db.get('0', { rev: doc._conflicts[0] }, function(err, conflict, res) {
            callback(err, doc, conflict);
          });
        });
      },
      'should return the updated document': function(err, doc, conflict) {
        assert.include([doc.shooby, conflict.shooby], 'dooby');
      }
    },
    'creating a document with no ID': {
      topic: function(db) {
        db.bulk([{ docs: [{ foo: 'bar' }] }], this.callback);
      },
      'should return a new ID': function(err, data, res) {
        assert.ok(data[0].id);
        assert.ok(data[0].rev);
      }
    },
    'creating a document with ID': {
      topic: function(db) {
        db.save({ _id: 'foobar', body: 'baz' }, this.callback);
      },
      'should have be ok': function(err, data, res) {
        assert.isTrue(data.ok);
      }
    }
  }
});

suite.addBatch({
  'Database': {
    topic: db,
    'failure on update/delete': {
      topic: function(db) {
        var id = 'foobar', rev = '1-d4545538e627c9c083b42805b25c694c';
        db.bulk([
          { _id: id, _rev: rev, body: 'blam' },
          { _id: id, _rev: rev, _deleted: true }
        ], this.callback);
      },
      'should return a conflict error': function(err, data, res) {
        assert.include([data[0].error, data[1].error], 'conflict');
      }
    }
  }
});

suite.addBatch(fixtures.destroy);

suite.export(module);
