/*jshint boss:true browser:false laxcomma:true node:true strict:false undef:true */
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

var clerk = module.exports = require('../clerk');

delete clerk.noConflict;
delete clerk._headers;
delete clerk._getHeaders;

var Base = clerk.Base;

/**
    Copy properties from sources to target.

    @param {Object} target The target object.
    @param {Object..} sources The source object.
 */

function extend(target /* sources.. */) {
  var sources = [].slice.call(arguments, 1)
    , source, key, i = 0;
  while (source = sources[i++]) {
    for (key in source) target[key] = source[key];
  }
  return target;
}

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
      else if (data) data = self._response(data);
      if (res) status = res.statusCode, headers = res.headers;
      callback(err, data, status, headers, res);
    }
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

clerk.uuids = function(count, encoding /* [query], [callback] */) {
  var args = exports.unpackArgs(arguments);

  if (isNaN(count = parseInt(count, 10))) {
    count = 1;
    encoding = count;
  }

  if (encoding !== 'hex' && encoding !== 'base64') encoding = 'hex';

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

  if (args.f) args.f(null, uuids);

  return uuids;
};
