var connect = require("connect");

exports.connect = function() {
  return connect.staticProvider({ root: __dirname + "/../../lib", cache: true});
};
