/*jshint boss:true browser:true laxcomma:true node:true strict:false undef:true */
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
    CouchDB client.

    @param {String} uri Fully qualified URI.
    @param {Object} [options] Options.
      @param {Object} [options.auth] Authentication credentials.
        @param {String} [options.auth.user] Username.
        @param {String} [options.auth.pass] Password.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/Complete_HTTP_API_Reference)
 */

function Client(uri) {
  this.uri = uri || 'http://127.0.0.1:5984';
}

Client.prototype = {

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
    Select database to manipulate.

    @param {String} name Database name.
    @return {Database} Database object.
   */

  database: function(name) {
    var db = new exports.Database(this, name);
    db.auth = this.auth;
    return db;
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
    return this._(arguments)('GET', '_all_dbs');
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
    var request = this._(arguments, 1);
    if (count > 1) request.q.count = count;
    return request('GET', '_uuids');
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
    return this._(arguments)('GET');
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
    return this._(arguments)('GET', '_stats');
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
    return this._(arguments)('GET', '_log');
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
    return this._(arguments)('GET', '_active_tasks');
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
    return request('GET',
      '_config' + (request.p ? '/' + encodeURI(request.p) : '')
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

  setConfig: function(section, key, value /* [query], [headers], [callback] */) {
    return this._(arguments, 3)('PUT',
      ['_config', encodeURIComponent(section), encodeURIComponent(key)].join('/')
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

  delConfig: function(section, key /* [query], [headers], [callback] */) {
    return this._(arguments, 2)('DELETE',
      ['_config', encodeURIComponent(section), encodeURIComponent(key)].join('/')
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
    return this._(arguments)('POST', '_replicate', { b: options });
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
    return this._(arguments)('POST', '_restart');
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
    args = [].slice.call(args, start);

    request.f = exports.isFunction(args[args.length - 1]) && args.pop();
    request.p = exports.isString(args[0]) && args.shift();
    request.q = args[0] || {};
    request.h = args[1] || {};

    return request;
  }

};

exports.Client = Client;
