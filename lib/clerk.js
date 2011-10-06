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


/** Exports. */

exports.Client = require('./clerk/client').Client;
exports.Connector = require('./clerk/connector').CouchConnector;
exports.Database = require('./clerk/database').Database;

exports.uuids = require('./clerk/util').uuids;


/** Create CouchDB client.

    @param {Object} [options] Options. Accepts options from
      `connector.AgentConnector` if `options.connector` is not given.
      @param {Connector} [options.connector] Connector instance to use.
 */

exports.createClient = function(options) {
  return new exports.Client(options);
};
