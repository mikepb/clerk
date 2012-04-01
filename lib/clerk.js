/*jshint boss:true browser:true laxcomma:true */
/*!

    Clerk CouchDB for node and the browser.
    Copyright 2012 Michael Phan-Ba.

    Licensed under the Apache License, Version 2.0 (the "License")
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
    Create CouchDB client.

    @param {String} uri Fully qualified URI.
 */

module.exports = exports = function(uri) {
  var client, match;

  if (uri) {
    match = /^(https?:\/\/)(?:([^@:]+):([^@]+)@)?(.*?)\/*$/.exec(uri);
    if (match) uri = uri[1] + uri[4];
  }

  client = new exports.Client(uri);

  if (uri) {
    client.auth = {
      user: match[2] && decodeURIComponent(match[2]),
      pass: match[3] && decodeURIComponent(match[3])
    };
  }

  return client;
};

exports.version = '0.1.0pre';

/**
    Restore global variable 'clerk' to original value and return the library as an object.
 */

exports.noConflict = function() {
  window.clerk = exports._;
  return exports;
};

/**
    Service request and parse JSON response.

    @param {String} [method] HTTP method.
    @param {String} [path] HTTP path.
    @param {Object} [query] HTTP query options.
    @param {Object} [body] HTTP body.
    @param {Object} [headers] HTTP headers.
    @param {Function} callback Callback function.
      @param {Error|null} error Error or `null` on success.
      @param {Object} data Response data.
      @param {Integer} status Response status code.
      @param {Object} headers Response headers.
 */

exports.request = function(method, path, query, data, headers) {
  var self = this
    , args = arguments
    , nargs = args.length
    , uri = self.uri + (nargs < 3 ? '' : '/' + path)
    , auth = self.auth || {}
    , body = nargs < 5 ? '' : JSON.stringify(data)
    , callback = args[nargs - 1]
    , header;

  if (nargs < 6) headers = 0;
  if (nargs < 4) query = {};

  exports._request(method || GET, uri, query, body, headers, auth, callback);
};

exports._request = function(method, uri, query, body, headers, auth, callback) {
  var xhr = new XMLHttpRequest(), header;

  xhr.open(method, uri, true, auth.user, auth.pass);

  if (headers) {
    for (header in headers) {
      xhr.setRequestHeader(header, headers[header]);
    }
  }

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      var headers = getHeaders(xhr)
        , data = xhr.responseText;

      if (method === 'HEAD') {
        data = headers;
      } else {
        try {
          data = exports._response(JSON.parse(data));
        } catch (e) {
          err = e;
        }
      }

      if (callback) callback(null, data, xhr.status, headers, xhr);
    }
  };

  xhr.send(body);
};

var responseHeaders = [
  'Cache-Control',
  'Content-Length',
  'Content-Type',
  'Date',
  'ETag',
  'Server'
];

exports._response = function(json) {
  var data = json.rows || json.results || json.uuids;

  if (data) {
    json = exports.extend(data, json);
  } else {
    if (json.id) json._id = json.id;
    if (json.rev) json._rev = json.rev;
  }

  return json;
};

function getHeaders(xhr) {
  var headers = {}
    , header, i;

  for (i = 0; header = responseHeaders[i]; i++) {
    headers[header] = xhr.getResponseHeader(header);
  }

  return headers;
}

/**
    Copy properties from sources to target.

    @param {Object} target The target object.
    @param {Object..} sources The source object.
 */

exports.extend = function(target /* sources.. */) {
  var sources = Array.prototype.slice.call(arguments, 1), key, i;
  for (i = 0; source = sources[i]; i++) {
    for (key in source) target[key] = source[key];
  }
};

exports.asString = function(that) {
  return Object.prototype.toString.call(that);
};

exports.isString = function(that) {
  return exports.asString(that) === '[object String]';
};

exports.isObject = function(that) {
  return exports.asString(that) === '[object Object]';
};

exports.isFunction = function(that) {
  return exports.asString(that) === '[object Function]';
};

exports.unpackArgs = function(args, objectBeforeQuery) {
  args = Array.prototype.slice.call(args);
  args.f = exports.isFunction(args[args.length - 1]) && args.pop();
  args.q = exports.isObject(args[args.length - 1]) &&
           (!objectBeforeQuery || exports.isObject(args[args.length - 2])) &&
           args.pop() || {};
  return args;
};
