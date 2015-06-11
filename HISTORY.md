0.8.3 / 2015-06-11
==================

  * [Added] Assign `clerk.Promise` for custom Promise implementations.
  * [Fixed] `db.exists()` resolves to false on 404.
  * Update dependencies.


0.8.2 / 2015-04-30
==================

  * Return HTTP status code on error


0.8.1 / 2015-04-27
==================

  * Catch emitted errors from superagent
  * Update dependencies


0.8.0 / 2015-02-15
==================

  * Update Travis-CI to test against node 0.10-12 and iojs
  * Change DB#update() to accept data before query


0.7.2 / 2015-02-11
==================

  * Add `abort` method to returned promises
  * Update tests to allow for parallelization
  * Fix a bug in the follow handler
  * Document use with promises


0.7.1 / 2015-02-09
==================

  * Add `browser` property to `package.json`


0.7.0 / 2015-02-04
==================

  * Use superagent to support clerk in the browser
  * Use Karma for browser testing
  * Remove node uuid generator
  * Beta: return promises when no callback given to support co


0.6.1 / 2015-02-01
==================
  
  * Only set prototypical _id and _rev


0.6.0 / 2015-02-01
==================

  * Update dependencies
  * Test against CouchDB 1.6.1


0.5.3 / 2014-01-04
==================

  * Fix error handling on HEAD requests


0.5.2 / 2013-12-31
==================

  * Ensure query Array values are JSON encoded


0.5.1 / 2013-12-30
==================

  * Update dependencies


0.5.0 / 2012-11-13
==================

  * Use ~ instead of . for URL-safe base64 IDs to support content-negotiation
    file extensions over HTTP


0.4.2 / 2012-11-04
==================

  * Define _id, id, _rev, and rev on prototypes to hide from JSON.stringify
  * Ignore missing callbacks


0.4.1 / 2012-05-19
==================

  * Return server errors as errors


0.4.0 / 2012-05-12
==================

  * Fixed URI parsing on node side
  * UUIDs use '.' instead of '_' to avoid generating IDs starting with '_'
  * Added uglify-js dependency
  * Removed useless zombie.js tests


0.3.2 / 2012-05-06
==================

  * `clerk#uuids()` accepts `nbytes` to use when generating base64 uuids


0.3.1 / 2012-05-06
==================

  * Fixed `clerk#uuids()` and added relevant tests


0.3.0 / 2012-05-05
==================

  * Renamed `DB#view()` as `DB#find()`


0.2.0 / 2012-05-04
==================

  * Overhauled library with experimental browser support


0.0.1 / 2011-10-07
==================

  * Initial release
