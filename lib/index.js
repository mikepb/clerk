/*!

    Clerk CouchDB for node and the browser.
    Copyright 2012 Michael Phan-Ba

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

var crypto = require('crypto')
  , request = require('request')
  , follow = require('follow');

var client = require('./client')
  , database = require('./database');

// import components
exports = module.exports = require('./clerk');
exports.extend(exports, client, database);
exports.extend(client, exports);
exports.extend(database, exports);
delete exports.noConflict;

// patch prototypes
client.Client.prototype.request = database.Database.prototype.request = exports.request;

// request can handle auth in URI
exports.createClient = function(uri) {
  uri = uri.replace(/\/*$/g, '');
  return new exports.Client(uri);
};

// request-based requests
exports._request = function(method, uri, query, body, headers, auth, callback) {
  request({
    method: method,
    uri: uri,
    qs: query,
    headers: headers,
    body: body,
    json: true
  }, function(err, res, data) {
    if (method === 'HEAD') data = res.headers;
    else if (data) data = exports._response(data);
    callback && callback(err, data, res.statusCode, res.headers, res);
  });
};

/**
    Generate UUIDs.

    @param {Integer} [count=1] Number of UUIDs to generate.
    @param {String} [encoding='hex'] UUID encoding. Set to `base64` to
      generate URL-safe Base64 encoded UUIDs.
    @param {Function} callback Callback function.
      @param {Error} err
      @param {String[]} uuids
*/

exports.uuids = function(count, encoding /* [query], [callback] */) {
  var args = exports.unpackArgs(arguments);

  if (isNaN(count = parseInt(count))) {
    count = 1;
    encoding = count;
  }

  if (!~['hex', 'base64'].indexOf(encoding)) encoding = 'hex';

  var len = 16 * count
    , bytes = crypto.randomBytes(len)
    , uuids = []
    , uuid
    , i;

  for (i = 0; i < len; i += 16) {
    uuid = bytes.slice(i, i + 16).toString(encoding);
    if (encoding === 'base64') {
      uuid = uuid.replace(/[=]+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    }
    uuids.push(uuid);
  }

  args.f && args.f(null, uuids);
};