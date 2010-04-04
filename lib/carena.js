(function() {

var isNode = typeof require == "function" && 
             typeof process == 'object' && 
             process.argv &&  
             process.argv[0].match(/^node/) != null;

var debug = null;

if (isNode) {
  var sys = require("sys");
  debug = function() {
    sys.puts(sys.inspect(arguments));
  }
} else if (console && console.log) {
  debug = console.log;
} else {
  // you are out of luck!
}


function node() {
  var _x = 0,_y=0,_height=0,_width=0,_dirty=false;
  
  var dirty = function() {
    _dirty = true;
  };
  
  // used with dirty
  this.clean = function() {
    _dirty = false;
  };  
  
  this.__defineGetter__('x', function() { return _x; });
  this.__defineSetter__('x', function() { dirty(); return _x; });


  this.__defineGetter__('y', function() { return _y; });
  this.__defineSetter__('y', function() { dirty(); return _y; });

  this.__defineGetter__('height', function() { return _height; });
  this.__defineSetter__('height', function() { dirty(); return _height; });

  this.__defineGetter__('width', function() { return _width; });
  this.__defineSetter__('width', function() { dirty(); return _width; });

  this.__defineGetter__('dirty', function() { return _dirty; });


}

node.prototype = {};


if (isNode) {
  exports.node = node;

}

})()

