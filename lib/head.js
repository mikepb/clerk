/*!
  Clerk (c) 2012 Michael Phan-Ba
  https://github.com/mikepb/clerk
  Apache License
*/

;(function(
  module,
  encodeURI,
  encodeURIComponent,
  decodeURIComponent
){

var exports = module.exports || {};

var GET = 'GET'
  , HEAD = 'HEAD'
  , POST = 'POST'
  , PUT = 'PUT'
  , DELETE = 'DELETE'
  , COPY = 'COPY';

var __slice = Array.prototype.slice;
