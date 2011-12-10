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

var assert = require('assert');

var clerk = require('../../lib/clerk');


/** Test fixtures. */

var client = exports.client = clerk.createClient({
  headers: { 'X-Couch-Full-Commit': 'false' }
});

var db = exports.db = client.database('test_suite_db');

exports.destroy = {
  'Database': {
    topic: db,
    'destroy': {
      topic: function(db) {
        db.destroy(this.callback);
      },
      'should delete database if it exists': function(err, data, res) {
        // bug COUCHDB-100: DELETE on non-existent DB returns 500 instead of 404
        assert.include([200, 404, 500], res.statusCode);
        switch (res.statusCode) {
          case 200: assert.isTrue(data.ok); break;
          case 404: assert.strictEqual(err, 'not_found'); break;
        }
      }
    }
  }
};

exports.create = {
  'Database': {
    topic: db,
    'create': {
      topic: function(db) {
        db.create(this.callback);
      },
      'should create database': function(err, data, res) {
        assert.strictEqual(res.statusCode, 201);
        assert.isTrue(data.ok);
      }
    }
  }
};

exports.save = function(db, text, doc, options) {
  var batch = { 'Database': { topic: db } };

  batch['Database'][text] = {
    topic: function(db) {
      db.save(doc, options, this.callback);
    },
    'should be ok': function(err, data, res) {
      assert.isTrue(data.ok);
    }
  };

  return batch;
};

exports.remove = function(db, text, doc, options) {
  var batch = { 'Database': { topic: db } };

  batch['Database'][text] = {
    topic: function(db) {
      db.remove(doc, options, this.callback);
    },
    'should be ok': function(err, data, res) {
      assert.isTrue(data.ok);
    }
  };

  return batch;
};

exports.isRemoved = function(db, text, id, options) {
  var batch = { 'Database': { topic: db } };

  batch['Database'][text] = {
    topic: function(db) {
      db.get(id, this.callback);
    },
    'should have return not found error': function(err, data, res) {
      assert.strictEqual(err, 'not_found');
      assert.deepEqual(data, { error: 'not_found', reason: 'deleted' });
    }
  };

  return batch;
};
