REPORTER=dot

# prefer installed scripts
PATH := ./node_modules/.bin:${PATH}

HEADJS = lib/head.js
TAILJS = lib/tail.js

OUTJS = clerk.js
MINJS = clerk.min.js

build:
	uglifyjs $(OUTJS) > $(MINJS)

test:
	mocha --reporter $(REPORTER) test/*-test.coffee

browser-test:
	jade src/test/index.jade

.PHONY: build clean distclean test
