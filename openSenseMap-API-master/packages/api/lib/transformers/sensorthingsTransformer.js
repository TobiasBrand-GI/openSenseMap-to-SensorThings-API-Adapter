'use strict';

const { transformOneBox } = require('../helpers/staUtils');

const Transform = require('stream').Transform,
  inherits = require('util').inherits;


const sensorthingsTransformer = function (transformerOptions, streamOptions) {
  if (!(this instanceof sensorthingsTransformer)) {
    return new sensorthingsTransformer(transformerOptions, streamOptions);
  }
  if (!streamOptions) {
    streamOptions = {};
  }

  streamOptions.decodeStrings = false;
  streamOptions.objectMode = true;
  Transform.call(this, streamOptions);
};

sensorthingsTransformer.prototype._transform = function _transform (item, encoding, callback) {
  this.push(transformOneBox(item));
  callback();
};


inherits(sensorthingsTransformer, Transform);

module.exports = sensorthingsTransformer;
