/*!
(c) Michael Phan-Ba
github.com/mikepb/clerk
Apache License
*/

;(function(
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
){

  var global = this;

  /**
   * Copy properties from sources to target.
   *
   * @param {Object} target The target object.
   * @param {Object...} sources The source object.
   * @return {Object} The target object.
   * @api private
   */

  var extend = function(target /* sources.. */) {
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
   * @api private
   */

  var asString = function(that) {
    return Object.prototype.toString.call(that);
  };

  /**
   * Check if value is a string.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if string, `false` otherwise.
   * @api private
   */

  var isString = function(that) {
    return asString(that) == '[object String]';
  };

  /**
   * Check if value is an object.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if object, `false` otherwise.
   * @api private
   */

  var isObject = function(that) {
    return asString(that) == '[object Object]';
  };

  /**
   * Check if value is an array.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if array, `false` otherwise.
   * @api private
   */

  var isArray = function(that) {
    return asString(that) == '[object Array]';
  };

  /**
   * Check if value is a function.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if function, `false` otherwise.
   * @api private
   */

  var isFunction = function(that) {
    return asString(that) == '[object Function]';
  };

  /**
   * Clerk library entry point.
   *
   * @param {String} servers CouchDB server URI.
   * @return {Client|DB} If a URI path is given, returns a `DB`, otherwise
   *   returns a `Client`.
   * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/)
   * @see [CouchDB Guide](http://guide.couchdb.org/)
   * @see [Couchbase 2.0](http://www.couchbase.com/docs/couchbase-single-server-2.0/)
   */

  var clerk = function(uri) {
    return clerk.make(uri);
  };

  /**
   * Restore global variable `clerk` to original value.
   *
   * @return {clerk} The `clerk` library as an object.
   */

  var previousClerk = this.clerk; this.clerk = clerk;
  clerk.noConflict = function() {
    global.clerk = previousClerk;
    return clerk;
  };

  /**
   * Library version.
   */

  clerk.version = '0.6.1';

  /**
   * Create single CouchDB client.
   *
   * @param {String} uri Fully qualified URI.
   * @return {Client|DB} If `uri` has a path, the last segment of the
   *    path is used as the database name and a `DB` instance is
   *    returned. Otherwise, a `Client` instance is returned.
   */

  clerk.make = function(uri) {
    var client, db;

    uri = clerk._parseURI(uri);

    if (db = /\/*([^\/]+)\/*$/.exec(uri.path)) {
      uri.path = uri.path.substr(0, db.index);
      db = db[1] && decodeURIComponent(db[1]);
    }

    client = new clerk.Client(uri.host + uri.path, uri);
    return db ? client.db(db) : client;
  };

  /**
   * Parse URI.
   *
   * The URI is normalized by removing extra `//` in the path and extracting
   * the authentication component, if present.
   *
   * @param {String} uri Fully qualified URI.
   * @return {String} The normalized URI.
   */

  clerk._parseURI = function(uri) {
    var match;

    if (uri) {
      if (match = /^(https?:\/\/)(?:([^@:]+):([^@]+)@)?([^\/]+)(.*)\/*$/.exec(uri)) {
        return {
          host: match[1] + match[4].replace(/\/+/g, '\/'),
          path: match[5],
          user: match[2] && decodeURIComponent(match[2]),
          pass: match[3] && decodeURIComponent(match[3])
        };
      }
    }

    return { host: uri || '', path: '' };
  };

  /**
   * Base prototype for `Client` and `DB`.
   * Encapsulates HTTP methods, JSON handling, and response coersion.
   */

  clerk.Base = function(){};

  clerk.Base.prototype = {

    /**
     * Service request and parse JSON response.
     *
     * @param {String} [method="'GET'"] HTTP method.
     * @param {String} [path=this.uri] HTTP URI.
     * @param {Object} [query] HTTP query options.
     * @param {Object} [body] HTTP body.
     * @param {Object} [headers] HTTP headers.
     * @param {Function} [callback] Callback function.
     *   @param {Error|null} error Error or `null` on success.
     *   @param {Object} data Response data.
     *   @param {Integer} status Response status code.
     *   @param {Object} headers Response headers.
     * @return This object for chaining.
     */

    request: function(/* [method], [path], [query], [data], [headers], [callback] */) {
      var args = [].slice.call(arguments)
        , callback = isFunction(args[args.length - 1]) && args.pop();

      return this._request({
        method: args[0],
        path: args[1],
        query: args[2],
        data: args[3],
        headers: args[4],
        fn: callback
      });
    },

    /**
     * Internal service request and parse JSON response handler.
     *
     * @param {String} options
     *   @param {String} method HTTP method.
     *   @param {String} path HTTP URI.
     *   @param {Object} query HTTP query options.
     *   @param {Object} data HTTP body data.
     *   @param {Object} headers HTTP headers.
     *   @param {Function} fn Callback function.
     *     @param {Error|null} error Error or `null` on success.
     *     @param {Object} data Response data.
     *     @param {Integer} status Response status code.
     *     @param {Object} headers Response headers.
     * @api private
     */

    _request: function(options) {
      if (!options.method) options.method = 'GET';
      if (!options.headers) options.headers = {};
      options.path = options.path ? '/' + options.path : '';

      // set default headers
      if (!('Content-Type' in options.headers)) {
        options.headers['Content-Type'] = 'application/json';
      }

      options.uri = this.uri + options.path;
      options.body = options.data && JSON.stringify(options.data,
        /^\/_design/.test(options.path) && this._replacer
      ) || '';
      options.auth = this.auth || {};

      this._do(options);

      return this;
    },

    /**
     * Provider for servicing requests and parsing JSON responses.
     *
     * @param {String} options
     *   @param {String} method HTTP method.
     *   @param {String} path HTTP URI.
     *   @param {Object} query HTTP query options.
     *   @param {Object} body HTTP body.
     *   @param {Object} headers HTTP headers.
     *   @param {Function} fn Callback function.
     *     @param {Error|null} error Error or `null` on success.
     *     @param {Object} data Response data.
     *     @param {Integer} status Response status code.
     *     @param {Object} headers Response headers.
     * @api private
     */

    _do: function(options) {
      var self = this
        , xhr = new XMLHttpRequest()
        , qval = [], header, key, value;

      if (options.query) {
        for (key in options.query) {
          // ensure query Array values are JSON encoded
          if (typeof(value = options.query[key]) === 'object') {
            value = JSON.stringify(value);
          }
          // URI encode
          key = encodeURIComponent(key);
          value = encodeURIComponent(value);
          // add to query kv array
          qval.push(key + '=' + value);
        }
        options.uri += '?' + qval.join('&');
      }

      xhr.open(options.method, options.uri, true,
        options.auth.user, options.auth.pass);

      if (options.headers) {
        for (header in options.headers) {
          xhr.setRequestHeader(header, options.headers[header]);
        }
      }

      if (options.fn) xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          var headers = self._getHeaders(xhr)
            , data = xhr.responseText
            , err;

          if (options.method == 'HEAD') {
            data = headers;
          } else if (data) {
            try {
              data = JSON.parse(data);
            } catch (e) {
              err = e;
            }
            if (!err) {
              if (data.error) err = self._error(data);
              else data = self._response(data);
            }
          }

          options.fn(err, data, xhr.status, headers, xhr);
        }
      };

      xhr.send(options.body);
    },

    /**
     * Coerce response to normalize access to `_id` and `_rev`.
     *
     * @param {Object} json The response JSON.
     * @return The coerced JSON.
     * @api private
     */

    _response: function(json) {
      var data = json.rows || json.results || json.uuids || isArray(json) && json
        , meta = this._meta
        , i = 0, len, item;

      if (data) {
        data = [].slice.call(data);
        extend(data.__proto__ = [], json).json = json;
        for (len = data.length; i < len; i++) {
          item = data[i] = meta(data[i]);
          if (json.rows && item.doc) item.doc = meta(item.doc);
        }
      } else {
        data = meta(json);
      }

      return data;
    },

    /**
     * Make an error out of the response.
     *
     * @param {Object} json The response JSON.
     * @return An `Error` object.
     * @api private
     */

    _error: function(json) {
      return extend(new Error(json.error + ': ' + json.reason), json);
    },

    /**
     * JSON stringify functions. Used for encoding view documents to JSON.
     *
     * @param {String} key The key to stringify.
     * @param {Object} val The value to stringify.
     * @return {Object} The stringified function value or the value.
     * @api private
     */

    _replacer: function(key, val) {
      return isFunction(val) ? val.toString() : val;
    },

    /**
     * Coerce documents with prototypical `_id` and `_rev`
     * values.
     *
     * @param {Object} doc The document to coerce.
     * @return {Object} The coerced document.
     * @api private
     */

    _meta: function(doc) {
      var hasId = !doc.id ^ !doc._id
        , hasRev = !doc.rev ^ !doc._rev
        , proto;

      if (hasId || hasRev) {
        proto = function(){};
        doc = extend(new proto(), doc);
        proto = proto.prototype;
        if (hasId) proto._id = doc._id || doc.id;
        if (hasRev) proto._rev = doc._rev || doc.rev;
      }

      return doc;
    },

    /**
     * HTTP headers to parse.
     *
     * @api private
     */

    _headers: [
      'cache-control',
      'content-length',
      'content-type',
      'date',
      'etag',
      'server'
    ],

    /**
     * Parse HTTP response headers.
     *
     * @api private
     */

    _getHeaders: function(xhr) {
      var headers = {}
        , header, i = 0;

      while (header = this._headers[i++]) {
        headers[header] = xhr.getResponseHeader(header);
      }

      return headers;
    },

    /**
     * Parse arguments.
     *
     * @param {Array} args The arguments.
     * @param {Integer} start The index from which to start reading arguments.
     * @param {Boolean} withDoc Set to `true` if the doc source is given as a
     *   parameter before HTTP query options.
     * @return This object for chaining.
     * @api private
     */

    _: function(args, start, withDoc) {
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
          state: request
        });
      }

      // [id], [doc], [query], [header], [callback]
      args = [].slice.call(args, start || 0);

      request.f = isFunction(args[args.length - 1]) && args.pop();
      request.p = isString(args[0]) && encodeURI(args.shift());
      request.q = args[withDoc ? 1 : 0] || {};
      request.h = args[withDoc ? 2 : 1] || {};

      if (withDoc) {
        if (doc = (request.b = args[0])) {
          if (id = request.p || doc._id || doc.id) request.p = id;
          if (rev = request.q.rev || doc._rev || doc.rev) request.q.rev = rev;
        }
      }

      return request;
    }

  };

  /**
   * Clerk CouchDB client.
   *
   * @param {String} uri Fully qualified URI.
   * @param {Object} [auth] Authentication options.
   *   @param {String} [auth.user] Username.
   *   @param {String} [auth.pass] Password.
   * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Complete_HTTP_API_Reference)
   */

  clerk.Client = function(uri, auth) {
    this.uri = uri;
    this.auth = auth;
    this._db = {};
  };

  clerk.Client.prototype = extend(new clerk.Base(), {

    /**
     * Select database to manipulate.
     *
     * @param {String} name DB name.
     * @return {DB} DB object.
     */

    db: function(name) {
      var db = this._db;
      return db[name] || (db[name] = new clerk.DB(this, name, this.auth));
    },

    /**
     * List all databases.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetAllDbs)
     */

    dbs: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('GET', '_all_dbs');
    },

    /**
     * Get UUIDs.
     *
     * @param {Integer} [count=1] Number of UUIDs to get.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetUuids)
     */

    uuids: function(count /* [query], [headers], [callback] */) {
      var request = this._(arguments, +count == count ? 1 : 0);
      if (count > 1) request.q.count = count;
      return request('GET', '_uuids');
    },

    /**
     * Get server information.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetRoot)
     */

    info: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('GET');
    },

    /**
     * Get server stats.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetLog)
     */

    stats: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('GET', '_stats');
    },

    /**
     * Get tail of the server log file.
     *
     * @param {Object} [query] Query parameters.
     *   @param {Integer} [query.bytes=1000] Number of bytes to read.
     *   @param {Integer} [query.offset=0] Number of bytes from the end of
     *     log file to start reading.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetLog)
     */

    log: function(/* [query], [headers], [callback] */) {
      var request = this._(arguments), callback = request.f;

      if (!callback) return this;

      request.f = function(e) {
        if (e instanceof SyntaxError) e = null;
        callback.apply(this, arguments);
      };
      return request('GET', '_log');
    },

    /**
     * List running tasks.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetActiveTasks)
     */

    tasks: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('GET', '_active_tasks');
    },

    /**
     * Get or set configuration values.
     *
     * @param {String} [key] Configuration section or key.
     * @param {String} [value] Configuration value.
     * @return This object for chaining.
     */

    config: function(/* [key], [value], [query], [headers], [callback] */) {
      var args = [].slice.call(arguments)
        , key = isString(args[0]) && args.shift() || ''
        , value = isString(args[0]) && args.shift()
        , method = isString(value) ? 'PUT' : 'GET';
      return this._(args)(method, '_config/' + key, { b: value });
    },

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
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Replication)
     */

    replicate: function(options /* [query], [headers], [callback] */) {
      return this._(arguments, 1)('POST', '_replicate', { b: options });
    }

  });

  /**
   * Methods for CouchDB database.
   *
   * @param {Client} client Clerk client.
   * @param {String} name DB name.
   * @param {Object} [auth] Authentication options.
   *   @param {String} [auth.user] Username.
   *   @param {String} [auth.pass] Password.
   * @return This object for chaining.
   */

  clerk.DB = function(client, name, auth) {
    this.client = client;
    this.name = name;
    this.uri = client.uri + '/' + encodeURIComponent(name);
    this.auth = auth;
  };

  clerk.DB.prototype = extend(new clerk.Base(), {

    /**
     * Create database.
     *
     * @return This object for chaining.
     */

    create: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('PUT');
    },

    /**
     * Destroy database.
     *
     * @return This object for chaining.
     */

    destroy: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('DELETE');
    },

    /**
     * Get database info.
     *
     * @return This object for chaining.
     */

    info: function(/* [query], [headers], callback */) {
      return this._(arguments)('GET');
    },

    /**
     * Check if database exists.
     *
     * @return This object for chaining.
     */

    exists: function(/* [query], [headers], callback */) {
      var request = this._(arguments), callback = request.f;

      if (!callback) return this;

      request.f = function(err, body, status, headers, xhr) {
        callback(err, status === 200, status, headers, xhr);
      };

      return request('HEAD');
    },

    /**
     * Fetch document.
     *
     * Set `rev` in `query`.
     *
     * @param {String} id Document ID.
     * @param {Object} [query] HTTP query options.
     *   @param {Boolean} [query.revs] Fetch list of revisions.
     *   @param {Boolean} [query.revs_info] Fetch detailed revision information.
     * @param {Function} callback Callback function.
     *   @param {Error|null} error Error or `null` on success.
     *   @param {Object} data Response data.
     *   @param {Integer} status Response status code.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#GET)
     */

    get: function(/* [id], [query], [headers], [callback] */) {
      return this._(arguments)('GET');
    },

    /**
     * Get document metadata.
     *
     * @param {String} id Document ID.
     * @param {Object} [query] HTTP query options.
     * @param {Function} callback Callback function.
     *   @param {Error|null} callback.error Error or `null` on success.
     *   @param {Object|Object[]} [callback.body] Document metadata or array
     *     of document metadata.
     *     @param result.id Document ID.
     *     @param result.rev Document revision.
     *     @param [result.contentType] MIME content type. Only available when
     *       getting metadata for single document.
     *     @param [result.contentLength] Content length. Only available when
     *       getting metadata for single document.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#HEAD)
     */

    head: function(/* [id], [query], [headers], callback */) {
      var self = this
        , request = self._(arguments), callback = request.f
        , id = request.p
        , rev;

      if (!callback) return this;

      request.f = function(err, body, status, headers, xhr) {
        callback(err, err ? body : self._meta({
          _id: id,
          _rev: headers.etag && JSON.parse(headers.etag),
          contentType: headers['content-type'],
          contentLength: headers['content-length']
        }), status, headers, xhr);
      };

      return request('HEAD');
    },

    /**
     * Post document(s) to database.
     *
     * If documents have no ID, a document ID will be automatically generated
     * on the server. If attachments are given, they will be automatically
     * Base64 encoded. Streamed attachments are not supported. Attachments are
     * only supported on Node.js.
     *
     * @param {Object} doc Document.
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
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#POST)
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
     */

    post: function(docs /* [query], [headers], [callback] */) {
      var request = this._(arguments, 1);
      if (isArray(docs)) {
        var callback = request.f;

        request.p = '_bulk_docs';
        request.b = extend({ docs: docs }, request.q);
        request.q = null

        // CouchDB older than 1.2 are missing the ok: true property
        if (callback) request.f = function(err, body) {
          if (!err) {
            var i = 0, len = body.length, doc;
            for (; i < len; i++) {
              doc = body[i];
              if (!doc.error) doc.ok = true;
            }
          }
          callback.apply(this, arguments);
        };
      } else {
        request.b = docs;
      }
      return request('POST');
    },

    /**
     * Put document in database.
     *
     * @param {Object} doc Document data. Requires `id` and `rev`.
     * @param {String} [options] Options.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#PUT)
     */

    put: function(/* [id], [doc], [query], [headers], [callback] */) {
      var request = this._(arguments, 0, 1);
      // prevent acidentally creating database
      if (!request.p) request.p = request.b._id || request.b.id;
      if (!request.p) throw new Error('missing id');
      return request('PUT');
    },

    /**
     * Delete document(s).
     *
     * @param {String} doc Document or document ID.
     * @param {Object} [query] HTTP query options.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#DELETE)
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
     */

    del: function(docs /* [query], [headers], [callback] */) {
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
        if (!request.p) throw new Error('missing id');
        return request('DELETE');
      }
    },

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
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#COPY)
     */

    copy: function(source, target /* [query], [headers], [callback] */) {
      var request = this._(arguments, 2)
        , sourcePath = encodeURIComponent(source.id || source._id || source)
        , targetPath = encodeURIComponent(target.id || target._id || target)
        , sourceRev = source.rev || source._rev
        , targetRev = target.rev || target._rev
        , callback = request.f;

      if (sourceRev) request.q.rev = sourceRev;
      if (targetRev) targetPath += '?rev=' + encodeURIComponent(targetRev);

      request.h.Destination = targetPath;

      // CouchDB older than 1.2 are missing the ok: true property
      // https://issues.apache.org/jira/browse/COUCHDB-903
      if (callback) request.f = function(err, body) {
        if (!err) body.ok = true;
        callback.apply(this, arguments);
      };

      return request('COPY', sourcePath);
    },

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
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
     */

    all: function(/* [query], [headers], [callback] */) {
      var request = this._(arguments)
        , body = this._viewOptions(request.q);
      return request(body ? 'POST' : 'GET', '_all_docs', { b: body });
    },

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
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_view_API)
     */

    find: function(view /* [query], [headers], [callback] */) {
      var request = this._(arguments, 1), path, body;

      if (isString(view)) {
        path = view.split('/', 2);
        path = '_design/' + encodeURIComponent(path[0]) + '/_view/' + encodeURIComponent(path[1]);
      } else {
        path = '_temp_view';
        body = view;
      }

      body = this._viewOptions(request.q, body);
      return request(body ? 'POST' : 'GET', path, { b: body });
    },

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
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_database_API#Changes)
     */

    changes: function(/* [query], [headers], [callback] */) {
      var request = this._(arguments);
      if (request.q.feed != 'longpoll') delete request.q.feed;
      return this._changes(request);
    },

    /**
     * Get database changes.
     *
     * @see `#changes()`.
     */

    follow: function(/* [query], [headers], callback */) {
      var request = this._(arguments)
        , callback = request.f;

      if (!callback) return this;

      request.q.feed = 'longpoll';
      request.f = function(err, doc) {
        var body = doc, i = 0, len = doc.length, stop;
        for (; i < len; i++) {
          doc = body[i];
          if (stop = callback.apply(this, arguments) === false || err) break;
        }
        if (!stop) this._changes(request);
      };

      return this._changes(request);
    },

    /**
     * Service a changes request.
     *
     * @api private
     */

    _changes: function(request) {
      return request('GET', '_changes');
    },

    /**
     * Update document using server-side handler.
     *
     * @param {String} handler Update handler. Example: mydesign/myhandler
     * @param {String} [id] Document ID.
     * @param {Object} [query] HTTP query options.
     * @param {Object|String} [data] Data.
     * @param {Object} [headers] Headers.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Document_Update_Handlers)
     */

    update: function(handler /* [id], [query], [data], [headers], [callback] */) {
      var request = this._(arguments, 1, 1)
        , path = handler.split('/', 2);

      path = '_design/' + encodeURIComponent(path[0]) + '/_update/' + encodeURIComponent(path[1]);
      if (request.p) path += '/' + request.p;

      return request(request.p ? 'PUT' : 'POST', path, {
        q: request.b,
        b: request.q
      });
    },

    /**
     * Download attachment from document.
     *
     * @param {Object|String} docOrId Document or document ID.
     * @param {String} attachmentName Attachment name.
     * @param {Object} [query] HTTP query options.
     * @return This object for chaining.
     */

    attachment: function(doc, attachmentName /* [query], [headers], [callback] */) {
      var request = this._(arguments, 2);
      var path = encodeURIComponent(doc._id || doc.id || doc) + '/' + encodeURIComponent(attachmentName);
      return request('GET', path, options);
    },

    /**
     * Upload attachment to document.
     *
     * Set the `Content-Type` header.
     *
     * @param {Object} [doc] Document. Requires `id`. `rev` can be specified
     *   here or in `query`.
     * @param {String} attachmentName Attachment name.
     * @param {Object} data Data.
     * @return This object for chaining.
     */

    attach: function(doc, attachmentName, data /* [query], [headers], [callback] */) {
      var request = this._(arguments, 3);
      request.p = encodeURIComponent(doc._id || doc.id) + '/' + encodeURIComponent(attachmentName);
      if (!request.q.rev) request.q.rev = doc._rev || doc.rev;
      request.q.body = data;
      return request('PUT', path);
    },

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
     * @return This object for chaining.
     */

    replicate: function(options /* [query], [headers], [callback] */) {
      if (!options.source) options.source = this.name;
      if (!options.target) options.target = this.name;
      return this.client.replicate.apply(this.client, arguments);
    },

    /**
     * Ensure recent changes are committed to disk.
     *
     * @return This object for chaining.
     */

    commit: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('POST', '_ensure_full_commit');
    },

    /**
     * Purge deleted documents from database.
     *
     * @param {Object} revs Map of document IDs to revisions to be purged.
     * @return This object for chaining.
     */

    purge: function(revs /* [query], [headers], [callback] */) {
      return this._(arguments, 1)('POST', '_purge', { b: revs });
    },

    /**
     * Compact database or design.
     *
     * @param {String} [design] Design name if compacting design indexes.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
     */

    compact: function(/* [design], [query], [headers], [callback] */) {
      var request = this._(arguments);
      return request('POST', '_compact/' + (request.p || ''));
    },

    /**
     * Remove unused views.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
     */

    vacuum: function(/* [query], [headers], [callback] */) {
      return this._(arguments)('POST', '_view_cleanup');
    },

    /**
     * Parse view options.
     *
     * @param {Object} query The HTTP query options.
     * @param {Object} body The body payload.
     * @return {Object} The body payload.
     * @api private
     */

    _viewOptions: function(q, body) {
      if (q) {
        if (q.key) q.key = JSON.stringify(q.key);
        if (q.startkey) q.startkey = JSON.stringify(q.startkey);
        if (q.endkey) q.endkey = JSON.stringify(q.endkey);
        if (q.stale && q.stale != 'update_after') q.stale = 'ok';
        if (q.keys) {
          if (!body) body = {};
          body.keys = q.keys;
          delete q.keys;
        }
      }
      return body;
    }

  });

})(
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
);
