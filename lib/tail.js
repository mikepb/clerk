
if (typeof window != 'undefined') {
  exports._ = window.clerk;
  window.clerk = exports;
}

})(
  typeof exports != 'undefined' ? exports : {},
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
);
