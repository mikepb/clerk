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
