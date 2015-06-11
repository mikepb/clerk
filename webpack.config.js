"use strict";

/**
 * Webpack configuration.
 */

exports = module.exports = {
  output: {
    library: "clerk",
    libraryTarget: "umd",
    sourcePrefix: ""
  },
  externals: [{
    "sinon": "sinon",
    "es6-promise": "window"
  }],
  devtool: "source-map",
  node: {
    Buffer: false
  }
};
