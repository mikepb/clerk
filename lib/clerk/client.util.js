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


/** Get UUIDs.

    @param {Integer} [count=1] Number of UUIDs to get.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {String[]} [callback.uuids] UUIDs or error data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetUuids)
    @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_uuids_get)
 */

exports.uuids = function(count, callback) {
  var query;

  // unpack arguments
  if (typeof count === 'function') {
    callback = count;
  } else {
    query = count > 1 && { count: parseInt(count) };
  }

  // send request
  this.request('GET', '_uuids', query, callback);
};


/** Replicate databases.

    @param {Object} options Options.
      @param {String} options.source Source database URL or local name.
      @param {String} options.target Target database URL or local name.
      @param {Boolean} [options.cancel] Set to `true` to cancel replication.
      @param {Boolean} [options.continuous] Set to `true` for continuous
        replication.
      @param {Boolean} [options.create] Set to `true` to create the
        target database.
      @param {String} [options.filter] Filter name for filtered replication.
        Example: "mydesign/myfilter".
      @param {Object} [options.query] Query parameters for filter.
      @param {String[]} [options.ids] Document IDs to replicate.
      @param {String} [options.proxy] Proxy through which to replicate.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Replication)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_replicate_post)
 */

exports.replicate = function(options, callback) {

  // required query parameters
  var data = {
    source: options.source,
    target: options.target
  };

  // optional query parameters
  if (options.cancel) data.cancel = true;
  if (options.continuous) data.continuous = true;
  if (options.create || options.create_target) data.create_target = true;
  if (options.filter) data.filter = options.filter;
  if (options.query) data.query_params = options.query;
  if (options.ids || options.doc_ids) data.doc_ids = options.ids || options.doc_ids;
  if (options.proxy) data.proxy = options.proxy;

  // callback with replicate results
  this.request('POST', '_replicate', null, data, callback);
};


/** Restart server.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_restart_post)
 */

exports.restart = function(callback) {
  this.request('POST', '_restart', null, '', callback);
};
