REPORTER=dot

# prefer installed scripts
PATH := ./node_modules/.bin:${PATH}

SRCJS = \
	lib/clerk.js \
	lib/client.js \
	lib/database.js

HEADJS = lib/head.js
TAILJS = lib/tail.js

OUTJS = clerk.js
MINJS = clerk.min.js

build:
	# wrap output
	# remove license headers
	# replace HTTP methods with variable declarations
	# unexpose Client, Database, extend, request, _response
	# replace Array.prototype.slice
	cat $(SRCJS) | sed -E \
		-e '/\/\*(!|jshint)/,/\*\//d' \
		-e "s/'(GET|HEAD|POST|PUT|DELETE|COPY)'/\1/g" \
		-e 's/exports\.(Clerk|Client|Database) = (Clerk|Client|Database);//g' \
		-e 's/exports\.(Clerk|Client|Database|extend|request|_request|_response|asString|isString|isObject|isFunction|unpackArgs)( =( )(function))?/\4\3\1/g' \
		-e 's/\[\].slice/__slice/g' \
		| cat $(HEADJS) - $(TAILJS) > $(OUTJS)
	uglifyjs $(OUTJS) > $(MINJS)

test:
	mocha --reporter $(REPORTER) test/*-test.coffee

browser-test:
	jade src/test/index.jade

.PHONY: build clean distclean test
