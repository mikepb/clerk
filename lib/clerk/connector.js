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

var url = require('url')
  , AgentConnector = require('connector').AgentConnector;


/** Connector for CouchDB.

    @param {Object} [options] Options. Accepts options from
      `connector.AgentConnector` if `options.connector` is not given.
      @param {Connector} [options.connector] Connector instance to use.
 */

var CouchConnector = exports.CouchConnector = function(options) {
  var port;

  options = options || {};

  // parse url
  if (options.url && typeof options.url !== 'object') {
    options.url = url.parse(options.url, true);
    port = options.url.port;
  }

  // default port
  if (!(port = port || options.port) || port < 0) {
    options.port = 5984;
  }

  this.connector = options.connector || new AgentConnector(options);
};


/** Service a request.

    @param {Object} [options] Options.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {ClientResponse} callback.response ClientResponse object.
 */

CouchConnector.prototype.request = function(options, callback) {
  var self = this;

  // convert data to JSON, including functions for views
  if (typeof options === 'function') {
    callback = options;
    options = null;
  } else if (options) {
    options.headers = options.headers || {};
    if (options.data && !options.data.on) {
      options.data = JSON.stringify(options.data, function(key, val) {
        return typeof val === 'function' ? val.toString() : val;
      });
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(options.data, 'utf8');
    } else if (options.data === '') {
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = '0';
    }
  }

  // pass options to connector
  var req = this.connector.request(options);

  if (callback) {

    req.on('response', function(res) {
      var buffer = [];

      // capture json body
      res.setEncoding('utf8');
      res.on('data', buffer.push.bind(buffer));

      // parse json data
      res.on('end', function() {

        // special case for head
        if (options.method === 'HEAD') return callback(null, res.headers, res);

        var body = buffer.join(''), data;

        // parse json data
        try {
          data = JSON.parse(body);
        } catch (err) {
          return callback(err, body, res);
        }

        // callback with parsed response
        self._response(data, res, callback);
      });

      res.on('error', callback);
    });

    req.on('error', callback);

  }

  return req;
};


CouchConnector.prototype._response = function(json, res, callback) {
  if (json.error) return callback(json.error, json, res);

  var data, props = {};

  if (json.rows && Array.isArray(json.rows)) {
    // view
    data = json.rows.slice();
    props.records = { value: json.total_rows };
  } else if (json.results && Array.isArray(json.results)) {
    // changes
    data = json.results.slice();
    props.lastSeq = { value: json.last_seq };
  } else if (json.uuids && Array.isArray(json.uuids)) {
    // uuids
    data = json.uuids.slice();
  }

  if (data) {
    for (var key in json) props[key] = { value: json[key] };
  } else {
    data = json;

    if (data.id) props._id = { value: data.id };
    else if (data._id) props.id = { value: data._id };

    if (data.rev) props._rev = { value: data.rev };
    else if (data._rev) props.rev = { value: data._rev };
  }

  Object.defineProperties(data, props);

  callback(null, data, res);
};


/** Close underlying connections.

    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {ClientResponse} callback.response ClientResponse object.
 */

CouchConnector.prototype.close = function(callback) {
  this.connector.close(callback);
};
