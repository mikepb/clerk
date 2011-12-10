#
#   Copyright 2011 Michael Phan-Ba
#
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distributed under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.
#


assert = require 'assert'
clerk = require 'clerk'
sinon = require 'sinon'

util = require '../lib/clerk/util'





describe 'uuids()', ->

  behaveLikeUuids = (count, encoding, callback) -> ->

    args = []
    args.push count if typeof count is 'number'
    args.push encoding if encoding
    args.push callback = sinon.stub() if callback

    count ?= 1

    uuids = util.uuids.apply util.uuids, args

    it "should return #{count} UUIDs", ->
      assert.strictEqual uuids.length, count

    if encoding is 'base64'
      it 'should return URL-safe base64-encoded 16-byte UUIDs', ->
        for uuid in uuids
          assert.ok /[0-9a-zA-Z\-_]{22}/.test uuid
    else
      it 'should return hex-encoded 16-byte UUIDs', ->
        for uuid in uuids
          assert.ok /[0-9a-f]{32}/.test uuid

    if callback
      it 'should callback with uuids', ->
        assert.ok callback.calledOnce
        assert.ok callback.alwaysCalledWith null, uuids

  describe 'with no options', behaveLikeUuids()

  describe 'with count of 1', behaveLikeUuids 1,
  describe 'with count of 2', behaveLikeUuids 2,
  describe 'with count of 100', behaveLikeUuids 100,

  describe 'with count of 1 and encoding of "foobar"', behaveLikeUuids 1, 'foobar',
  describe 'with count of 2 and encoding of "foobar"', behaveLikeUuids 2, 'foobar',
  describe 'with count of 100 and encoding of "foobar"', behaveLikeUuids 100, 'foobar',

  describe 'with count of 1 and encoding of "base64"', behaveLikeUuids 1, 'base64',
  describe 'with count of 2 and encoding of "base64"', behaveLikeUuids 2, 'base64',
  describe 'with count of 100 and encoding of "base64"', behaveLikeUuids 100, 'base64',

  describe 'with count of 1 and callback', behaveLikeUuids 1, null, true,
  describe 'with count of 2 and callback', behaveLikeUuids 2, null, true,
  describe 'with count of 100 and callback', behaveLikeUuids 100, undefined, true,

  describe 'with count of 1, encoding of "foobar", and callback', behaveLikeUuids 1, 'foobar', true,
  describe 'with count of 2, encoding of "foobar", and callback', behaveLikeUuids 2, 'foobar', true,
  describe 'with count of 100, encoding of "foobar", and callback', behaveLikeUuids 100, 'foobar', true,

  describe 'with count of 1, encoding of "base64", and callback', behaveLikeUuids 1, 'base64', true,
  describe 'with count of 2, encoding of "base64", and callback', behaveLikeUuids 2, 'base64', true,
  describe 'with count of 100, encoding of "base64", and callback', behaveLikeUuids 100, 'base64', true,

  describe 'with encoding of "foobar"', behaveLikeUuids null, 'foobar',
  describe 'with encoding of "base64"', behaveLikeUuids null, 'base64',

  describe 'with encoding of "foobar" and callback', behaveLikeUuids null, 'foobar', true,
  describe 'with encoding of "base64" and callback', behaveLikeUuids null, 'base64', true,

  describe 'with callback', behaveLikeUuids null, null, true
