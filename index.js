"use strict";

/*!

clerk - CouchDB client for node and the browser.
Copyright 2012-2016 Michael Phan-Ba

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
 * Module dependencies.
 */

var clerk = require("./clerk");
var follow = require("follow");

/**
 * Node.js compatible follow method, based on `follow` package.
 */

clerk.follow = function (/* [query], [headers], [callback] */) {
  var self = this;
  var request = self._(arguments);
  var options = request.q;
  var feed;

  if (!request.f) return self;

  delete options.feed;
  options.db = self.uri;
  options.headers = request.h;
  feed = new follow.Feed(options);

  feed
    .on("change", function (body) {
      var stop = request.f.call(this, null, self._response(body), 200, {}, this);
      if (stop === false) feed.stop();
    })
    .on("error", function (err) {
      request.f.call(this, err, null, 0, {}, this);
    })
    .follow();

  return self;
};

/**
 * Export clerk.
 */

module.exports = clerk;
