
if (typeof window != 'undefined') {
  exports._ = window.clerk;
  window.clerk = exports;
}

})(
  typeof module != 'undefined' ? module : {},
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
);
