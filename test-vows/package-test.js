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
  , assert = require('assert')
  , fs = require('fs');

var clerk = require('../lib/clerk');

/** Specs. */

vows.describe('package').addBatch({
  'when describing the module': {
    topic: JSON.parse(fs.readFileSync(__dirname + '/../package.json', 'utf8')),
    'should have the same version as clerk.js': function(pkg) {
      assert.equal(pkg.version, clerk.version);
    }
  },
  'when describing the history': {
    topic: fs.readFileSync(__dirname + '/../HISTORY.md', 'utf8'),
    'should have an entry for the current version': function(history) {
      assert.isTrue(!!~history.indexOf(clerk.version));
    }
  }
}).export(module);
