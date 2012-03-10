/*!

    Clerk CouchDB for node and the browser.
    Copyright 2012 Michael Phan-Ba.

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
    Methods for CouchDB database.

    @param {Client} options Clerk client.
    @param {String} options Database name.
 */

exports.Database = function(client, name) {
  this.client = client;
  this.name = name;
  this.uri = client.uri + '/' + encodeURIComponent(name);
};

exports.Database.prototype = {

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

  // [[[[[method], path], query], data], headers], [callback]
  request: exports.request,

  /**
      Create database.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_put)
   */

  create: function(/* query, callback */) {
    var args = exports.unpackArgs(arguments);
    this.request('PUT', '', args.q, '', args.f);
  },

  /**
      Destroy database.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_delete)
   */

  destroy: function(/* query, callback */) {
    var args = exports.unpackArgs(arguments);
    this.request('DELETE', '', args.q, '', args.f);
  },

  /**
      Check if database exists.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_get)
  */

  info: function(/* query, callback */) {
    var args = exports.unpackArgs(arguments);
    this.request('GET', '', args.q, args.f);
  },

  /**
      Check if database exists.

      @param {Function} callback Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Boolean} [callback.result] `true` if existing, `false`
          otherwise.
  */

  exists: function(/* query, callback */) {
    var args = exports.unpackArgs(arguments);
    this.request('HEAD', '', args.q, function(err, body, status, headers, xhr) {
      args.f && args.f(err, status === 200, headers, headers, xhr);
    });
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
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#'GET')
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-dbdoc_db-doc_get)
  */

  get: function(/* id, [rev], [query], [callback] */) {
    var args = unpackDocArgs(arguments);
    this.request('GET', args.id, args.q, args.f);
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

  head: function(id /* query, callback */) {
    var args = exports.unpackArgs(arguments);
    this.request('HEAD', encodeURIComponent(id), args.q, function(err, body, status, headers, xhr) {
      args.f && args.f(err, err ? body : {
        id: id,
        rev: headers.etag && JSON.parse(headers.etag),
        contentType: headers['content-type'],
        contentLength: headers['content-length']
      }, status, headers, xhr);
    });
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

  put: function(/* [id], [rev], [doc], [query] callback */) {
    var args = unpackDocArgs(arguments, 1);
    this.request('PUT', args.id, args.q, args.doc, args.f);
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
      @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#'POST')
      @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-dbdoc_db_post)
  */

  post: function(/* doc, [query], callback */) {
    var args = unpackDocArgs(arguments, 1);
    this.request('POST', '', args.q, args.doc, args.f);
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

  del: function(id, rev, query, callback) {
    var args = unpackDocArgs(arguments);
    this.request('DELETE', args.id, args.rev, '', args.f);
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

  copy: function(source, target, query, callback) {
    var sourcePath = encodeURIComponent(source.id || source._id)
      , targetPath = encodeURIComponent(target.id || target._id)
      , sourceRev = source.rev || source._rev
      , targetRev = target.rev || target._rev;

    if (exports.isFunction(query)) {
      callback = options;
      query = {};
    }

    if (sourceRev) query.rev = sourceRev;
    if (targetRev) targetPath += '?rev=' + encodeURIComponent(targetRev);

    this.request('COPY', sourcePath, query, '', {
      'Destination': targetPath
    }, callback);
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

  all: function(query, callback) {
    var body;

    if (exports.isFunction(query)) {
      callback = query;
    } else {
      body = parseViewOptions(query);
    }

    this.request(body ? 'POST' : 'GET', '_all_docs', query, body, callback);
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

  bulk: function(docs /* query, callback */) {
    var args = exports.unpackArgs(arguments);
    args.q.docs = docs;
    this.request('POST', '_bulk_docs', 0, args.q, args.f);
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

  delAll: function(docs, query, callback) {
    var i = 0, doc;
    while (doc = docs[i++]) {
      doc._deleted = true;
    }
    this.bulk(docs, query, callback);
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

  view: function(view /* query, callback */) {
    var args = exports.unpackArgs(arguments)
      , view = args[0]
      , body;

    if (view) {
      path = view.split('/', 2);
      path = ['_design', encodeURIComponent(path[0]), '_view', encodeURIComponent(path[1])].join('/');
    } else {
      path = '_temp_view';
      body = view;
    }

    body = parseViewOptions(query, body);
    this.request(body ? 'POST' : 'GET', path, args.q, body, args.f);
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
    var args = Array.prototype.slice.call(arguments, 1)
      , callback = exports.isFunction(args[args.length - 1]) && args.pop()
      , id = isString(id) && args.shift()
      , query = args[0]
      , data = args[1]
      , headers = args[2]
      , path = handler.split('/', 2);

    path = ['_design', encodeURIComponent(path[0]), '_update', encodeURIComponent(path[1])];
    if (id) path.push(id);
    path = path.join('/');

    this.request(id ? 'PUT' : 'POST', path, query, data, headers, callback);
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
    options.source || (options.source = this.name);
    options.target || (options.target = this.name);
    this.client.replicate(options, query, callback);
  },

  /**
      Ensure recent changes are committed to disk.

      @param {Function} [callback] Callback function.
        @param {Error|null} callback.error Error or `null` on success.
        @param {Object} [callback.data] Response data.
        @param {ClientResponse} [callback.response] ClientResponse object.
      @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-ensure-full-commit_post)
  */

  commit: function(/* [query], [callback] */) {
    var args = exports.unpackArgs(arguments);
    this.request('POST', '_ensure_full_commit', args.q, '', args.f);
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

  purge: function(revs /* [query], [callback] */) {
    var args = exports.unpackArgs(arguments);
    this.request('POST', '_purge', args.q, revs, args.fn);
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

  compact: function(/* [design], [query], [callback] */) {
    var args = exports.unpackArgs(arguments)
      , path = '_compact';

    if (args[0]) {
      path += '/' + encodeURIComponent(design);
    }

    this.request('POST', path, args.q, '', args.f);
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

  vacuum: function(callback) {
    this.request('POST', '_view_cleanup', 0, '', callback);
  }

};

function unpackDocArgs(args, withDoc) {
  // [id, rev], [doc], [query], callback
  args = Array.prototype.slice.call(args);

  return {
    f: isFunction(args[args.length - 1]) && args.pop(),
    id: exports.asString(args[0]) && encodeURI(args.shift()),
    rev: exports.asString(args[0]) && args.shift(),
    q: args[withDoc ? 1 : 0],
    doc: withDoc && args[0]
  };
}

function parseViewOptions(q, body) {
  if (q) {
    if (q.key) q.key = JSON.stringify(q.key);
    if (q.startkey) q.startkey = JSON.stringify(q.startkey);
    if (q.endkey) q.endkey = JSON.stringify(q.endkey);
    if (q.stale && q.stale !== 'update_after') q.stale = 'ok';
    if (q.keys) {
      body || (body = {});
      body.keys = q.keys;
      delete q.keys;
    }
  }
  return body;
}
