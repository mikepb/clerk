REPORTER=dot

# prefer installed scripts
PATH := $(CURDIR)/node_modules/.bin:/usr/local/bin:${PATH}

OUTJS = clerk.js
MINJS = clerk.min.js
MAPJS = clerk.min.js.map

build: $(MINJS)

test: $(MINJS)
	@PATH=$(PATH) mocha --reporter $(REPORTER) --require 'test/shared'

clean:
	@rm -f $(MINJS) $(MAPJS)

$(MINJS): $(OUTJS)
	@PATH=$(PATH) uglifyjs \
		--source-map $(MAPJS) \
		--comments '/^!/' \
		--output $(MINJS) \
		$(OUTJS)
	@git add $(MINJS)

.PHONY: build test clean
