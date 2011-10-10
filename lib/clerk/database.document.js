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

var assert = require('assert').ok;

var util = require('./util');


exports.save = function(/* [id], [rev], doc, [options], [callback] */) {

  // unpack arguments
  var args = Array.prototype.slice.call(arguments)
    , callback = typeof args[args.length - 1] === 'function' && args.pop()
    , id = typeof args[0] === 'string' ? args.shift() : args[0]._id
    , rev = typeof args[0] === 'string' ? args.shift() : args[0]._rev
    , doc = args[0]
    , options = args[1];

  // map view
  if (id && /^_design\/.+$/.test(id) && !doc.language && doc.map) {
    doc = { language: 'javascript', views: doc };
  }

  this._save(id, rev, doc, options, callback);
};

exports._save = function(id, rev, doc, options, callback) {
  var self = this;
  if (id) {
    if (rev) {
      this._put(id, rev, doc, options, callback);
    } else {
      this._put(id, rev, doc, options, function(err, data, res) {
        if (err && res.statusCode === 409) {
          return self.head(id, function(err, data, res) {
            if (err) return callback && callback(err, data, res);
            self._put(id, data.rev, doc, options, callback);
          });
        }
        callback && callback(err, data, res);
      });
    }
  } else {
    this._post(doc, options, callback);
  }
};


/** Fetch document(s).

    @param {String|String[]} id Document ID or array of document IDs.
    @param {String} [rev] Document revision. Only valid for single document.
    @param {Object} [options] Options.
      @param {Boolean} [options.revs] Return a list of revisions. Set to
        `info` to return detailed revision information. Only valid when
        fetching single document.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Results.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Document_API#GET)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-dbdoc.html#couchbase-api-dbdoc_db-doc_get)
 */

exports.get = function(id /* [rev], [options], callback */) {

  // unpack arguments
  var args = Array.prototype.slice.call(arguments, 1)
    , callback = args.pop()
    , rev = typeof args[0] === 'string' && args.shift()
    , q = typeof args[0] === 'object' ? util.merge(args[0]) : {};

  // revs parameter
  if (q.revs === 'info') {
    q.revs_info = true;
    delete q.revs;
  } else {
    q.revs ? q.revs = true : delete q.revs;
  }

  return this._get(id, rev, q, callback);
};

exports._get = function(id, rev, q, callback) {

  // bulk get
  if (Array.isArray(id)) {
    q.keys = id;
    q.include_docs = true;
    return this.all(q, callback);
  }

  // request parameters
  if (rev) q.rev = rev;

  return this.request('GET', this._escapePath(id), q, callback);
};


/** Put document in database.

    All documents must have a document ID and revision.

    @param {String} [id] Document ID. Only valid for single document.
    @param {String} [rev] Document revision. Only valid for single document.
    @param {Object|Object[]} doc Document or array of documents.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Results.
      @param {ClientResponse} [callback.response] ClientResponse object.
 */

exports.put = exports.save;
exports._put = function(id, rev, doc, q, callback) {
  if (id) {
    doc._rev = rev;
    this.request('PUT', this._escapePath(id), q, doc, function(err, data, res) {
      // update rev
      if (!err && data && data.id === doc._id) doc._rev = data.rev;
      callback(err, data, res);
    });
  } else if (Array.isArray(doc)) {
    doc.forEach(function(doc) {
      assert(doc._id, 'A document is missing the document ID');
    });
    this.bulk(doc, q, callback);
  } else {
    throw new Error('Invalid arguments');
  }
};


/** Post document to database.

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

exports.post = function(doc, options, callback) {
  var q;

  // unpack arguments
  if (typeof options === 'function') {
    callback = options;
  } else {
    q = options;
    q.batch ? q.batch = true : delete q.batch;
  }

  this._post(doc, q, callback);
};

exports._post = function(doc, options, callback) {
  var q = options || {};
  if (Array.isArray(doc)) {
    doc.forEach(this._b64Attach);
    this.bulk(doc, q, callback);
  } else {
    this._b64Attach(doc);
    this.request('POST', null, q, doc, callback);
  }
};


/** Copy document.

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
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Results.
      @param {ClientResponse} [callback.response] ClientResponse object.
 */

exports.copy = function(source, target, callback) {

  // unpack arguments
  var sourcePath = encodeURIComponent(source.id || source._id)
    , targetPath = encodeURIComponent(target.id || target._id)
    , sourceRev = source.rev || source._rev
    , targetRev = target.rev || target._rev
    , q;

  if (sourceRev) q = { rev: sourceRev };
  if (targetRev) targetPath += '?rev=' + encodeURIComponent(targetRev);

  var headers = { 'Destination': targetPath };

  this.request('COPY', sourcePath, q, '', headers, callback);
};


/** Get document metadata.

    @params id, callback
    @params ids, callback

    @param {String|String[]} id Document ID or array of documents IDs.

    @param {String} id Document ID.
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

exports.head = function(id, callback) {
  if (Array.isArray(id)) {
    this.request('POST', '_all_docs', null, { keys: id }, function(err, data, res) {
      if (err) return callback(err, null, res);

      var meta = data.map(function(result) {
        if (result.value) {
          result.rev = result.value.rev;
          Object.defineProperty(result, 'value', { value: result.value });
        }
        return result;
      });

      callback(null, meta, res);
    });
  } else {
    this.request('HEAD', this._escapePath(id), function(err, headers, res) {
      if (err) return callback(err, null, res);

      var meta = {
        id: id,
        rev: JSON.parse(headers.etag),
        contentType: headers['content-type'],
        contentLength: headers['content-length']
      };

      callback(null, meta, res);
    });
  }
};


/** Delete document.

    @param {String|Object|Object[]} that Document, document ID, array of
      documents, or map of document IDs to revisions.
    @param {String} [rev] Document revision. Required and only valid for
      document ID.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Results.
      @param {ClientResponse} [callback.response] ClientResponse object.
 */

exports.remove = function(that, rev, callback) {

  // unpack arguments
  if (arguments.length === 2) {
    callback = rev;
    rev = null;
  }

  // extract document id and rev
  if (!rev && that._id && that._rev) {
    rev = that._rev;
    that = that._id;
  }

  // delete single document
  if (typeof that === 'string') {
    this.request('DELETE', this._escapePath(that), rev && { rev: rev }, '', callback);
    return;
  }

  var body = [];

  if (Array.isArray(that)) {
    // array of documents to delete
    that.forEach(function(doc) {
      body.push({ _id: doc._id, _rev: doc._rev, _deleted: true });
    });
  } else {
    // map of ids to revisions to delete
    for (id in that) {
      body.push({ _id: id, _rev: that[id], _deleted: true });
    }
  }

  // bulk delete
  this.request('POST', '_bulk_docs', null, body, callback);
};


/** Download attachment from document.

    @param {String} id Document ID.
    @param {String} attachmentName Attachment name.
    @return {ClientRequest} ClientRequest object.
 */

exports.attachment = function(id, attachmentName) {
  var path = [id, attachmentName].map(encodeURIComponent).join('/');
  return this.request('GET', path);
};


/** Upload attachment to document.

    @param {String} id Document ID.
    @param {String} rev Document revision.
    @param {String} attachmentName Attachment name.
    @param {String} [contentType] Attachment content type.
    @param {Object} data Data or stream.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Results.
      @param {ClientResponse} [callback.response] ClientResponse object.
 */

exports.attach = function(id, rev, attachmentName /* [contentType], data, [callback] */) {

  // unpack arguments
  var args = Array.prototype.slice.call(arguments, 3)
    , callback = typeof args[args.length - 1] === 'function' && args.pop()
    , data = args.pop()
    , headers = args[0] && { 'Content-Type': args.shift() }
    , query = { rev: rev }
    , path = [id, attachmentName].map(encodeURIComponent).join('/');

  this.request('PUT', path, query, data, headers, callback);
};
