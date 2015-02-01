# clerk [![Build Status](https://secure.travis-ci.org/mikepb/clerk.png)](http://travis-ci.org/mikepb/clerk)

CouchDB library for node and the browser and sister project to [sage][sage]

```javascript
var clerk = require('clerk');

var client = clerk('http://127.0.0.1:5984');

var db = client.database('test');

db.info(function(err, info) {
  console.dir(err || info);
});
```

## Installation

```bash
$ npm install clerk
```

## Experimental Browser Support

`clerk.js` and `clerk.min.js` are the browser and minified browser versions of
the library. Modern browsers are generally supported, but not widely tested.
The `test/index.html` and `test/index-min.html` run the [mocha][mocha] tests
in the browser.

Security restrictions on cross-domain requests currently limits the usefulness
of the browser version. Using a local proxy or configuring [Cross-Origin
Resource Sharing][cors] on a proxy in front of CouchDB may allow you to use
the library in the browser.

## Philosophy

The philosophy of *clerk* is to provide a thin wrapper around the CouchDB API,
making the database easier to use from JavaScript. *clerk* is designed to
quickly allow you to get started with CouchDB. As you get more comfortable
with *clerk* and CouchDB, *clerk* gives you full access to CouchDB's
more advanced features.

The library API generally follows the RESTful API, so you can use the CouchDB
docs as well as the *clerk* docs to build your applications. If a feature is
missing from *clerk* or you need to access more advanced features, the
`request` method allows you to send custom requests directly to CouchDB.

## License

Copyright 2012-2015 Michael Phan-Ba <michael@mikepb.com>

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[cors]: http://www.w3.org/TR/cors/
[mocha]: http://visionmedia.github.com/mocha/
[sage]: https://github.com/mikepb/sage
