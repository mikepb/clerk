/*!

clerk - CouchDB client for node and the browser.
Copyright 2012-2015 Michael Phan-Ba

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

var clerk = require('./lib/clerk');
var crypto = require('crypto');
var follow = require('follow');

/**
 * Patchable prototypes.
 */

var DB = clerk.DB.prototype;

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

/**
 * Export clerk.
 */

module.exports = clerk;
