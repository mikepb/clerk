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

var fs = require('fs')
  , connector = require('connector');


/** Exports */

exports.merge = connector.merge;


/** Generate UUIDs.

    @param {Integer} [count] Number of UUIDs to generate.
    @param {String} [encoding] UUID encoding. Set to `base64` to generate
      URL-safe Base64 encoded UUIDs.
    @param {Function} [callback] Callback function.
    @return {String[]} Array of UUIDs.
 */

exports.uuids = function() {
  var args = Array.prototype.slice.call(arguments)
    , count = typeof args[0] === 'number' && parseInt(args.shift()) || 1
    , encoding = typeof args[0] === 'string' && args.shift()
    , callback = args.shift();

  var bytes = 16 * count
    , buffer = new Buffer(bytes)
    , slice = encoding === 'base64' ? base64Slice : hexSlice
    , fh = fs.openSync('/dev/urandom', 'r');

  fs.readSync(fh, buffer, 0, buffer.length, 0);
  fs.closeSync(fh);

  var uuids = [], offset;
  for (var i = 0; i < count; ++i) {
    offset = i * 16;
    uuids.push(slice(buffer, offset, offset + 16));
  }

  if (callback) callback(null, uuids);

  return uuids;
};

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function hexSlice(buffer, start, end) {
  var len = buffer.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var answer = [];
  for (var i = start; i < end; i++) {
    answer.push(toHex(buffer[i]));
  }

  return answer.join('');
}

function base64Slice(buffer, start, end) {
  return buffer.slice(start || 0, end || buffer.length)
               .toString('base64')
               .replace(/=+$/, '')
               .replace(/\+/g, '-')
               .replace(/\//g, '_');
}
