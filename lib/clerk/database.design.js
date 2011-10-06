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


/** Query a view.

    @param {String|Object} view View name (e.g. mydesign/myview) or
      temporary view definition. Using a temporary view is strongly not
      recommended for production use.
    @param {Object} [options] Options.
      @param {JSON} [options.key] Key to lookup.
      @param {JSON} [options.startkey] Start returning results from this key.
      @param {String} [options.startid] Start returning results from this
        document ID. Allows pagination with duplicate keys.
      @param {JSON} [options.endkey] Stop returning results at this key.
      @param {String} [options.endid] Stop returning results at this
        document ID. Allows pagination with duplicate keys.
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
      @param {Boolean} [options.getendkey=true] Include `options.endkey` in
        results.
      @param {Boolean} [options.sequence=false] Include sequence value of
        the database corresponding to the view.
    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [CouchDB Wiki](http://wiki.apache.org/couchdb/HTTP_view_API)
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db-temp-view_post)
 */

exports.view = function(view, options, callback) {
  var path, query, body;

  // unpack arguments
  if (arguments.length === 2) {
    callback = options;
    options = null;
  }

  if (typeof view === 'string') {
    path = view.split('/', 2);
    path = ['_design', path[0], '_view', path[1]].map(encodeURIComponent).join('/');
  } else {
    path = '_temp_view';
    body = view.map ? view : { map: view };
  }

  // parse options
  if (options) {
    var q = this._parseViewOptions(options, body);
    query = q.query, body = q.body;
  }

  // post or get
  this.request(body ? 'POST' : 'GET', path, query, body, callback);
};


/** Update document using server-side handler.

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

exports.update = function(handler /* [id], [query, [data, [headers]]], [callback] */) {

  // unpack arguments
  var args = Array.prototype.slice.call(arguments, 1)
    , id = typeof args[0] === 'string' && args.shift()
    , callback = typeof args[args.length - 1] === 'function' && args.pop()
    , query = args[0]
    , data = args[1]
    , headers = args[2]
    , path = path.split('/', 2);

  path = ['_design', path[0], '_update', path[1]];
  id && path.push(id);
  path = path.map(encodeURIComponent).join('/');

  return this.request(id ? 'PUT' : 'POST', path, query, data, headers, callback);
};
