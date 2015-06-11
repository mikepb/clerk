"use strict";

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

// Module dependencies.
var request = require("superagent");

/**
 * Copy properties from sources to target.
 *
 * @param {Object} target The target object.
 * @param {...Object} sources The source object.
 * @return {Object} The target object.
 * @private
 */

var extend = function (target /* ...sources */) {
  var source, key, i = 1;
  while (source = arguments[i++]) {
    for (key in source) target[key] = source[key];
  }
  return target;
};

/**
 * Stringify value.
 *
 * @param {Object} that That value to stringify.
 * @return {String} The stringifyed value.
 * @private
 */

var asString = function (that) {
  return Object.prototype.toString.call(that);
};

/**
 * Check if value is a string.
 *
 * @param {Object} that That value to check.
 * @return {Boolean} `true` if string, `false` otherwise.
 * @private
 */

var isString = function (that) {
  return asString(that) == "[object String]";
};

/**
 * Check if value is an object.
 *
 * @param {Object} that That value to check.
 * @return {Boolean} `true` if object, `false` otherwise.
 * @private
 */

var isObject = function (that) {
  return asString(that) == "[object Object]";
};

/**
 * Check if value is an array.
 *
 * @param {Object} that That value to check.
 * @return {Boolean} `true` if array, `false` otherwise.
 * @private
 */

var isArray = function (that) {
  return asString(that) == "[object Array]";
};

/**
 * Check if value is a function.
 *
 * @param {Object} that That value to check.
 * @return {Boolean} `true` if function, `false` otherwise.
 * @private
 */

var isFunction = function (that) {
  return asString(that) == "[object Function]";
};

/**
 * Clerk library entry point.
 *
 * @param {String} uri CouchDB server URI.
 * @return {Client|DB} If a URI path is given, returns a `DB`, otherwise
 *   returns a `Client`.
 * @see {@link http://docs.couchdb.org|CouchDB Documentation}
 * @see {@link http://guide.couchdb.org/|CouchDB Guide}
 * @see {@link http://wiki.apache.org/couchdb/|CouchDB Wiki}
 */

function clerk (uri) {
  return clerk.make(uri);
};

/**
 * Promise implementation.
 * @type {Promise}
 */

clerk.Promise = typeof Promise !== "undefined" && Promise;

/**
 * Library version.
 * @type {String}
 */

clerk.version = "0.8.2";

/**
 * Default host.
 * @type {String}
 */

clerk.defaultHost = "http://127.0.0.1:5984";

/**
 * Create single CouchDB client.
 *
 * @param {String} uri Fully qualified URI.
 * @return {Client|DB} If `uri` has a path, the last segment of the
 *    path is used as the database name and a `DB` instance is
 *    returned. Otherwise, a `Client` instance is returned.
 */

clerk.make = function (uri) {
  if (!uri) return new Client(this.defaultHost);

  uri = clerk._parseURI(uri);

  var db = /\/*([^\/]+)\/*$/.exec(uri.path);
  if (db) {
    uri.path = uri.path.substr(0, db.index);
    db = db[1] && decodeURIComponent(db[1]);
  }

  // weird way of doing it, but it's more efficient...
  if (uri.auth) uri.auth = 'Basic ' + clerk.btoa(uri.auth);

  var client = new clerk.Client(uri.base + uri.path, uri.auth);
  return db ? client.db(db) : client;
};

/**
 * Base64-encode a string.
 *
 * @param {String} str
 * @return {String}
 */

clerk.btoa = typeof Buffer != "undefined" ? function (str) {
  return new Buffer(str).toString("base64");
} : function (str) {
  return btoa(str);
};

/**
 * Parse URI.
 *
 * The URI is normalized by removing extra `//` in the path.
 *
 * @param {String} uri Fully qualified URI.
 * @return {String} The normalized URI.
 * @private
 */

clerk._parseURI = function (uri) {
  var match;

  if (uri) {
    if (match = /^(https?:\/\/)(?:([^\/@]+)@)?([^\/]+)(.*)\/*$/.exec(uri)) {
      return {
        base: match[1] + match[3].replace(/\/+/g, "\/"),
        path: match[4],
        auth: match[2] && decodeURIComponent(match[2])
      };
    }
  }

  return { base: uri || "", path: "" };
};

/**
 * Base prototype for `Client` and `DB`.
 * Encapsulates HTTP methods, JSON handling, and response coersion.
 *
 * @constructor
 * @memberof clerk
 */

function Base () {};

/**
 * Service request and parse JSON response.
 *
 * @param {String} [method=GET] HTTP method.
 * @param {String} [path=this.uri] HTTP URI.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [body] HTTP body.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise}
 */

Base.prototype.request = function (/* [method], [path], [query], [body], [headers], [callback] */) {
  var args = [].slice.call(arguments);
  var callback = isFunction (args[args.length - 1]) && args.pop();

  return this._request({
    method: args[0],
    path: args[1],
    query: args[2],
    data: args[3],
    headers: args[4],
    fn: callback
  });
};

/**
 * Internal service request and parse JSON response handler.
 *
 * @param {String} options
 *   @param {String} method HTTP method.
 *   @param {String} path HTTP URI.
 *   @param {Object} query HTTP query options.
 *   @param {Object} data HTTP body data.
 *   @param {Object} headers HTTP headers.
 * @param {handler} [callback] Callback function.
 * @private
 */

Base.prototype._request = function (options) {
  var self = this;

  if (options.method == null) options.method = "GET";
  if (options.headers == null) options.headers = {};
  if (options.auth == null) options.auth = this.auth;

  options.path = options.path ? "/" + options.path : "";

  // set default headers
  if (options.headers["Content-Type"] == null) {
    options.headers["Content-Type"] = "application/json";
  }
  if (options.headers["Accept"] == null) {
    options.headers["Accept"] = "application/json";
  }
  if (this.auth && options.headers["Authorization"] == null) {
    options.headers["Authorization"] = this.auth;
  }

  options.uri = this.uri + options.path;
  options.body = options.data && JSON.stringify(options.data,
    /^\/_design/.test(options.path) && this._replacer
  ) || "";

  // create promise if no callback given
  var promise, req;
  if (!options.fn && clerk.Promise) {
    promise = new clerk.Promise(function (resolve, reject) {
      options.fn = function (err, data, status, headers, res) {
        if (err) {
          err.body = data;
          err.status = status;
          err.headers = headers;
          err.res = res;
          reject(err);
        } else {
          if (isObject(data) && Object.defineProperties) {
            Object.defineProperties(data, {
              _status: { value: status },
              _headers: { value: headers },
              _response: { value: res },
            });
          }
          resolve(data);
        };
      };
    });
    req = send();
    promise.request = req;
    promise.abort = function () {
      req.abort();
      options.fn(new Error("abort"));
      return promise;
    };
    return promise;
  }

  send();

  function send () {
    // apply response transforms
    var g = options._;
    var fn = options.fn;
    if (fn) {
      options.fn = g ? function () {
        fn.apply(self, g.apply(self, arguments) || arguments);
      } : fn;
    }
    return self._do(options);
  }
};

/**
 * Provider for servicing requests and parsing JSON responses.
 *
 * @param {String} options
 *   @param {String} method HTTP method.
 *   @param {String} uri HTTP URI.
 *   @param {Object} query HTTP query options.
 *   @param {Object} body HTTP body.
 *   @param {Object} headers HTTP headers.
 *   @param {Object} auth HTTP authentication.
 * @param {handler} [callback] Callback function.
 * @private
 */

Base.prototype._do = function (options) {
  var self = this;
  var key, value;
  var fn = options.fn;

  // create request
  var req = request(options.method, options.uri);

  // query string
  if (options.query) {
    // ensure query Array values are JSON encoded
    for (key in options.query) {
      if (isObject(value = options.query[key])) {
        options.query[key] = JSON.stringify(value);
      }
    }
    // set query on request
    req.query(options.query);
  }

  // set headers
  if (options.headers) {
    req.set(options.headers);
    // if authenticating
    if (req.withCredentials && options.headers["Authorization"] != null) {
      req.withCredentials();
    }
  }

  // send body
  if (options.body) req.send(options.body);

  // send request
  req.end(function (err, res) {
    var data;

    if (!err) {
      if (!(data = res.body)) { data = res.text; }
      else if (data.error) err = self._error(data);
      else data = self._response(data);
    }

    if (err && fn) {
      var response = res || {};
      return fn(err, data, response.status, response.header, res);
    }

    res.data = data;
    if (fn) fn(err || null, data, res.status, res.header, res);
  });

  return req;
};

/**
 * Coerce response to normalize access to `_id` and `_rev`.
 *
 * @param {Object} json The response JSON.
 * @return The coerced JSON.
 * @private
 */

Base.prototype._response = function (json) {
  var data = json.rows || json.results || json.uuids || isArray(json) && json;
  var meta = this._meta;
  var i = 0, len, item;

  if (data) {
    extend(data, json).json = json;
    for (len = data.length; i < len; i++) {
      item = data[i] = meta(data[i]);
      if (item.doc) item.doc = meta(item.doc);
    }
  } else {
    data = meta(json);
  }

  return data;
};

/**
 * Make an error out of the response.
 *
 * @param {Object} json The response JSON.
 * @return An `Error` object.
 * @private
 */

Base.prototype._error = function (json) {
  var err = new Error(json.reason);
  err.code = json.error;
  return extend(err, json);
};

/**
 * JSON stringify functions. Used for encoding view documents to JSON.
 *
 * @param {String} key The key to stringify.
 * @param {Object} val The value to stringify.
 * @return {Object} The stringified function value or the value.
 * @private
 */

Base.prototype._replacer = function (key, val) {
  return isFunction (val) ? val.toString() : val;
};

/**
 * Coerce documents with prototypical `_id` and `_rev`
 * values.
 *
 * @param {Object} doc The document to coerce.
 * @return {Object} The coerced document.
 * @private
 */

Base.prototype._meta = function (doc) {
  var hasId = !doc._id && doc.id;
  var hasRev = !doc._rev && doc.rev;
  var proto;

  if (hasId || hasRev) {
    proto = function (){};
    doc = extend(new proto(), doc);
    proto = proto.prototype;
    if (hasId) proto._id = doc.id;
    if (hasRev) proto._rev = doc.rev;
  }

  return doc;
};

/**
 * Parse arguments.
 *
 * @param {Array} args The arguments.
 * @param {Integer} [start] The index from which to start reading arguments.
 * @param {Boolean} [withBody] Set to `true` if the request body is given as a
 *   parameter before HTTP query options.
 * @param {Boolean} [notDoc] The request body is not a document.
 * @return {Promise} A Promise, if no callback is provided, otherwise `null`.
 * @private
 */

Base.prototype._ = function (args, start, withBody, notDoc) {
  var self = this, doc, id, rev;

  function request(method, path, options) {
    if (!options) options = {};
    return self._request({
      method: method,
      path: path || request.p,
      query: options.q || request.q,
      data: options.b || request.b,
      headers: options.h || request.h,
      fn: options.f || request.f,
      _: options._ || request._
    });
  }

  // [id], [doc], [query], [header], [callback]
  args = [].slice.call(args, start || 0);

  request.f = isFunction(args[args.length - 1]) && args.pop();
  request.p = isString(args[0]) && encodeURI(args.shift());
  request.q = args[withBody ? 1 : 0] || {};
  request.h = args[withBody ? 2 : 1] || {};

  if (withBody) {
    doc = request.b = args[0];
    if (!notDoc) {
      if (id = request.p || doc._id || doc.id) request.p = id;
      if (rev = request.q.rev || doc._rev || doc.rev) request.q.rev = rev;
    }
  }

  return request;
};

/**
 * Clerk CouchDB client.
 *
 * @param {String} uri Fully qualified URI.
 * @param {String} [auth] Authentication header value.
 * @constructor
 * @memberof clerk
 * @see {@link http://wiki.apache.org/couchdb/Complete_HTTP_API_Reference|CouchDB Wiki}
 */

function Client (uri, auth) {
  this.uri = uri;
  this._db = {};
  this.auth = auth;
};

Client.prototype = new Base();

/**
 * Select database to manipulate.
 *
 * @param {String} name DB name.
 * @return {DB} DB object.
 */

Client.prototype.db = function (name) {
  var db = this._db;
  return db[name] || (db[name] = new DB(this, name, this.auth));
};

/**
 * List all databases.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HttpGetAllDbs|CouchDB Wiki}
 */

Client.prototype.dbs = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("GET", "_all_dbs");
};

/**
 * Get UUIDs.
 *
 * @param {Integer} [count=1] Number of UUIDs to get.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HttpGetUuids|CouchDB Wiki}
 */

Client.prototype.uuids = function (count /* [query], [headers], [callback] */) {
  var request = this._(arguments, +count == count ? 1 : 0);
  if (count > 1) request.q.count = count;
  return request("GET", "_uuids");
};

/**
 * Get server information.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HttpGetRoot|CouchDB Wiki}
 */

Client.prototype.info = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("GET");
};

/**
 * Get server stats.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HttpGetLog|CouchDB Wiki}
 */

Client.prototype.stats = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("GET", "_stats");
};

/**
 * Get tail of the server log file.
 *
 * @param {Object} [query] Query parameters.
 *   @param {Integer} [query.bytes] Number of bytes to read.
 *   @param {Integer} [query.offset] Number of bytes from the end of
 *     log file to start reading.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HttpGetLog|CouchDB Wiki}
 */

Client.prototype.log = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("GET", "_log");
};

/**
 * List running tasks.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HttpGetActiveTasks|CouchDB Wiki}
 */

Client.prototype.tasks = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("GET", "_active_tasks");
};

/**
 * Get or set configuration values.
 *
 * @param {String} [key] Configuration section or key.
 * @param {String} [value] Configuration value.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

Client.prototype.config = function (/* [key], [value], [query], [headers], [callback] */) {
  var args = [].slice.call(arguments);
  var key = isString(args[0]) && args.shift() || "";
  var value = isString(args[0]) && args.shift();
  var method = isString(value) ? "PUT" : "GET";
  return this._(args)(method, "_config/" + key, { b: value });
};

/**
 * Replicate databases.
 *
 * @param {Object} options Options.
 *   @param {String} options.source Source database URL or local name.
 *   @param {String} options.target Target database URL or local name.
 *   @param {Boolean} [options.cancel] Set to `true` to cancel replication.
 *   @param {Boolean} [options.continuous] Set to `true` for continuous
 *     replication.
 *   @param {Boolean} [options.create_target] Set to `true` to create the
 *     target database.
 *   @param {String} [options.filter] Filter name for filtered replication.
 *     Example: "mydesign/myfilter".
 *   @param {Object} [options.query] Query parameters for filter.
 *   @param {String[]} [options.doc_ids] Document IDs to replicate.
 *   @param {String} [options.proxy] Proxy through which to replicate.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/Replication|CouchDB Wiki}
 */

Client.prototype.replicate = function (options /* [query], [headers], [callback] */) {
  return this._(arguments, 1)("POST", "_replicate", { b: options });
};

/**
 * Methods for CouchDB database.
 *
 * @param {Client} client Clerk client.
 * @param {String} name DB name.
 * @param {String} [auth] Authentication header value.
 * @constructor
 * @memberof clerk
 * @return This object for chaining.
 */

function DB (client, name, auth) {
  this.client = client;
  this.name = name;
  this.uri = client.uri + "/" + encodeURIComponent(name);
  this.auth = auth;
};

DB.prototype = new Base();

/**
 * Create database.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.create = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("PUT");
};

/**
 * Destroy database.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.destroy = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("DELETE");
};

/**
 * Get database info.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.info = function (/* [query], [headers], callback */) {
  return this._(arguments)("GET");
};

/**
 * Check if database exists.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.exists = function (/* [query], [headers], callback */) {
  var request = this._(arguments);
  request._ = function (err, body, status, headers, req) {
    if (status === 404) err = null;
    return [err, status === 200, status, headers, req];
  };
  return request("HEAD");
};

/**
 * Fetch document.
 *
 * Set `rev` in `query`.
 *
 * @param {String} id Document ID.
 * @param {Object} [query] HTTP query options.
 *   @param {Boolean} [query.revs] Fetch list of revisions.
 *   @param {Boolean} [query.revs_info] Fetch detailed revision information.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Document_API#GET|CouchDB Wiki}
 */

DB.prototype.get = function (/* [id], [query], [headers], [callback] */) {
  return this._(arguments)("GET");
};

/**
 * Get document metadata.
 *
 * @param {String} id Document ID.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Document_API#HEAD|CouchDB Wiki}
 */

DB.prototype.head = function (/* [id], [query], [headers], callback */) {
  var self = this;
  var request = self._(arguments);
  request._ = function (err, body, status, headers, res) {
    return [err, err ? null : {
      _id: request.p,
      _rev: headers.etag && JSON.parse(headers.etag),
      contentType: headers["content-type"],
      contentLength: headers["content-length"]
    }, status, headers, res];
  };
  return request("HEAD");
};

/**
 * Post document(s) to database.
 *
 * If documents have no ID, a document ID will be automatically generated
 * on the server. Attachments are not currently supported.
 *
 * @param {Object|Object[]} doc Document or array of documents.
 *   @param {String} [doc._id] Document ID. If set, uses given document ID.
 *   @param {String} [doc._rev] Document revision. If set, allows update to
 *     existing document.
 *   @param {Object} [doc._attachments] Attachments. If given, must be a
 *     map of filenames to attachment properties.
 *     @param {String} [doc._attachments[filename]] Attachment filename, as
 *       hash key.
 *     @param {String} [doc._attachments[filename].contentType] Attachment
 *       MIME content type.
 *     @param {String|Object} [doc._attachments[filename].data] Attachment
 *       data. Will be Base64 encoded.
 * @param {Object} [query] HTTP query options.
 *   @param {Boolean} [query.batch] Allow server to write document in
 *     batch mode. Documents will not be written to disk immediately,
 *     increasing the chances of write failure.
 *   @param {Boolean} [query.all_or_nothing] For batch updating of
 *     documents, use all-or-nothing semantics.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Document_API#POST|CouchDB Wiki}
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API|CouchDB Wiki}
 */

DB.prototype.post = function (docs /* [query], [headers], [callback] */) {
  var request = this._(arguments, 1);
  if (isArray(docs)) {
    request.p = "_bulk_docs";
    request.b = extend({ docs: docs }, request.q);
    request.q = null
  } else {
    request.b = docs;
  }
  return request("POST");
};

/**
 * Put document in database.
 *
 * @param {Object} doc Document data. Requires `_id` and `_rev`.
 * @param {String} [options] Options.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Document_API#PUT|CouchDB Wiki}
 */

DB.prototype.put = function (/* [id], [doc], [query], [headers], [callback] */) {
  var request = this._(arguments, 0, 1);
  // prevent acidentally creating database
  if (!request.p) request.p = request.b._id || request.b.id;
  if (!request.p) throw new Error("missing id");
  return request("PUT");
};

/**
 * Delete document(s).
 *
 * @param {Object|Object[]} docs Document or array of documents.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Document_API#DELETE|CouchDB Wiki}
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API|CouchDB Wiki}
 */

DB.prototype.del = function (docs /* [query], [headers], [callback] */) {
  if (isArray(docs)) {
    var i = 0, len = docs.length, doc;
    for (; i < len; i++) {
      doc = docs[i], docs[i] = {
        _id: doc._id || doc.id,
        _rev: doc._rev || doc.rev,
        _deleted: true
      };
    }
    return this.post.apply(this, arguments);
  } else {
    var request = this._(arguments, 0, 1);
    // prevent acidentally deleting database
    if (!request.p) throw new Error("missing id");
    return request("DELETE");
  }
};

/**
 * Copy document.
 *
 * @param {Object} source Source document.
 *   @param {String} source.id Source document ID.
 *   @param {String} [source.rev] Source document revision.
 *   @param {String} [source._id] Source document ID. Alternate key for
 *     `source.id`.
 *   @param {String} [source._rev] Source document revision. Alternate key
 *     for `source.id`.
 * @param {Object} target Target document.
 *   @param {String} target.id Target document ID.
 *   @param {String} [target.rev] Target document revision.
 *   @param {String} [target._id] Target document ID. Alternate key for
 *     `target.id`.
 *   @param {String} [target._rev] Target document revision. Alternate key
 *     for `target.id`.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Document_API#COPY|CouchDB Wiki}
 */

DB.prototype.copy = function (source, target /* [query], [headers], [callback] */) {
  var request = this._(arguments, 2);
  var sourcePath = encodeURIComponent(source.id || source._id || source);
  var targetPath = encodeURIComponent(target.id || target._id || target);
  var sourceRev = source.rev || source._rev;
  var targetRev = target.rev || target._rev;

  if (sourceRev) request.q.rev = sourceRev;
  if (targetRev) targetPath += "?rev=" + encodeURIComponent(targetRev);

  request.h.Destination = targetPath;

  return request("COPY", sourcePath);
};

/**
 * Query all documents by ID.
 *
 * @param {Object} [query] HTTP query options.
 *   @param {JSON} [query.startkey] Start returning results from this
 *     document ID.
 *   @param {JSON} [query.endkey] Stop returning results at this document
 *     ID.
 *   @param {Integer} [query.limit] Limit number of results returned.
 *   @param {Boolean} [query.descending=false] Lookup results in reverse
 *     order by key, returning documents in descending order by key.
 *   @param {Integer} [query.skip] Skip this many records before
 *     returning results.
 *   @param {Boolean} [query.include_docs=false] Include document source for
 *     each result.
 *   @param {Boolean} [query.include_end=true] Include `query.endkey`
 *     in results.
 *   @param {Boolean} [query.update_seq=false] Include sequence value
 *     of the database corresponding to the view.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API|CouchDB Wiki}
 */

DB.prototype.all = function (/* [query], [headers], [callback] */) {
  var request = this._(arguments);
  var body = this._viewOptions(request.q);
  return request(body ? "POST" : "GET", "_all_docs", { b: body });
};

/**
 * Query a view.
 *
 * @param {String|Object} view View name (e.g. mydesign/myview) or
 *   temporary view definition. Using a temporary view is strongly not
 *   recommended for production use.
 * @param {Object} [query] HTTP query options.
 *   @param {JSON} [query.key] Key to lookup.
 *   @param {JSON} [query.startkey] Start returning results from this key.
 *   @param {String} [query.startkey_docid] Start returning results
 *     from this document ID. Allows pagination with duplicate keys.
 *   @param {JSON} [query.endkey] Stop returning results at this key.
 *   @param {String} [query.endkey_docid] Stop returning results at
 *     this document ID. Allows pagination with duplicate keys.
 *   @param {Integer} [query.limit] Limit number of results returned.
 *   @param {Boolean|String} [query.stale] Do not refresh view even if
 *     stale. For CouchDB versions `1.1.0` and up, set to `update_after` to
 *     update view after results are returned.
 *   @param {Boolean} [query.descending=false] Lookup results in reverse
 *     order by key, returning documents in descending order by key.
 *   @param {Integer} [query.skip] Skip this many records before
 *     returning results.
 *   @param {Boolean|Integer} [query.group=false] Use the reduce function
 *     to group results by key. Set to an integer specify `group_level`.
 *   @param {Boolean|Integer} [query.reduce=true] Use the reduce function.
 *   @param {Boolean} [query.fetch=false] Include document source for
 *     each result.
 *   @param {Boolean} [query.include_end=true] Include `query.endkey`
 *     in results.
 *   @param {Boolean} [query.update_seq=false] Include sequence value
 *     of the database corresponding to the view.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_view_API|CouchDB Wiki}
 */

DB.prototype.find = function (view /* [query], [headers], [callback] */) {
  var request = this._(arguments, 1), path, body;

  if (isString(view)) {
    path = view.split("/", 2);
    path = "_design/" + encodeURIComponent(path[0]) +
           "/_view/" + encodeURIComponent(path[1]);
  } else {
    path = "_temp_view";
    body = view;
  }

  body = this._viewOptions(request.q, body);
  return request(body ? "POST" : "GET", path, { b: body });
};

/**
 * Get database changes.
 *
 * The `feed` option determines how the callback is called:
 *
 *   - `normal` calls the callback once.
 *   - `longpoll` waits for a response, then calls the callback once.
 *   - `continuous` calls the callback each time an update is received.
 *     Implemented as the `database#follow()` method.
 *
 * @param {Object} [query] HTTP query options.
 *   @param {String} [query.feed="normal"] Type of feed. See comments
 *     above.
 *   @param {String} [query.filter] Filter updates using this filter.
 *   @param {Integer} [query.limit] Maximum number of rows to return.
 *   @param {Integer} [query.since=0] Start results from this sequence
 *     number.
 *   @param {Boolean} [query.include_docs=false] Include documents with
 *     results.
 *   @param {Integer} [query.timeout=1000] Maximum period in milliseconds
 *     to wait for a change before sending a response, even if there are no
 *     results.
 *   @param {Integer} [query.heartbeat=1000] Period in milliseconds after
 *     which an empty line is sent. Applicable only to feed types
 *     `longpoll` and `continuous`. Overrides `query.timeout` to keep the
 *     feed alive indefinitely.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/HTTP_database_API#Changes|CouchDB Wiki}
 */

DB.prototype.changes = function (/* [query], [headers], [callback] */) {
  var request = this._(arguments);
  if (request.q.feed != "longpoll") delete request.q.feed;
  return this._changes(request);
};

/**
 * Follow database changes.
 *
 * @see `#changes()`.
 */

DB.prototype.follow = function (/* [query], [headers], callback */) {
  var self = this;
  var request = this._(arguments);
  var fn = request.f;

  if (!fn) return this;

  request.q.feed = "longpoll";
  request.f = function (err, body) {
    var args = [].slice.call(arguments);
    var done, i;
    for (i = 0; i < body.length; i++) {
      args[1] = body[i];
      if (done = fn.apply(self, args) === false || err) break;
    }
    if (!done) self._changes(request);
  };

  return this._changes(request);
};

/**
 * Service a changes request.
 *
 * @private
 */

DB.prototype._changes = function (request) {
  return request("GET", "_changes");
};

/**
 * Update document using server-side handler.
 *
 * @param {String} handler Update handler. Example: mydesign/myhandler
 * @param {String} [id] Document ID.
 * @param {any} data Data.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] Headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/Document_Update_Handlers|CouchDB Wiki}
 */

DB.prototype.update = function (handler /* [id], [data], [query], [headers], [callback] */) {
  var request = this._(arguments, 1, 1, 1);
  var path = handler.split("/", 2);

  path = "_design/" + encodeURIComponent(path[0]) +
         "/_update/" + encodeURIComponent(path[1]);

  if (request.p) path += "/" + request.p;

  return request("POST", path);
};

/**
 * Download attachment from document.
 *
 * @param {Object|String} docOrId Document or document ID.
 * @param {String} attachmentName Attachment name.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.attachment = function (doc, attachmentName /* [query], [headers], [callback] */) {
  var request = this._(arguments, 2);
  var path = encodeURIComponent(doc._id || doc.id || doc) + "/" +
             encodeURIComponent(attachmentName);
  return request("GET", path, options);
};

/**
 * Upload attachment to document.
 *
 * Set the `Content-Type` header.
 *
 * @param {Object} [doc] Document. Requires `id`. `rev` can be specified
 *   here or in `query`.
 * @param {String} attachmentName Attachment name.
 * @param {Object} data Data.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.attach = function (doc, attachmentName, data /* [query], [headers], [callback] */) {
  var request = this._(arguments, 3);
  request.p = encodeURIComponent(doc._id || doc.id) + "/" +
              encodeURIComponent(attachmentName);
  if (!request.q.rev) request.q.rev = doc._rev || doc.rev;
  request.q.body = data;
  return request("PUT", path);
};

/**
 * Replicate database.
 *
 * This convenience function sets `options.source` and `options.target` to
 * the selected database name. Either `options.source` or `options.target`
 * must be overridden for a successful replication request.
 *
 * @param {Options} options Options. Accepts all options from
 *   `Client.replicate()`.
 *   @param {String} [options.source=this.name] Source database URL or
 *     local name. Defaults to the selected database name if not given.
 *   @param {String} [options.target=this.name] Target database URL or
 *     local name. Defaults to the selected database name if not given.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.replicate = function (options /* [query], [headers], [callback] */) {
  if (!options.source) options.source = this.name;
  if (!options.target) options.target = this.name;
  return this.client.replicate.apply(this.client, arguments);
};

/**
 * Ensure recent changes are committed to disk.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.commit = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("POST", "_ensure_full_commit");
};

/**
 * Purge deleted documents from database.
 *
 * @param {Object} revs Map of document IDs to revisions to be purged.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 */

DB.prototype.purge = function (revs /* [query], [headers], [callback] */) {
  return this._(arguments, 1)("POST", "_purge", { b: revs });
};

/**
 * Compact database or design.
 *
 * @param {String} [design] Design name if compacting design indexes.
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/Compaction|CouchDB Wiki}
 */

DB.prototype.compact = function (/* [design], [query], [headers], [callback] */) {
  var request = this._(arguments);
  return request("POST", "_compact/" + (request.p || ""));
};

/**
 * Remove unused views.
 *
 * @param {Object} [query] HTTP query options.
 * @param {Object} [headers] HTTP headers.
 * @param {handler} [callback] Callback function.
 * @return {Promise} A Promise, if no callback is provided,
 *   otherwise `null`.
 * @see {@link http://wiki.apache.org/couchdb/Compaction|CouchDB Wiki}
 */

DB.prototype.vacuum = function (/* [query], [headers], [callback] */) {
  return this._(arguments)("POST", "_view_cleanup");
};

/**
 * Parse view options.
 *
 * @param {Object} query The HTTP query options.
 * @param {Object} body The body payload.
 * @param {handler} [callback] Callback function.
 * @return {Object} The body payload.
 * @private
 */

DB.prototype._viewOptions = function (q, body) {
  if (q) {
    if (q.key) q.key = JSON.stringify(q.key);
    if (q.startkey) q.startkey = JSON.stringify(q.startkey);
    if (q.endkey) q.endkey = JSON.stringify(q.endkey);
    if (q.stale && q.stale != "update_after") q.stale = "ok";
    if (q.keys) {
      if (!body) body = {};
      body.keys = q.keys;
      delete q.keys;
    }
  }
  return body;
};

/**
 * Handle a clerk response.
 *
 * @callback handler
 * @param {Error|null} error Error or `null` on success.
 * @param {Object} data Response data.
 * @param {Integer} status Response status code.
 * @param {Object} headers Response headers.
 * @param {superagent.Response} res Superagent response object.
 */

clerk.Base = Base;
clerk.Client = Client;
clerk.DB = DB;

// Export clerk.
module.exports = clerk;
