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
clerk._parseURI = function(uri) {
  var match;

  if (uri) {
    if (match = /^(https?:\/\/[^\/]*)(\/.*)\/*$/.exec(uri)) {
      return {
        host: match[1],
        path: match[2].replace(/\/+/g, '\/')
      };
    }
  }

  return { host: uri || 'http://127.0.0.1:5984', path: '' };
};

// request-based requests
Base._do = function(options) {
  var self = this
    , key, value;

  // ensure query Array values are JSON encoded
  for (key in options.query) {
    if (typeof(value = options.query[key]) === 'object') {
      options.query[key] = JSON.stringify(value);
    }
  }

  request({
    method: options.method,
    uri: options.uri,
    qs: options.query,
    headers: options.headers,
    body: options.body || '',
    json: false
  }, options.fn && function(err, res, data) {
    if (err) return options.fn(err);
    if (options.method == 'HEAD') {
      data = res.headers;
    } else if (!err && data && data.error) {
      err = self._error(data);
    } else {
      try {
        data = JSON.parse(data);
      } catch (e) {
        err = e;
      }
      if (!err) {
        data = self._response(data);
      }
    }

    var status, headers;
    if (res) status = res.statusCode, headers = res.headers;

    options.fn(err, data, status, headers, res);
  });
};

// Node.js compatible follow method, based on `follow` package.
DB.follow = function(/* [query], [headers], [callback] */) {
  var self = this
    , request = self._(arguments)
    , options = request.q
    , feed;

  if (!request.f) return self;

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

clerk.uuids = function(/* [count], [encoding], [nbytes] */) {
  var args = [].slice.call(arguments)
    , count = isNaN(+args[0]) ? 1 : parseInt(args.shift(), 10)
    , encoding = '' + args[0] === args[0] && args.shift();

  if (encoding !== 'hex' && encoding !== 'base64') encoding = 'hex';

  var nbytes = encoding === 'hex' || isNaN(+args[0]) ? 16 : parseInt(args.shift(), 10);

  var len = nbytes * count
    , bytes = crypto.randomBytes(len)
    , uuids = []
    , uuid
    , i;

  for (i = 0; i < len; i += nbytes) {
    uuid = bytes.slice(i, i + nbytes).toString(encoding);
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
                   .replace(/\//g, '~');
        break;
    }
    uuids.push(uuid);
  }

  return uuids;
};
