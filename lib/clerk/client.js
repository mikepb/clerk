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

var Connector = require('./connector').CouchConnector
  , Database = require('./database').Database
  , util = require('./util');


/** CouchDB client.

    @param {Object} [options] Options. Accepts options from
      `connector.AgentConnector` if `options.connector` is not given.

      @param {Connector} [options.connector] Connector instance to use.

      @param {String} [options.url] Configure using URL. Overridden by itemized
        options.
      @param {Agent} [options.agent] HTTP agent. If not given, created
        automatically from `socket`.
      @param {module} [options.socket] HTTP socket. Defaults to `https` if
        `options.secure` is true, `http` otherwise.
      @param {Integer} [options.maxSockets=8] Maximum number of sockets for
        newly created HTTP agents.
      @param {String} [options.host="127.0.0.1"] HTTP host. Sets the `Host`
      	header in `options.headers`.
      @param {String} [options.port] HTTP port. Defaults to `443` when
        `options.secure` is true, `80` otherwise
      @param {String} [options.path=""] HTTP path prefix to prepend to
      	relative request paths.
      @param {Object} [options.query] HTTP query parameters.
      @param {String} [options.hash] HTTP hash component.
      @param {String} [options.method="GET"] HTTP method.
      @param {Object} [options.headers] HTTP headers. The `Host` header has
      	a default value of `options.host`. The `Connection` header has a
      	default value of `keep-alive`. If `options.auth` is provided, the
      	`Authorization` header is also populated.
      @param {Object} [options.auth] HTTP basic authentication. If at least
      	`options.auth.username` is given, populates the `Authorization`
      	header in `options.headers`.
        @param {String} [options.username] Username.
        @param {String} [options.password] Password.

    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Complete_HTTP_API_Reference)
 */

var Client = exports.Client = function(options) {
  options = options || {};
  this.connector = options.connector || new Connector(options);
};


util.merge(Client.prototype,
  require('./client.info'),
  require('./client.util')
);


/** Select database to manipulate.

    @param {String} name Database name.
    @return {Database} Database object.
 */

Client.prototype.database = function(name) {
  return new Database({ client: this, name: name });
};


/** Service request and parse JSON response.

    @param {String} [method] HTTP method.
    @param {String} [path] HTTP path.
    @param {Object} [query] HTTP query options.
    @param {Object} [headers] HTTP headers.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @return {event.EventEmitter} Promise to emit response events.
 */

Client.prototype.request = function(/* [method, [path, [query, [data, [headers]]]]], [callback] */) {

  // unpack arguments
  var args = Array.prototype.slice.call(arguments)
    , callback = typeof args[args.length - 1] === 'function' && args.pop();

  // pass options to connector
  return this._request({
    method: args[0],
    path: args[1],
    query: args[2],
    data: args[3],
    headers: args[4]
  }, callback);
};

Client.prototype._request = function(options, callback) {
  return this.connector.request(options, callback);
};
