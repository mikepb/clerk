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


Connector = require('clerk').Connector


itShouldSetPortOption = ->
  port = @options?.port or 5984
  it 'should set port option', =>
    expect(@connector.connector.port).toBe port


describe 'Connector', ->

  describe 'constructor', ->

    describe 'created with no options', ->
      @connector = new Connector
      itShouldSetPortOption.call @

    describe 'created with empty options', ->
      @connector = new Connector {}
      itShouldSetPortOption.call @

    describe 'created with port', ->
      @options = port: 8888
      @connector = new Connector @options
      itShouldSetPortOption.call @

    describe 'created with a URL with port', ->
      @options = port: 8888
      @connector = new Connector 'http://localhost:8888'
      itShouldSetPortOption.call @

    describe 'created with connector option', ->
      options = connector: {}
      connector = new Connector options
      it 'should use connector', ->
        expect(connector.connector).toBe options.connector

  describe 'close', ->
    callback = {}
    spy = createSpy()

    connector = new Connector connector: close: spy
    connector.close callback

    expect(spy.callCount).toBe 1
    expect(spy).toHaveBeenCalledWith callback

  xdescribe 'request', ->

  xdescribe '_response', ->

