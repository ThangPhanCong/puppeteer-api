'use strict';

exports.createAlias = (name) => {
  return name.split(' ').join('').toLowerCase();
};