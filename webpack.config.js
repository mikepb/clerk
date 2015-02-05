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
  externals: [
    {
      "sinon": "sinon",
      "buffer": "",
      "follow": "",
      "./follow": ""
    }
  ],
  devtool: "source-map"
};
