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

/**
 * Module dependencies.
 */

var crypto = require('crypto')
  , request = require('request')
  , follow = require('follow');

/**
 * Clerk library.
 */

require('./clerk');
var clerk = module.exports = global.clerk.noConflict();

/**
 * Patchable prototypes.
 */

var Base = clerk.Base.prototype
  , DB = clerk.DB.prototype;

/**
 * Remove irrelevant methods.
 */

delete clerk.noConflict;
delete Base._headers;
delete Base._getHeaders;

// auth uris are automatically handled
Base._parseURI = function(uri) {
  if (uri) uri = uri.replace(/\/+/g, '\/').replace(/\/+$/g, '');
  return { host: uri || 'http://127.0.0.1:5984' };
};

// request-based requests
Base._request = function(method, uri, query, body, headers, auth, callback) {
  var self = this, status;
  request({
    method: method,
    uri: uri,
    qs: query,
    headers: headers,
    body: body || '',
    json: true
  }, function(err, res, data) {
    if (callback) {
      if (method === 'HEAD') data = res.headers;
      if (!err && data) data = self._response(data);
      if (res) status = res.statusCode, headers = res.headers;
      callback(err, data, status, headers, res);
    }
  });
};

// Node.js compatible follow method, based on `follow` package.
DB.follow = function(/* [query], [headers], [callback] */) {
  var self = this
    , request = self._(arguments)
    , options = request.q
    , feed;

  delete options.feed;
  options.db = self.uri;
  options.headers = request.h;
  feed = new follow.Feed(options);

  feed
    .on('change', function(body){
      var stop = request.f.call(this, null, self._response(body), 200, {}, this);
      if (stop === false) feed.stop();
    })

    .on('error', function(err){
      request.f.call(this, err, null, 0, {}, this);
    })

    .follow();

  return self;
};

/**
 * Generate UUIDs.
 *
 * @param {Integer} [count=1] Number of UUIDs to generate.
 * @param {String} [encoding="hex"] UUID encoding. Set to `base64` to generate
 *   URL-safe Base64 encoded UUIDs.
 * @param {Function} [callback] Callback function.
 *   @param {Error} err
 *   @param {String[]} uuids
 */

clerk.uuids = function(count, encoding) {
  var args = [].slice.call(arguments)
    , callback = typeof args[args.length - 1] === 'function' && args.pop();

  if (!isNaN(+count)) {
    count = parseInt(count, 10);
  } else {
    encoding = count, count = 1;
  }

  if (encoding !== 'hex' && encoding !== 'base64') encoding = 'hex';

  var len = 16 * count
    , bytes = crypto.randomBytes(len)
    , uuids = []
    , uuid
    , i;

  for (i = 0; i < len; i += 16) {
    uuid = bytes.slice(i, i + 16).toString(encoding);
    switch (encoding) {
      case 'hex':
        uuid = uuid.substr(0, 8) + '-' +
               uuid.substr(8, 4) + '-' +
               uuid.substr(12, 4) + '-' +
               uuid.substr(16, 4) + '-' +
               uuid.substr(20);
        break;
      case 'base64':
        uuid = uuid.replace(/[=]+$/, '')
                   .replace(/\+/g, '-')
                   .replace(/\//g, '_');
        break;
    }
    uuids.push(uuid);
  }

  return uuids;
};
