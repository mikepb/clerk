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


/** List all databases.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetAllDbs)
    @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_all-dbs_get)
 */

exports.databases = function(callback) {
  this.request('GET', '_all_dbs', callback);
};


/** Get server information.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetRoot)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_root_get)
 */

exports.info = function(callback) {
  this.request('GET', callback);
};


/** Get tail of the server log file.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetLog)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_log_get)
 */

exports.stats = function(callback) {
  this.request('GET', '_stats', callback);
};


/** List running tasks.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HttpGetActiveTasks)
    @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-misc.html#couchbase-api-misc_active-tasks_get)
 */

exports.tasks = function(callback) {
  this.request('GET', '_active_tasks', callback);
};


/** Get configuration values.

    @param {String} [section] Configuration section or key.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Configuration data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-config.html)
 */

exports.config = function(section, callback) {
  var path = ['_config'];

  // unpack arguments
  if (typeof section === 'function') {
    callback = section;
  } else {
    path.concat(section.split('/'))
  }

  path = path.map(encodeURIComponent).join('/');
  this.request('GET', path, callback);
};


/** Set configuration value.

    @param {String} section Configuration section.
    @param {String} key Configuration key.
    @param {String} [value] Configuration value. Omit to delete.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.value] Previous configuration value.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase Api](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-config.html#couchbase-api-config_config-section-key_put)
 */

exports.setConfig = function(section, key, value, callback) {
  var path = ['_config', section, key].map(encodeURIComponent).join('/');
  if (typeof value === 'function') {
    this.request('DELETE', path, callback);
  } else {
    this.request('PUT', path, null, value, callback);
  }
};


/** Get tail of the server log file.

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

exports.log = function(q, callback) {

  // unpack arguments
  if (typeof count === 'function') {
    callback = count;
    q = null;
  } else {
    if (!q.bytes || (q.bytes = parseInt(q.bytes)) < 0 || q.bytes === 1000) delete q.bytes;
    if (!q.offset || (q.offset = parseInt(q.offset)) <= 0) delete q.offset;
  }

  this.request('GET', '_log', q, callback);
};
