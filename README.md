clerk
=====

CouchDB library for Node.js


## Installation

```bash
npm install watson
```


## Running Tests

Install `vows`:

```bash
npm install vows
```

Then:

```bash
npm test
```


## Usage

```javascript
var clerk = require('clerk');

var client = clerk.createClient({
  host: '127.0.0.1',
  port: 8080
});

var db = client.database('test');

db.info(function(err, info) {
  console.dir(err || info);
});
```


## License

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
