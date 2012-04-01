/*jshint boss:true browser:true laxcomma:true node:true strict:false undef:true */
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

exports.request = function(/* [method], [path], [query], [data], [headers], [callback] */) {
  var self = this
    , args = [].slice.call(arguments)
    , callback = exports.isFunction(args[args.length - 1]) && args.pop();

  exports._request(
    args[0] || 'GET',                           // method
    self.uri + (args[1] ? '/' + args[1] : ''),  // path
    args[2],                                    // query
    args[3] && JSON.stringify(args[3]) || '',   // body
    args[4],                                    // headers
    self.auth || {},                            // auth
    callback
  );

  return this;
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
    if (callback && xhr.readyState === 4) {
      var headers = getHeaders(xhr)
        , data = xhr.responseText
        , err;

      if (method === 'HEAD') {
        data = headers;
      } else {
        try {
          data = JSON.parse(data);
        } catch (e) {
          err = e;
        }
        if (!err) data = exports._response(data);
      }

      callback(err, data, xhr.status, headers, xhr);
    }
  };

  xhr.send(body);
};

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

var responseHeaders = [
  'cache-control',
  'content-length',
  'content-type',
  'date',
  'etag',
  'server'
];

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
  var sources = [].slice.call(arguments, 1)
    , source, key, i = 0, len = sources.length;
  while (i < len) {
    source = sources[i++];
    for (key in source) target[key] = source[key];
  }
  return target;
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
