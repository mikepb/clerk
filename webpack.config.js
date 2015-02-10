"use strict";

/**
 * Webpack configuration.
 */

exports = module.exports = {
  output: {
    library: "clerk",
    libraryTarget: "this",
    sourcePrefix: ""
  },
  externals: [{
    "sinon": "sinon"
  }],
  devtool: "source-map",
  node: {
    Buffer: false
  }
};
