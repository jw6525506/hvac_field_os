'use strict';

exports.up = function(db) {
  console.log('Initial migration - schema already applied in production');
  return null;
};

exports.down = function(db) {
  return null;
};

exports._meta = { "version": 1 };
