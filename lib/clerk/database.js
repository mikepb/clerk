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

var Client = require('./Client').Client
  , util = require('./util');


/** Methods for CouchDB database.

    @param {Object} options Options.
      @param {String} options.name Database name.
      @param {Client} options.client Cradle client.
 */

var Database = exports.Database = function(options) {
  this.name = options.name;
  this.prefix = this.name && encodeURIComponent(this.name);
  this.client = options.client;
};


util.merge(Database.prototype,
  require('./database.bulk'),
  require('./database.design'),
  require('./database.document'),
  require('./database.info'),
  require('./database.util')
);


/** Create database.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_put)
 */

Database.prototype.create = function(callback) {
  this.request('PUT', null, null, '', callback);
};


/** Destroy database.

    @param {Function} callback Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.data] Response data.
      @param {ClientResponse} [callback.response] ClientResponse object.
    @see [Couchbase API](http://www.couchbase.org/sites/default/files/uploads/all/documentation/couchbase-api-db.html#couchbase-api-db_db_delete)
 */

Database.prototype.destroy = function(callback) {
  this.request('DELETE', null, null, '', callback);
};


/** Service a request on database.

    @param {String} [method] HTTP method.
    @param {String} [path] HTTP path relative to database.
    @param {Object} [query] HTTP query data.
    @param {Object} [data] Request data.
    @param {Object} [headers] HTTP headers.
    @param {Function} [callback] Callback function.
      @param {Error|null} callback.error Error or `null` on success.
      @param {Object} [callback.result] Response result.
      @param {Object} [callback.status] Response status.
 */

Database.prototype.request = Client.prototype.request;
Database.prototype._request = function(q, callback) {
  if (this.prefix) q.path = q.path ? this.prefix + '/' + q.path : this.prefix;
  return this.client._request(q, callback);
};


Database.prototype._escapePath = function(url) {
  return url.split('/').map(encodeURIComponent).join('/');
};


Database.prototype._b64Attach = function(doc) {
  if (!doc._attachments) return;

  var attachs = {}, name, file, buffer, end;

  for (name in doc._attachments) {
    file = util.merge({}, doc._attachments[name]);
    file.data = new Buffer(file.data).toString('base64');

    if (file.contentType) file.content_type = file.contentType;
    delete file.contentType;

    attachs[name] = file;
  }

  doc._attachments = attachs;
};


Database.prototype._parseViewOptions = function(q, body) {

  if (q) {
    // mappings
    if (q.startid) q.startkey_docid = q.startid;
    if (q.endid) q.endkey_docid = q.endid;
    if (q.fetch) q.include_docs = q.fetch;
    if ('getendkey' in q) q.include_end = q.getendkey;
    if (q.sequence) q.update_seq = q.sequence;

    delete q.startid;
    delete q.endid;
    delete q.fetch;
    delete q.getendkey;
    delete q.sequence;

    // json-serialized
    if (q.key) q.key = JSON.stringify(q.key);
    if (q.startkey) q.startkey = JSON.stringify(q.startkey);
    if (q.endkey) q.endkey = JSON.stringify(q.endkey);

    // stale
    if (q.stale && q.stale !== 'update_after') q.stale = 'ok';

    // group_level overrides group=false
    if (!q.group_level && q.group) q.group_level = parseInt(q.group);
    if (!q.group_level) delete q.group_level;
    !q.group_level && q.group ? q.group = true : delete q.group;

    // reduce=true
    'reduce' in q && !q.reduce ? q.reduce = false : delete q.reduce;

    // descending=false
    q.descending ? q.descending = true : delete q.descending;

    // include_docs=false
    q.include_docs ? q.include_docs = true : delete q.include_docs;

    // inclusive_end=true
    'inclusive_end' in q && !q.inclusive_end
      ? q.inclusive_end = false : delete q.inclusive_end;

    // update_seq=false
    q.update_seq ? q.update_seq = true : delete q.update_seq;

    // special case for fetching keys
    if (q.keys) {
      body = body || {};
      body.keys = q.keys;
      delete q.keys;
    }
  }

  return { query: q, body: body };
};
