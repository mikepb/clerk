# clerk [![Build Status](https://travis-ci.org/mikepb/clerk.svg)](http://travis-ci.org/mikepb/clerk)

```js
var clerk = require('clerk');

var client = clerk('http://127.0.0.1:5984');
var db = client.db('test');

db.info(function (err, info) {
  console.log(err || info);
});

// if a Promise implementation is available, you may leave out the callback
var promise = db.info()
promise.then(function (info) {
  console.log(info);
}).catch(function (err) {
  console.log(err);
});
```

## Documentation

Full documentation at http://mikepb.github.io/clerk/

For more information about promises, see 
[this Mozilla documentation][promises].

## Installation

```sh
$ npm install clerk
```

## Browser Support

Browser support is provided by [superagent][]. The browser versions of the
library may be found under the `dist/` directory. The browser files are updated
on each versioned release, but not for development. Modern browsers are
generally supported, but not widely tested. [Karma][karma] is used to  run the
[mocha][] tests in the browser.

Security restrictions on cross-domain requests currently limits the usefulness
of the browser version. Using a local proxy or configuring [Cross-Origin
Resource Sharing][cors] in CouchDB may allow you to use the library in the
browser. Please see the configuration notes in the testing section for more
information about CouchDB CORS support.

To build the client files:

```sh
$ npm run dist
```

## Testing

To run tests in node:

```sh
$ npm test
```

To run tests with Karma, make sure that you have [enabled cors in
CouchDB][couchdb_cors]. By default, CouchDB does not allow the `Authorization`
header, so if you will be authenticating, you'll need to add it to the list as
well.

```
[httpd]
enable_cors = true

[cors]
credentials = true
origins = *
headers = Accept, Accept-Language, Authorization, Content-Length, Content-Range, Content-Type, Destination, Expires, If-Match, Last-Modified, Origin, Pragma, X-Requested-With, X-Http-Method-Override
```

Then, you may run Karma:

```sh
$ npm run karma
```

## Philosophy

The philosophy of *clerk* is to provide a thin wrapper around the CouchDB API,
making the database easier to use from JavaScript. *clerk* is designed to
quickly allow you to get started with CouchDB, while still giving you full
access to CouchDB's more advanced features.

The library API generally follows the RESTful API, so you can use the CouchDB
docs as well as the *clerk* docs to build your applications. If a feature is
missing from *clerk* or you need to access more advanced features, the
`request` method allows you to send custom requests directly to CouchDB.

## License

Copyright 2012-2015 Michael Phan-Ba &lt;michael@mikepb.com&gt;

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

&lt;http://www.apache.org/licenses/LICENSE-2.0&gt;

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[cors]: http://www.w3.org/TR/cors/
[couchdb_cors]: http://docs.couchdb.org/en/latest/config/http.html#cross-origin-resource-sharing
[karma]: http://karma-runner.github.io
[mocha]: http://mochajs.org
[promises]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise
[superagent]: https://github.com/visionmedia/superagent
