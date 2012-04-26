/*!
  Clerk (c) 2012 Michael Phan-Ba
  https://github.com/mikepb/clerk
  Apache License
*/

;(function(
  module,
  window,
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
      Copy properties from sources to target.

      @param {Object} target The target object.
      @param {Object..} sources The source object.
   */

  function extend(target /* sources.. */) {
    var sources = slice.call(arguments, 1)
      , source, key, i = 0;
    while (source = sources[i++]) {
      for (key in source) target[key] = source[key];
    }
    return target;
  }

  function asString(that) {
    return Object.prototype.toString.call(that);
  }

  function isString(that) {
    return asString(that) == '[object String]';
  }

  function isObject(that) {
    return asString(that) == '[object Object]';
  }

  function isFunction(that) {
    return asString(that) == '[object Function]';
  }

  /**
      Create CouchDB client.

      @param {Array|Object|String} servers List of node URIs or map of named
        nodes to URIs or a single URI.
      @return {Client|Function} If a list of servers is given, returns a function
        to select a client, otherwise returns the client.
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
      Restore global variable 'clerk' to original value and return the library as an object.
   */

  if (window) clerk.noConflict = function() {
    window.clerk = previousClerk;
    return clerk;
  };

  /**
      Version.
   */

  clerk.version = '0.2.0';

  /**
      Create single CouchDB client.

      @param {String} uri Fully qualified URI.
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

  clerk._parseURI = function(uri, match) {
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
    return { h: uri || '' };
  };

  var Base = clerk.Base = {

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

    request: function(/* [method], [path], [query], [data], [headers], [callback] */) {
      var self = this
        , args = slice.call(arguments)
        , callback = isFunction(args[args.length - 1]) && args.pop();

      self._request(
        args[0] || GET,                             // method
        self.uri + (args[1] ? '/' + args[1] : ''),  // path
        args[2],                                    // query
        args[3] && JSON.stringify(args[3]) || '',   // body
        args[4],                                    // headers
        self.auth || {},                            // auth
        callback
      );

      return self;
    },

    _request: function(method, uri, query, body, headers, auth, callback) {
      var self = this
        , xhr = new XMLHttpRequest()
        , header, key, qval;

      if (query) {
        qval = [];
        for (key in query) {
          qval.push(encodeURIComponent(key) + '=' + encodeURIComponent(query[key]));
        }
        uri += '?' + qval.join('&');
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
          } else {
            try {
              data = JSON.parse(data);
            } catch (e) {
              err = e;
            }
            if (!err) data = self._response(data);
          }

          callback(err, data, xhr.status, headers, xhr);
        }
      };

      xhr.send(body);
    },

    _response: function(json) {
      var data = json.rows || json.results || json.uuids;

      if (data) {
        json = extend(data, json);
      } else {
        if (json.id) json._id = json.id;
        if (json.rev) json._rev = json.rev;
      }

      return json;
    },

    _headers: [
      'cache-control',
      'content-length',
      'content-type',
      'date',
      'etag',
      'server'
    ],

    _getHeaders: function(xhr) {
      var headers = {}
        , header, i = 0;

      while (header = this._headers[i++]) {
        headers[header] = xhr.getResponseHeader(header);
      }

      return headers;
    }

  };

  /**
      CouchDB client.

      @param {String} uri Fully qualified URI.
      @param {Object} [options] Options.
        @param {Object} [options.auth] Authentication credentials.
          @param {String} [options.auth.user] Username.
          @param {String} [options.auth.pass] Password.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Complete_HTTP_API_Reference)
   */

  var Client = clerk.Client = function(uri, auth) {
    this.uri = uri;
    this.auth = auth;
  };

  Client = Client.prototype = {

    /**
      Select database to manipulate.

      @param {String} name Database name.
      @return {Database} Database object.
     */

    database: function(name) {
      return new clerk.Database(this, name, this.auth);
    },

    /**
      List all databases.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetAllDbs)
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_all-dbs_get)
     */

    databases: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_all_dbs');
    },

    /**
      Get UUIDs.

      @param {Integer} [count=1] Number of UUIDs to get.
      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {String[]} [callback.uuids] UUIDs or error data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetUuids)
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_uuids_get)
     */

    uuids: function(count /* [query], [headers], [callback] */) {
      var request = this._(arguments, +count === count ? 1 : 0);
      if (count > 1) request.q.count = count;
      return request(GET, '_uuids');
    },

    /**
      Get server information.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetRoot)
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_root_get)
     */

    info: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET);
    },

    /**
      Get tail of the server log file.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetLog)
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_log_get)
     */

    stats: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_stats');
    },

    /**
      Get tail of the server log file.

      @param {Object} [options] Options.
        @param {Integer} [options.bytes=1000] Number of bytes to read.
        @param {Integer} [options.offset=0] Offset in bytes from the end of
          the log file to start reading.
      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetLog)
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_log_get)
     */

    log: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_log');
    },

    /**
      List running tasks.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetActiveTasks)
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_active-tasks_get)
     */

    tasks: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(GET, '_active_tasks');
    },

    /**
      Get configuration values.

      @param {String} [section] Configuration section or key.
      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Configuration data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-config.html)
     */

    config: function(/* [key], [query], [callback] */) {
      var request = this._(arguments);
      return request(GET,
        '_config' + (request.p ? '/' + encodeURIComponent(request.p) : '')
      );
    },

    /**
      Set configuration value.

      @param {String} section Configuration section.
      @param {String} key Configuration key.
      @param {String} value Configuration value.
      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.value] Previous configuration value.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-config.html#couchbase-api-config_config-section-key_put)
     */

    setConfig: function(key, value /* [query], [headers], [callback] */) {
      return this._(arguments, 2)(PUT,
        '_config/' + encodeURIComponent(key)
      );
    },

    /**
      Delete configuration value.

      @param {String} section Configuration section.
      @param {String} key Configuration key.
      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.value] Previous configuration value.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-config.html#couchbase-api-config_config-section-key_put)
     */

    delConfig: function(key /* [query], [headers], [callback] */) {
      return this._(arguments, 1)(DELETE,
        '_config/' + encodeURIComponent(key)
      );
    },

    /**
      Replicate databases.

      @param {Object} options Options.
        @param {String} options.source Source database URL or local name.
        @param {String} options.target Target database URL or local name.
        @param {Boolean} [options.cancel] Set to `true` to cancel replication.
        @param {Boolean} [options.continuous] Set to `true` for continuous
          replication.
        @param {Boolean} [options.create_target] Set to `true` to create the
          target database.
        @param {String} [options.filter] Filter name for filtered replication.
          Example: "mydesign/myfilter".
        @param {Object} [options.query] Query parameters for filter.
        @param {String[]} [options.doc_ids] Document IDs to replicate.
        @param {String} [options.proxy] Proxy through which to replicate.
      @param {Function} [callback] Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Replication)
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_replicate_post)
     */

    replicate: function(options /* [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_replicate', { b: options });
    },

    /**
      Restart server.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_restart_post)
     */

    restart: function(/* [path], [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_restart');
    },

    _: function(args, start) {
      var self = this;

      function request(method, path, options) {
        if (!options) options = {};

        self.request(
          method,
          path || request.p,
          options.q || request.q,
          options.b,
          options.h || request.h,
          options.f || request.f
        );

        return self;
      }

      // [query], [header], [callback]
      args = slice.call(args, start);

      request.f = isFunction(args[args.length - 1]) && args.pop();
      request.p = isString(args[0]) && args.shift();
      request.q = args[0] || {};
      request.h = args[1] || {};

      return request;
    }

  };

  /**
      Methods for CouchDB database.

      @param {Client} options Clerk client.
      @param {String} options Database name.
   */

  var Database = clerk.Database = function(client, name, auth) {
    this.client = client;
    this.name = name;
    this.uri = client.uri + '/' + encodeURIComponent(name);
    this.auth = auth;
  };

  Database = Database.prototype = {

    /**
        Create database.

        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_put)
     */

    create: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(PUT);
    },

    /**
        Destroy database.

        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_delete)
     */

    destroy: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(DELETE);
    },

    /**
        Check if database exists.

        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_get)
    */

    info: function(/* [query], [headers], callback */) {
      return this._(arguments)(GET);
    },

    /**
        Check if database exists.

        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Boolean} [callback.result] `true` if existing, `false`
            otherwise.
    */

    exists: function(/* [query], [headers], callback */) {
      var request = this._(arguments), callback = request.f;

      request.f = function(err, body, status, headers, xhr) {
        callback(err, status === 200, headers, headers, xhr);
      };

      return request(HEAD);
    },

    /**
        Fetch document.

        @param {String} id Document ID.
        @param {String} [rev] Document revision.
        @param {Object} [options] Options.
          @param {Boolean} [options.revs] Fetch list of revisions.
          @param {Boolean} [options.revs_info] Fetch detailed revision information.
        @param {Function} callback Callback function.
          @param {Error|null} error Error or `null` on success.
          @param {Object} data Response data.
          @param {Integer} status Response status code.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#GET)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-dbdoc_db-doc_get)
    */

    get: function(/* id, [rev], [query], [headers], [callback] */) {
      return this._(arguments)(GET);
    },

    /**
        Get document metadata.

        @param {String|String[]} id Document ID or array of documents IDs.
        @param {Object} [options] Query options.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object|Object[]} [callback.results] Document metadata or array
            of document metadata.
            @param result.id Document ID.
            @param result.rev Document revision.
            @param [result.contentType] MIME content type. Only available when
              getting metadata for single document.
            @param [result.contentLength] Content length. Only available when
              getting metadata for single document.
          @param {ClientResponse} [callback.response] ClientResponse object.
     */

    head: function(/* [id], [query], [headers], callback */) {
      var request = this._(arguments), callback = request.f;

      request.f = function(err, body, status, headers, xhr) {
        callback(err, err ? body : {
          id: request.p,
          rev: headers.etag && JSON.parse(headers.etag),
          contentType: headers['content-type'],
          contentLength: headers['content-length']
        }, status, headers, xhr);
      };

      return request(HEAD);
    },

    /**
        Put document in database.

        @param {String} [id] Document ID. If provided, also requires rev.
        @param {String} [rev] Document revision. If provided, also requires id.
        @param {Object} doc Document data.
        @param {String} [options] Options.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Results.
          @param {ClientResponse} [callback.response] ClientResponse object.
    */

    put: function(/* [id], [rev], [doc], [query], [headers], [callback] */) {
      var request = this._(arguments, 0, 1);

      if (!request.p) request.p = request.b._id;
      if (request.q.rev) {
        request.b._rev = decodeURIComponent(request.q.rev);
        delete request.q.rev;
      }

      // prevent acidentally creating database
      if (!request.p) throw new Error('missing id');

      return request(PUT);
    },

    /**
        Post document to database.

        If documents have no ID, a document ID will be automatically generated
        on the server. If attachments are given, they will be automatically
        Base64 encoded. Streamed attachments are not supported. Attachments are
        only supported for single documents.

        Bulk posting of documents will use all-or-nothing semantics. See
        `bulk()` for options.

        @param {Object|Object[]} doc Document or array of documents.
          @param {String} [doc._id] Document ID. If set, uses given document ID.
          @param {String} [doc._rev] Document revision. If set, allows update to
            existing document.
          @param {String} [doc._attachments] Attachments. If given, must be a
            map of filenames to attachment properties. Only supported for single
            documents.
            @param {String} [doc._attachments[filename]] Attachment filename, as
              hash key.
            @param {String} [doc._attachments[filename].contentType] Attachment
              MIME content type.
            @param {String|Object} [doc._attachments[filename].data] Attachment
              data. Will be Base64 encoded.
        @param {Object} [options] Options.
          @param {Boolean} [options.batch] Allow server to write document in
            batch mode. Documents will not be written to disk immediately,
            increasing the chances of write failure.
        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Results.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#POST)
        @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-dbdoc_db_post)
    */

    post: function(doc /* [query], [headers], callback */) {
      return this._(arguments, 1)(POST, 0, { b: doc });
    },

    /**
        Delete document.

        @param {String} id Document ID.
        @param {String} rev Document revision.
        @param {Object} [options] Options.
        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Results.
          @param {ClientResponse} [callback.response] ClientResponse object.
     */

    del: function(id, rev /* [query], [headers], [callback] */) {
      var request = this._(arguments)(DELETE);
      // prevent acidentally deleting database
      if (!request.q.id || !request.q.rev) throw new Error('missing id or rev');
      return request;
    },

    /**
        Copy document.

        @param {Object} source Source document.
          @param {String} source.id Source document ID.
          @param {String} [source.rev] Source document revision.
          @param {String} [source._id] Source document ID. Alternate key for
            `source.id`.
          @param {String} [source._rev] Source document revision. Alternate key
            for `source.id`.
        @param {Object} target Target document.
          @param {String} target.id Target document ID.
          @param {String} [target.rev] Target document revision.
          @param {String} [target._id] Target document ID. Alternate key for
            `target.id`.
          @param {String} [target._rev] Target document revision. Alternate key
            for `target.id`.
        @param {Object} [options] Query options.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Results.
          @param {ClientResponse} [callback.response] ClientResponse object.
     */

    copy: function(source, target /* [query], [headers], [callback] */) {
      var request = this._(arguments, 2)
        , sourcePath = encodeURIComponent(source.id || source._id)
        , targetPath = encodeURIComponent(target.id || target._id)
        , sourceRev = source.rev || source._rev
        , targetRev = target.rev || target._rev;

      if (sourceRev) request.q.rev = sourceRev;
      if (targetRev) targetPath += '?rev=' + encodeURIComponent(targetRev);

      request.h.Destination = targetPath;
      return request(COPY, sourcePath);
    },

    /**
        Query all documents by ID.

        @param {Object} [options] Options.
          @param {JSON} [options.startkey] Start returning results from this
            document ID.
          @param {JSON} [options.endkey] Stop returning results at this document
            ID.
          @param {Integer} [options.limit] Limit number of results returned.
          @param {Boolean} [options.descending=false] Lookup results in reverse
            order by key, returning documents in descending order by key.
          @param {Integer} [options.skip] Skip this many records before
            returning results.
          @param {Boolean} [options.fetch=false] Include document source for
            each result.
          @param {Boolean} [options.include_end=true] Include `options.endkey`
            in results.
          @param {Boolean} [options.update_seq=false] Include sequence value
            of the database corresponding to the view.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Results.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-all-docs_get)
     */

    all: function(/* [query], [headers], [callback] */) {
      var request = this._(arguments)
        , body = this._parseViewOptions(request.q);
      return request(body ? POST : GET, '_all_docs', { b: body });
    },

    /**
        Insert or update documents in bulk.

        @param {Object[]} docs Array of documents to insert or update.
          @param {String} [doc._id] Document ID.
          @param {String} [doc._rev] Document revision.
          @param {Boolean} [doc._deleted] Flag indicating whether this document
            should be deleted.
        @param {Object} [options] Options.
          @param {Boolean} [options.all_or_nothing] Use all-or-nothing semantics.
        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Array with results of each
            document in the bulk operation.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-bulk-docs_post)
     */

    bulk: function(docs /* [query], [headers], [callback] */) {
      var request = this._(arguments, 1); request.q.docs = docs;
      return request(POST, '_bulk_docs', { q: 0, b: request.q });
    },

    /**
        Delete documents in bulk.

        @param {Object[]} docs Array of documents to insert or update.
          @param {String} doc._id Document ID.
          @param {String} doc._rev Document revision.
        @param {Object} [options] Options.
          @param {Boolean} [options.all_or_nothing] Use all-or-nothing semantics.
        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object[]} [callback.results] Array with results of each
            document in the bulk operation.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-bulk-docs_post)
     */

    delAll: function(docs, query, headers, callback) {
      var i = 0, len = docs.length, doc;
      while (i < len) if (doc = docs[i++]) doc._deleted = true;
      this.bulk(docs, query, headers, callback);
    },

    /**
        Query a view.

        @param {String|Object} view View name (e.g. mydesign/myview) or
          temporary view definition. Using a temporary view is strongly not
          recommended for production use.
        @param {Object} [options] Options.
          @param {JSON} [options.key] Key to lookup.
          @param {JSON} [options.startkey] Start returning results from this key.
          @param {String} [options.startkey_docid] Start returning results
            from this document ID. Allows pagination with duplicate keys.
          @param {JSON} [options.endkey] Stop returning results at this key.
          @param {String} [options.endkey_docid] Stop returning results at
            this document ID. Allows pagination with duplicate keys.
          @param {Integer} [options.limit] Limit number of results returned.
          @param {Boolean|String} [options.stale] Do not refresh view even if
            stale. For CouchDB versions `1.1.0` and up, set to `update_after` to
            update view after results are returned.
          @param {Boolean} [options.descending=false] Lookup results in reverse
            order by key, returning documents in descending order by key.
          @param {Integer} [options.skip] Skip this many records before
            returning results.
          @param {Boolean|Integer} [options.group=false] Use the reduce function
            to group results by key. Set to an integer specify `group_level`.
          @param {Boolean|Integer} [options.reduce=true] Use the reduce function.
          @param {Boolean} [options.fetch=false] Include document source for
            each result.
          @param {Boolean} [options.include_end=true] Include `options.endkey`
            in results.
          @param {Boolean} [options.update_seq=false] Include sequence value
            of the database corresponding to the view.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_view_API)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-temp-view_post)
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

      body = this._parseViewOptions(request.q, body);
      return request(body ? POST : GET, path, { b: body });
    },

    /**
        Update document using server-side handler.

        If the update handler does not return JSON data, do not use a callback.
        Instead, use the returned `ClientRequest` to directly manipulate the
        request.

        @param {String} handler Update handler. Example: mydesign/myhandler
        @param {String} [id] Document ID.
        @param {Object} [query] Query parameters.
        @param {Object|String} [data] Data.
        @param {Object} [headers] Headers.
        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] Response object.
        @return {ClientRequest} Client request.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Document_Update_Handlers)
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
        Replicate database.

        This convenience function sets `options.source` and `options.target` to
        the selected database name. Either `options.source` or `options.target`
        must be overridden for a successful replication request.

        @param {Options} options Options. Accepts all options from
          `Client.replicate()`.
          @param {String} [options.source=this.name] Source database URL or
            local name. Defaults to the selected database name if not given.
          @param {String} [options.target=this.name] Target database URL or
            local name. Defaults to the selected database name if not given.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.result] Response result.
     */

    replicate: function(options, query, callback) {
      if (!options.source) options.source = this.name;
      if (!options.target) options.target = this.name;
      return this.client.replicate(options, query, callback);
    },

    /**
        Ensure recent changes are committed to disk.

        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-ensure-full-commit_post)
    */

    commit: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_ensure_full_commit');
    },

    /**
        Purge deleted documents from database.

        @param {Object} revs Map of document IDs to revisions to be purged.
        @param {Function} callback Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-purge_post)
     */

    purge: function(revs /* [query], [headers], [callback] */) {
      return this._(arguments, 1)(POST, '_purge', { b: revs });
    },

    /**
        Compact database or design.

        @param {String} [design] Design name if compacting design indexes.
        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-compact_post)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-compact-design-doc_post)
     */

    compact: function(/* [design], [query], [headers], [callback] */) {
      var request = this._(arguments);
      return request(POST,
        '_compact' + (request.p ? '/' + request.p : '')
      );
    },

    /**
        Remove unused views.

        @param {Function} [callback] Callback function.
          @param {Error|null} callback.error Error or `null` on success.
          @param {Object} [callback.data] Response data.
          @param {ClientResponse} [callback.response] ClientResponse object.
        @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
        @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-view-cleanup_post)
     */

    vacuum: function(/* [query], [headers], [callback] */) {
      return this._(arguments)(POST, '_view_cleanup');
    },

    _: function(args, start, withDoc) {
      function request(method, path, options) {
        if (!options) options = {};

        self.request(
          method,
          path || request.p,
          options.q || request.q,
          options.b || request.b,
          options.h || request.h,
          options.f || request.f
        );

        return self;
      }

      // [id], [rev], [doc], [query], [header], [callback]
      args = slice.call(args, start);

      request.f = isFunction(args[args.length - 1]) && args.pop();
      request.p = isString(args[0]) && encodeURI(args.shift());

      var self = this
        , rev = isString(args[0]) && encodeURIComponent(args.shift());

      request.q = args[withDoc ? 1 : 0] || {};
      if (rev) request.q.rev = rev;
      request.h = args[withDoc ? 2 : 1] || {};
      request.b = withDoc && args[0];

      return request;
    },

    _parseViewOptions: function(q, body) {
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
  typeof window != 'undefined' && window,
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
);
