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


vows = require 'vows'
assert = require 'assert'
sinon = require 'sinon'
clerk = require 'clerk'

Connector = clerk.Connector





suite = vows.describe 'Connector'





(->

  shouldUsePort = (options) -> (connector) ->
    port = options?.port or 5984

    context =
      topic: if options then new Connector else new Connector options

    context["should use port #{port}"] = ->
      assert.strictEqual(connector.connector.port, port)

    context


  suite.addBatch
    'constructor':
      'created with no options': shouldUsePort()
      'created with empty options': shouldUsePort {}
      'created with port 8888': shouldUsePort(port: 8888)

)()





(->

  suite.addBatch
    'close':

      topic: ->
        close = sinon.stub()
        callback = sinon.stub()

        connector = new Connector connector: close: close
        connector.close callback

        connector: connector
        callback: callback
        close: close

      'should callback underlying connector.close()': ({ callback, close }) ->
        assert.isTrue close.calledOnce
        assert.isTrue close.calledWith callback

)()





(->

  factory = ->
    requestObject = on: sinon.stub()
    request = sinon.stub().returns requestObject
    connector = new Connector connector: request: request

    context =
      connector: connector
      request: request
      requestObject: requestObject
      answer: connector.request.apply connector, arguments

  calledOnce = (context = {}) ->
    context['once'] = ({ request }) ->
      assert.isTrue request.calledOnce
    context

  withEmptyOptions = (context = {}) ->
    context['with empty options'] = ({ request }) ->
      arg0 = request.getCall(0).args[0]
      assert.isEmpty arg0 if typeof arg0 isnt 'undefined'
    context

  returningRequestObject = (context = {}) ->
    context['returning request object'] = ({ answer, requestObject }) ->
      assert.strictEqual answer, requestObject
    context

  suite.addBatch
    'request':

      'with no options':
        topic: -> factory()
        'should call connector.request':
          calledOnce withEmptyOptions returningRequestObject()

      'with data':
        topic: ->
          factory data: {
            message: 'Hello World!'
            fn: -> 'Goodbye World!'
          }

        'should call connector.request': ->
          calledOnce returningRequestObject

            'with headers': ({ request }) ->
              assert.notEmpty headers = request.getCall(0).args[0].headers
              assert.strictEqual headers['Content-Type'], 'application/json'
              assert.isTrue headers['Content-Length'] > 0

            'with json parsable data': ({ request, data }) ->
              js = null
              json = request.getCall(0).args[0].data
              assert.notEmpty json
              assert.doesNotThrow (-> js = JSON.parse(json) ), SyntaxError
              assert.strictEqual js.message, data.message
              assert.match js.fn /\bfunction(\s|\\n)*\(\)(\s|\\n)*{(\s|\\n)*\breturn\b(\s|\\n)*'Goodbye World!'(\s|\\n)*;(\s|\\n)*}/

      'with data emitter':
        topic: -> factory data: on: sinon.stub()

        'should call connector.request': ->
          calledOnce withEmptyOptions returningRequestObject

      'with callback':
        topic: ->
          callback = sinon.stub()
          context = factory callback
          context.callback = callback
          context

        'should call connector.request': ->
          calledOnce withEmptyOptions returningRequestObject()

        'should call request.on':

          'with error callback': ({ requestObject, callback }) ->
            assert.isTrue requestObject.on.calledWith 'error', callback

          'with response callback': ({ requestObject }) ->
            assert.isTrue requestObject.on.calledWith 'response'

          'and respond to response event':
            topic: ({ callback, requestObject }) ->
              responseObject =
                on: sinon.stub()
                setEncoding: sinon.stub()

              responder = args[1] for args in requestObject.on.args when args[0] is 'response'
              responder(responseObject)

              callback: callback
              responseObject: responseObject

            'to set encoding to utf8': ({ responseObject }) ->
              responseObject.setEncoding.alwaysCalledWith 'utf8'

            'to respond':

              'to data events': ({ responseObject }) ->
                responseObject.on.calledWith 'data'

              'to end event': ({ responseObject }) ->
                responseObject.on.calledWith 'end'

              'to error event': ({ responder, responseObject }) ->
                responseObject.on.calledWith 'error', responder

)()



"""
suite.addBatch
  '_response':

"""



suite.export module
