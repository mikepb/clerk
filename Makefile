REPORTER=dot

# prefer installed scripts
PATH := ./node_modules/.bin:${PATH}

OUTJS = clerk.js
MINJS = clerk.min.js

build:
	uglifyjs $(OUTJS) > $(MINJS)

test:
	mocha --reporter $(REPORTER) --require 'test/shared' --bail

.PHONY: build test
