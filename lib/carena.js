var carena =
(function() {

  var isNode = typeof require == "function" && 
               typeof process == 'object' && 
               process.argv &&  
               process.argv[0].match(/^node/) !== null;

  var debug = null;

  if (isNode) {
    var sys = require("sys");
    debug = function() {
      sys.puts(sys.inspect(arguments));
    };
  } else if (window.console && window.console.log) {
    debug = console.log;
  } else {
    // you are out of luck!
  }

  var nodeId = 0;
  function node() {
    var _x = 0,
        _y = 0,
        _z = 0,
        _height = 0,
        _width = 0,
        _dirty = false,
        _children = [],
        _self   = this,
        _parent = _self,
        _id     = nodeId++;
    
    var dirty = function() {
      _dirty = true;
    };
    
    // used with dirty
    _self.clean = function() {
      _dirty = false;
      return _self;
    };  
    
    _self.__defineGetter__('id', function() { return _id; });
    
    _self.__defineGetter__('x', function() { return _x; });
    _self.__defineSetter__('x', function(x) { 
      _x = x;
      dirty(); 
    });

    _self.__defineGetter__('y', function() { return _y; });
    _self.__defineSetter__('y', function(y) { 
      _y = y;
      dirty();
    });

    _self.__defineGetter__('z', function() { return _z; });
    _self.__defineSetter__('z', function(z) { 
      _z = z;
      dirty();
    });


    _self.__defineGetter__('height', function() { return _height; });
    _self.__defineSetter__('height', function(height) { 
      _height = height; 
      dirty();
    });

    _self.__defineGetter__('width', function() { return _width; });
    _self.__defineSetter__('width', function(width) { 
      _width = width; 
      dirty(); 
    });

    _self.__defineGetter__('children', function() {
      return _children;
    });
    
    _self.__defineGetter__('child', function(idx) {
      return _children[idx] || null;
    });
    
    _self.__defineGetter__('parent', function() { return _parent; });
    _self.__defineSetter__('parent', function(parent) { 
      _parent = parent;
      dirty();
    });

    _self.__defineGetter__('dirty', function() { return _dirty; });

    _self.add = function(child) {
      // parent call needs to make dirty.
      child.parent = _self;
      _children.unshift(child);
      return _self;
    };
    
    // Thanks to John Resig (MIT Licensed)  
    var removeByIndexes = function(from, to) {
      var rest = _children.slice((to || from) + 1 || _children.length);
      _children.length = from < 0 ? _children.length + from : from;
      return _children.push.apply(_children, rest);
    };
    
    _self.remove = function(child) {

      var i=0;len=_children.length;
      for (i; i<len; i++)
      {
        if (_children[i] === child) {
          removeByIndexes(i,i);
          break;
        }
      }     

      dirty();
      return _self;
    };
    return _self;
  }

  node.prototype = {};

  ret = { node : node};
  if (isNode) {
    exports.carena = ret;  
  }
  return ret;
})();
