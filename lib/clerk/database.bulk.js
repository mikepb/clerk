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

var util = require('./util');


/** Query all documents by ID.

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
      @param {Boolean} [options.getendkey=true] Include `options.endkey` in
        results.
      @param {Boolean} [options.sequence=false] Include sequence value of
        the database corresponding to the view.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Results.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-all-docs_get)
 */

exports.all = function(options, callback) {
  var query, body;

  // unpack arguments
  if (typeof options === 'function') {
    callback = options;
  } else {
    var q = this._parseViewOptions(options);
    query = q.query, body = q.body;
  }

  // post or get
  this.request(body ? 'POST' : 'GET', '_all_docs', query, body, callback);
};


/** Insert or update documents in bulk.

    @param {Object} [options] Options.
      @param {Boolean} [options.atomic] Use all-or-nothing semantics.
    @param {Object[]} docs Array of documents to insert or update.
      @param {String} [doc._id] Document ID.
      @param {String} [doc._rev] Document revision.
      @param {Boolean} [doc._deleted] Flag indicating whether this document
        should be deleted.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object[]} [callback.results] Array with results of each
        document in the bulk operation.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_Bulk_Document_API)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-bulk-docs_post)
 */

exports.bulk = function(docs, options, callback) {
  var q = { docs: docs };

  // unpack arguments
  if (typeof options === 'function') {
    callback = options;
  } else {
    q = util.merge({}, options, q);
    if ('all_or_nothing' in q) q.all_or_nothing = !!q.all_or_nothing;
    else q.all_or_nothing = !!q.atomic;
    if (!q.all_or_nothing) delete q.all_or_nothing;
    delete q.atomic;
  }

  this.request('POST', '_bulk_docs', null, q, function(err, data, res) {
    // update document revisions
    if (!err && data) {
      for (var i = docs.length; i >= 0; --i) {
        if (data[i] && data[i].rev && data[i].id === docs[i]._id) {
          docs[i]._rev = data[i].rev;
        }
      }
    }
    callback(null, data, res);
  });
};
