# clerk [![Build Status](https://secure.travis-ci.org/mikepb/clerk.png)](http://travis-ci.org/mikepb/clerk)

CouchDB library for node and the browser (experimental)

## Installation

```bash
npm install clerk
```

## Running Tests

```bash
npm install
npm test
```

## Usage

```javascript
var clerk = require('clerk');

var client = clerk('http://127.0.0.1:5984');

var db = client.database('test');

db.info(function(err, info) {
  console.dir(err || info);
});
```

## License

Copyright 2012 Michael Phan-Ba

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

<center><http://www.apache.org/licenses/LICENSE-2.0></center>

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
