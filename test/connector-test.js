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

var Connector = require('../lib/clerk').Connector;


/** Specs. */

var suite = vows.describe('CouchConnector');

suite.addBatch({
  'Constructor': {
    'created with no options': {
      topic: new Connector,
      'should set port option on underlying connector': function(connector) {
        assert.strictEqual(connector.connector.port, 5984);
      }
    },
    'created with empty options': {
      topic: function() {
        var options = {};
        this.callback(null, new Connector(options), options);
      },
      'should set port option': function(err, connector, options) {
        assert.strictEqual(options.port, 5984);
      }
    },
    'created with port': {
      topic: new Connector({ port: 8888 }),
      'should use port option': function(connector) {
        assert.strictEqual(connector.connector.port, 8888);
      }
    },
    'created with a URL with port': {
      topic: new Connector('http://localhost:8888'),
      'should use port option': function(connector) {
        assert.strictEqual(connector.connector.port, 8888);
      }
    },
    'created with connector option': {
      topic: function() {
        var options = { connector: {} };
        this.callback(null, new Connector(options), options);
      },
      'should use connector': function(err, connector, options) {
        assert.strictEqual(connector.connector, options.connector);
      }
    }
  }
});

suite.addBatch({
});

suite.export(module);
