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


/** Replicate database.

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

exports.replicate = function(options, callback) {
  options = util.merge({ source: this.name, target: this.name }, options);
  this.client.replicate(options, callback);
};


/** Ensure recent changes are committed to disk.

    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-ensure-full-commit_post)
 */

exports.commit = function(callback) {
  this.request('POST', '_ensure_full_commit', null, '', callback);
};


/** Purge deleted documents from database.

    @param {Object} revs Map of document IDs to revisions to be purged.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-purge_post)
 */

exports.purge = function(revs, callback) {
  this.request('POST', '_purge', null, revs, callback);
};


/** Compact database or design.

    @param {String} [design] Design name if compacting design indexes.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-compact_post)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-compact-design-doc_post)
 */

exports.compact = function(design, callback) {
  var path = '_compact';

  // unpack arguments
  if (typeof design === 'function') callback = design;
  else path += '/' + encodeURIComponent(design);

  this.request('POST', path, null, '', callback);
};


/** Remove unused views.

    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Compaction)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-view-cleanup_post)
 */

exports.vacuum = function(callback) {
  this.request('POST', '_view_cleanup', null, '', callback);
};


/** Subscribe to database changes.

    The `feed` option determines how the callback is called:

      - `normal` calls the callback once.
      - `continuous` calls the callback each time an update is received.
      - `longpoll` waits for a response, then calls the callback once.

    @param {Object} [options]
      @param {String} [options.feed="normal"] Type of feed. See comments
        above.
      @param {String} [options.filter] Filter updates using this filter.
      @param {Integer} [options.limit] Maximum number of rows to return.
      @param {Integer} [options.since=0] Start results from this sequence
        number.
      @param {Boolean} [options.fetch=false] Include documents with
        results.
      @param {Integer} [options.timeout=1000] Maximum period in milliseconds
        to wait for a change before sending a response, even if there are no
        results.
      @param {Integer} [options.heartbeat=1000] Period in milliseconds after
        which an empty line is sent. Applicable only to feed types
        `longpoll` and `continuous`. Overrides `options.timeout` to keep the
        feed alive indefinitely.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_database_API#Changes)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-changes_get)
 */

exports.changes = function(options, callback) {
  var self = this;

  // unpack arguments
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var q = options || {};

  // mappings
  if (q.fetch) q.include_docs = q.fetch;
  delete q.fetch;

  var continuous = q.feed === 'continuous';

  // feed type
  if (q.feed !== 'continuous' || q.feed !== 'longpoll') delete q.feed;

  // filter
  q.filter
    ? q.filter = this._escapePath(q.filter.split('/'))
    : delete q.filter;

  q.limit >= 0 ? q.limit = parseInt(q.limit) : delete q.limit;
  q.since > 0 ? q.since = parseInt(q.since) : delete q.since;
  q.include_docs ? q.include_docs = true : delete q.include_docs;

  // timeout and heartbeat
  if (q.feed) {
    q.heartbeat = q.heartbeat > 0 ? q.heartbeat : 1000;
    delete q.timeout;
  } else {
    q.timeout = q.timeout > 0 ? q.timeout : 1000;
    delete q.heartbeat;
  }

  var request = this.request('GET', '_changes', q)
    , parse = self.client.connector._response;

  // connect to server
  request.on('response', function(response) {
    var buffer = [];

    function emit() {
      var body, data;

      if (!(body = buffer.join('').trim())) return;

      // parse body
      try {
        data = JSON.parse(body);
      } catch (err) {
        return callback(err, body, response);
      }

      // callback with results
      if (parse) parse(data, response, callback);
      else callback(null, data, response);
    }

    // capture and parse response body
    response.setEncoding('utf8');
    response.on('data', function(chunk) {
      var body, end;

      // only process continuous feeds containing newline
      if (!continuous || !~(end = chunk.indexOf('\n'))) return buffer.push(chunk);

      // newline seen
      buffer.push(chunk.substr(0, end));

      // emit data
      emit(body);

      // reset buffer with remaining
      buffer = chunk.length > ++end ? [chunk.substr(end)] : [];
    });

    response.on('end', emit);
    response.on('error', callback);
  });

  request.on('error', callback);
};
