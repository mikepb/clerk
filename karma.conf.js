"use strict";

/**
 * Karma configuration.
 */

module.exports = function (config) {
  config.set({

    frameworks: ["mocha", "sinon"],

    files: [
      "test/**_test.js"
    ],

    preprocessors: {
      "test/**_test.js": ["webpack"]
    },

    reporters: ["progress"],

    browsers: ["Chrome"],

    webpack: require("./webpack.config"),

    plugins: [
      "karma-chrome-launcher",
      "karma-firefox-launcher",
      "karma-mocha",
      "karma-sinon",
      "karma-webpack"
    ]

  });
};
