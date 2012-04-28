/*!
  Clerk (c) 2012 Michael Phan-Ba
  https://github.com/mikepb/clerk
  Apache License
*/

;(function(
  module,
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
){

  var global = this;

  var GET = 'GET'
    , HEAD = 'HEAD'
    , POST = 'POST'
    , PUT = 'PUT'
    , DELETE = 'DELETE'
    , COPY = 'COPY';

  var slice = [].slice;

  var previousClerk = global.clerk; global.clerk = clerk;

  if (module) module.exports = clerk;

  /**
   * Copy properties from sources to target.
   *
   * @param {Object} target The target object.
   * @param {Object...} sources The source object.
   * @return {Object} The target object.
   * @api private
   */

  function extend(target /* sources.. */) {
    var sources = slice.call(arguments, 1)
      , source, key, i = 0;
    while (source = sources[i++]) {
      for (key in source) target[key] = source[key];
    }
    return target;
  }

  /**
   * Stringify value.
   *
   * @param {Object} that That value to stringify.
   * @return {String} The stringifyed value.
   * @api private
   */

  function asString(that) {
    return Object.prototype.toString.call(that);
  }

  /**
   * Check if value is a string.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if string, `false` otherwise.
   * @api private
   */

  function isString(that) {
    return asString(that) == '[object String]';
  }

  /**
   * Check if value is an object.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if object, `false` otherwise.
   * @api private
   */

  function isObject(that) {
    return asString(that) == '[object Object]';
  }

  /**
   * Check if value is a function.
   *
   * @param {Object} that That value to check.
   * @return {Boolean} `true` if function, `false` otherwise.
   * @api private
   */

  function isFunction(that) {
    return asString(that) == '[object Function]';
  }

  /**
   * Clerk library entry point.
   *
   * @param {Array|Object|String} servers List of node URIs or map of named
   *   nodes to URIs or a single URI.
   * @return {Client|Function} If a list of servers is given, returns a
   *   function to select a client, otherwise returns the client.
   * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/)
   * @see [CouchDB Guide](http://guide.couchdb.org/)
   * @see [Couchbase 2.0](http://www.couchbase.com/docs/couchbase-single-server-2.0/)
   */

  function clerk(servers) {
    if (!servers || isString(servers)) {
      return clerk.createClient(servers);
    }

    var serverNames = [], name, i = 0, len;

    for (name in servers) {
      servers[name] = clerk.createClient(servers[name]);
      serverNames.push(name);
    }

    len = serverNames.length;

    return function(name) {
      var server;
      if (!name) { name = serverNames[i++]; i %= len; }
      if (!(server = servers[name])) throw new Error('no server configured');
      return server;
    };
  }

  /**
   * Restore global variable `clerk` to original value.
   *
   * @return {clerk} The `clerk` library as an object.
   */

  clerk.noConflict = function() {
    global.clerk = previousClerk;
    return clerk;
  };

  /**
   * Library version.
   */

  clerk.version = '0.2.0';

  /**
   * Create single CouchDB client.
   *
   * @param {String} uri Fully qualified URI.
   * @return {Client|Database} If `uri` has a path, the last segment of the
   *    path is used as the database name and a `Database` instance is
   *    returned. Otherwise, a `Client` instance is returned.
   */

  clerk.createClient = function(uri) {
    var client, db;

    uri = clerk._parseURI(uri);

    if (db = /^(https?:\/\/[^\/]+).*?(\/[^\/]+)?$/.exec(uri.host)) {
      uri.host = db[1], db = db[2] && decodeURIComponent(db[2]);
    }

    client = new clerk.Client(uri.host, uri);
    return db ? client.database(db) : client;
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
      uri = uri.replace(/\/+/g, '\/').replace(/\/+$/g, '');
      if (match = /^(https?:\/\/)(?:([^@:]+):([^@]+)@)?([^\/]+)(.*)$/.exec(uri)) {
        return {
          host: match[1] + match[4],
          user: match[2] && decodeURIComponent(match[2]),
          pass: match[3] && decodeURIComponent(match[3])
        };
      }
    }

    return { host: uri || '' };
  };

  /**
   * Base prototype for `Client` and `Database`.
   * Encapsulates HTTP methods, JSON handling, and response coersion.
   */

  var Base = clerk.Base = {

    /**
     * Service request and parse JSON response.
     *
     * @param {String} [method="GET"] HTTP method.
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
      var self = this
        , args = slice.call(arguments)
        , callback = isFunction(args[args.length - 1]) && args.pop()
        , headers = args[4] || {}
        , path = args[1] ? '/' + args[1] : '';

      if (!('Content-Type' in headers)) headers['Content-Type'] = 'application/json';

      self._request(
        args[0] || GET,                             // method
        self.uri + path,                            // uri
        args[2],                                    // query
        args[3] && JSON.stringify(args[3],
          /^\/_design/.test(path) && self._replacer
        ) || '',                                    // body
        headers,                                    // headers
        self.auth || {},                            // auth
        callback
      );

      return self;
    },

    /**
     * Service request and parse JSON response. All arguments are required.
     *
     * @param {String} method HTTP method.
     * @param {String} path HTTP URI.
     * @param {Object} query HTTP query options.
     * @param {Object} body HTTP body.
     * @param {Object} headers HTTP headers.
     * @param {Function} callback Callback function.
     *   @param {Error|null} error Error or `null` on success.
     *   @param {Object} data Response data.
     *   @param {Integer} status Response status code.
     *   @param {Object} headers Response headers.
     * @return This object for chaining.
     */

    _request: function(method, uri, query, body, headers, auth, callback) {
      var self = this
        , xhr = new XMLHttpRequest()
        , qval = [], header, key;

      if (query) {
        for (key in query) {
          qval.push(encodeURIComponent(key) + '=' + encodeURIComponent(query[key]));
        }
        if (qval.length) uri += '?' + qval.join('&');
      }

      xhr.open(method, uri, true, auth.user, auth.pass);

      if (headers) {
        for (header in headers) {
          xhr.setRequestHeader(header, headers[header]);
        }
      }

      xhr.onreadystatechange = function() {
        if (callback && xhr.readyState === 4) {
          var headers = self._getHeaders(xhr)
            , data = xhr.responseText
            , err;

          if (method == HEAD) {
            data = headers;
          } else if (data) {
            try {
              data = JSON.parse(data);
            } catch (e) {
              err = e;
            }
          }

          if (!err) data = self._response(data);

          callback(err, data, xhr.status, headers, xhr);
        }
      };

      xhr.send(body);
    },

    /**
     * Coerce response to normalize access to `id` and `rev`.
     *
     * @param {Object} json The response JSON.
     * @return The coerced JSON.
     * @api private
     */

    _response: function(json) {
      var data = json.rows || json.results || json.uuids || json.slice && json
        , meta = this._meta
        , i = 0, len, item;

      if (data) {
        for (len = data.length; i < len; i++) {
          item = data[i] = meta(data[i]);
          if (json.rows) item.doc = meta(item.doc);
        }
        extend(data, json);
        data.json = json;
      } else {
        data = meta(json);
      }

      return data;
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
     * Coerce documents with prototypical `id`, `_id`, `rev`, and `_rev`
     * values.
     *
     * @param {Object} doc The document to coerce.
     * @return {Object} The coerced document.
     * @api private
     */

    _meta: function(doc) {
      var hasId = !doc.id ^ !doc._id
        , hasRev = !doc.rev ^ !doc._rev
        , proto = function(){};

      if (hasId || hasRev) {
        doc = extend(new proto(), doc);
        proto = proto.prototype;
        if (hasId) proto._id = doc.id = doc._id || doc.id;
        if (hasRev) proto._rev = doc.rev = doc._rev || doc.rev;
      }

      return doc;
    },

    /**
     * HTTP headers to parse.
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

        self.request(
          method,
          path || request.p,
          'q' in options ? options.q : request.q,
          'b' in options ? options.b : request.b,
          'h' in options ? options.h : request.h,
          'f' in options ? options.f : request.f
        );

        return self;
      }

      // [id], [doc], [query], [header], [callback]
      args = slice.call(args, start);

      request.f = isFunction(args[args.length - 1]) && args.pop();
      request.p = isString(args[0]) && encodeURI(args.shift());
      request.q = args[withDoc ? 1 : 0] || {};
      request.h = args[withDoc ? 2 : 1] || {};

      if (withDoc) {
        doc = request.b = args[0];
        if (id = request.p || doc._id || doc.id) request.p = id;
        if (rev = request.q.rev || doc._rev || doc.rev) request.q.rev = rev;
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

  var Client = clerk.Client = function(uri, auth) {
    this.uri = uri;
    this.auth = auth;
    this._db = {};
  };

  Client = Client.prototype = {

    /**
     * Select database to manipulate.
     *
     * @param {String} name Database name.
     * @return {Database} Database object.
     */

    database: function(name) {
      var self = this, db = self._db;
      return db[name] || (db[name] = new clerk.Database(self, name, self.auth));
    },

    /**
     * List all databases.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetAllDbs)
     */

    databases: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_all_dbs');
    },

    /**
     * Get UUIDs.
     *
     * @param {Integer} [count=1] Number of UUIDs to get.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetUuids)
     */

    uuids: function(count /* [query], [headers], [callback] */) {
      var request = this._(arguments, +count === count ? 1 : 0);
      if (count > 1) request.q.count = count;
      return request(GET, '_uuids');
    },

    /**
     * Get server information.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetRoot)
     */

    info: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET);
    },

    /**
     * Get tail of the server log file.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetLog)
     */

    stats: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_stats');
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
      request.f = function(e) {
        if (e instanceof SyntaxError) e = null;
        callback.apply(this, arguments);
      };
      return request(GET, '_log');
    },

    /**
     * List running tasks.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetActiveTasks)
     */

    tasks: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_active_tasks');
    },

    /**
     * Get configuration values.
     *
     * @param {String} [key] Configuration section or key.
     * @return This object for chaining.
     */

    config: function(/* [key], [query], [callback] */) {
      var request = this._(arguments);
      return request(GET,
        '_config' + (request.p ? '/' + encodeURIComponent(request.p) : '')
      );
    },

    /**
     * Set configuration value.
     *
     * @param {String} key Configuration section and key.
     * @param {String} value Configuration value.
     * @return This object for chaining.
     */

    setConfig: function(key, value /* [query], [headers], [callback] */) {
      return this._(arguments, 2)(PUT,
        '_config/' + encodeURIComponent(key)
      );
    },

    /**
     * Delete configuration value.
     *
     * @param {String} key Configuration section and key.
     * @return This object for chaining.
     */

    delConfig: function(key /* [query], [headers], [callback] */) {
      return this._(arguments, 1)(DELETE,
        '_config/' + encodeURIComponent(key)
      );
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
      return this._(arguments, 1)(POST, '_replicate', { b: options });
    },

    /**
     * Restart server.
     *
     * @return This object for chaining.
     */

    restart: function(/* [path], [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_restart');
    }

  };

  /**
   * Methods for CouchDB database.
   *
   * @param {Client} client Clerk client.
   * @param {String} name Database name.
   * @param {Object} [auth] Authentication options.
   *   @param {String} [auth.user] Username.
   *   @param {String} [auth.pass] Password.
   * @return This object for chaining.
   */

  var Database = clerk.Database = function(client, name, auth) {
    this.client = client;
    this.name = name;
    this.uri = client.uri + '/' + encodeURIComponent(name);
    this.auth = auth;
  };

  Database = Database.prototype = {

    /**
     * Create database.
     *
     * @return This object for chaining.
     */

    create: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(PUT);
    },

    /**
     * Destroy database.
     *
     * @return This object for chaining.
     */

    destroy: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(DELETE);
    },

    /**
     * Check if database exists.
     *
     * @return This object for chaining.
     */

    info: function(/* [query], [headers], callback */) {
      return this._(arguments)(GET);
    },

    /**
     * Check if database exists.
     *
     * @return This object for chaining.
     */

    exists: function(/* [query], [headers], callback */) {
      var request = this._(arguments), callback = request.f;

      request.f = function(err, body, status, headers, xhr) {
        callback(err, status === 200, status, headers, xhr);
      };

      return request(HEAD);
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
      return this._(arguments)(GET);
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
     */

    head: function(/* [id], [query], [headers], callback */) {
      var request = this._(arguments), callback = request.f
        , id = request.p
        , rev;

      request.f = function(err, body, status, headers, xhr) {
        callback(err, err ? body : {
          _id: id, id: id,
          _rev: rev = headers.etag && JSON.parse(headers.etag), rev: rev,
          contentType: headers['content-type'],
          contentLength: headers['content-length']
        }, status, headers, xhr);
      };

      return request(HEAD);
    },

    /**
     * Post document to database.
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
     * @param {Object} [options] Options.
     *   @param {Boolean} [options.batch] Allow server to write document in
     *     batch mode. Documents will not be written to disk immediately,
     *     increasing the chances of write failure.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#POST)
     */

    post: function(doc /* [query], [headers], [callback] */) {
      return this._(arguments, 1)(POST, 0, { b: doc });
    },

    /**
     * Put document in database.
     *
     * @param {Object} doc Document data. Requires `id` and `rev`.
     * @param {String} [options] Options.
     * @return This object for chaining.
     */

    put: function(/* [doc], [query], [headers], [callback] */) {
      var request = this._(arguments, 0, 1);
      // prevent acidentally creating database
      if (!request.p) throw new Error('missing id');
      return request(PUT);
    },

    /**
     * Delete document.
     *
     * @param {String} id Document ID.
     * @param {String} rev Document revision.
     * @param {Object} [query] HTTP query options.
     * @return This object for chaining.
     */

    del: function(doc /* [query], [headers], [callback] */) {
      var request = this._(arguments, 0, 1);
      // prevent acidentally deleting database
      if (!request.p) throw new Error('missing id');
      return request(DELETE);
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
     */

    copy: function(source, target /* [query], [headers], [callback] */) {
      var request = this._(arguments, 2)
        , sourcePath = encodeURIComponent(source.id || source._id || source)
        , targetPath = encodeURIComponent(target.id || target._id || target)
        , sourceRev = source.rev || source._rev
        , targetRev = target.rev || target._rev;

      if (sourceRev) request.q.rev = sourceRev;
      if (targetRev) targetPath += '?rev=' + encodeURIComponent(targetRev);

      request.h.Destination = targetPath;
      return request(COPY, sourcePath);
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
      return request(body ? POST : GET, '_all_docs', { b: body });
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

    view: function(view /* [query], [headers], [callback] */) {
      var request = this._(arguments, 1), path, body;

      if (isString(view)) {
        path = view.split('/', 2);
        path = '_design/' + encodeURIComponent(path[0]) + '/_view/' + encodeURIComponent(path[1]);
      } else {
        path = '_temp_view';
        body = view;
      }

      body = this._viewOptions(request.q, body);
      return request(body ? POST : GET, path, { b: body });
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
      var self = this
        , request = self._(arguments)
        , callback = request.f;

      request.q.feed = 'longpoll';
      request.f = function(err, doc) {
        var body = doc, i = 0, len = doc.length, stop;
        for (; i < len; i++) {
          doc = body[i];
          if (stop = callback.apply(this, arguments) === false || err) break;
        }
        if (!stop) self._changes(request);
      };

      return self._changes(request);
    },

    /**
     * Service a changes request.
     *
     * @api private
     */

    _changes: function(request) {
      return request(GET, '_changes');
    },

    /**
     * Insert or update documents in bulk.
     *
     * @param {Object[]} docs Array of documents to insert or update.
     *   @param {String} [doc._id] Document ID.
     *   @param {String} [doc._rev] Document revision.
     *   @param {Boolean} [doc._deleted] Flag indicating whether this document
     *     should be deleted.
     * @param {Object} [query] HTTP query options.
     *   @param {Boolean} [query.all_or_nothing] Use all-or-nothing semantics.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
     */

    bulk: function(docs /* [query], [headers], [callback] */) {
      var request = this._(arguments, 1); request.q.docs = docs;
      return request(POST, '_bulk_docs', { q: 0, b: request.q });
    },

    /**
     * Delete documents in bulk.
     *
     * @param {Object[]} docs Array of documents to insert or update.
     *   @param {String} doc._id Document ID.
     *   @param {String} doc._rev Document revision.
     * @param {Object} [query] HTTP query options.
     *   @param {Boolean} [query.all_or_nothing] Use all-or-nothing semantics.
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
     */

    dels: function(docs) {
      var i = 0, len = docs.length, doc;
      for (; i < len; i++) {
        doc = docs[i], docs[i] = {
          _id: doc._id || doc.id,
          _rev: doc._rev || doc.rev,
          _deleted: true
        };
      }
      return this.bulk.apply(this, arguments);
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

      return request(request.p ? PUT : POST, path, {
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
      return request(PUT, path);
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
      var self = this, name = self.name, client = self.client;
      if (!options.source) options.source = name;
      if (!options.target) options.target = name;
      return client.replicate.apply(client, arguments);
    },

    /**
     * Ensure recent changes are committed to disk.
     *
     * @return This object for chaining.
    */

    commit: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_ensure_full_commit');
    },

    /**
     * Purge deleted documents from database.
     *
     * @param {Object} revs Map of document IDs to revisions to be purged.
     * @return This object for chaining.
     */

    purge: function(revs /* [query], [headers], [callback] */) {
      return this._(arguments, 1)(POST, '_purge', { b: revs });
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
      return request(POST,
        '_compact' + (request.p ? '/' + request.p : '')
      );
    },

    /**
     * Remove unused views.
     *
     * @return This object for chaining.
     * @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
     */

    vacuum: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_view_cleanup');
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

  };

  Client.__proto__ = Database.__proto__ = clerk.Base;

})(
  typeof module != 'undefined' && module,
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
);
