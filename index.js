var debug = require('debug')('rm-wh:index');

module.exports = function (argv) {
  return require('wh')(argv);
};
