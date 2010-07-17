(function(exports) {
  var debug;
  if (require) {
    var sys = require("sys");
    debug = function() {
      sys.puts(sys.inspect(arguments));
    };
  } else if (window.console && window.console.log) {
    debug = console.log;
  }

  var carena = {
    applyProperties : function(obj, props){
      for (var i in props) {
        if (props.hasOwnProperty(i)) {
          Object.defineProperty(obj, i, Object.getOwnPropertyDescriptor(props, i));
        }
      }
      return obj;
    },

    // Build a reusable factory
    Design : function(obj, features, options) {
      if (arguments.length === 2 && options && options.length) {
        features = options;
      }

      var i        = 0,
          len      = features.length;

      features = features || [];

      return function(_obj, _features, _options) {
        _features = _features || [];
        features.push.apply(features, _features);
        return carena.Build(_obj, features, _options); 
      };
    },
    _nodeId : 0,
    // Build an actual reference
    Build  : function(obj, features, options) {
      carena._nodeId+=1;
      obj = obj || {};
      var i        = 0,
          features = features || [];
          len      = features.length,
          obj.myId = carena._nodeId;

      // Based on the incomming parts array, build out self.
      for (i=0; i<len; i+=1) {
        features[i](obj, options);
      }
      return obj;
    }
  };

  // Default available features
  carena.feature = {
    Node : function(obj, options) {
      options = options || {}; //carena.mixin({}, options);
      
      var safe = {
        coords   : { x:0, y:0, z:0 },
        size     : { width:0, height:0 },
        bounds   : { x:0, y:0, width:0, height:0, dirty: false },
        children : [],
        parent   : null,
        dirty    : false
      };

      return carena.applyProperties(obj, {
        // Calculate bounds and return an object {x,y,width,height}
        get bounds() {
          if (safe.bounds.dirty) {
            safe.bounds.x      = safe.coords.x;
            safe.bounds.y      = safe.coords.y;
            safe.bounds.width  = safe.width;
            safe.bounds.height = safe.height;

            var len    = safe.children.length,
                i      = 0,
                bounds = safe.bounds,
                node;

            // recursively calculate the bounding box
            for (i; i<len; i++) {
              if (children[i].dirty === false) { continue; }
              node = children[i].bounds;

              bounds.x      = (node.x < bounds.x) ? node.x : bounds.x;
              bounds.y      = (node.y < bounds.y) ? node.y : bounds.y;

              bounds.width  = (node.x + node.width > bounds.width) ?
                               node.x + node.width                 :
                               bounds.x;

              bounds.height = (node.y + node.height > bounds.y) ?
                               node.y + node.height             :
                               bounds.y;
            }
            bounds.dirty = false;
          }

          // return the cached result
          return safe.bounds;
        },
        
        containsPoint : function(x,y,bounding) {
          var c = (bounding) ? obj.bounds : obj;

          // simply AABB
          if (c.x <= x && c.x+c.width  >= x && 
              c.y <= y && c.y+c.height >= y) 
          {
            return true;
          }
          return false;
        },

        get x() { return safe.coords.x; },
        set x(value) {
          safe.coords.x = value;
          safe.dirty = true;
        },

        get y() { return safe.coords.y; },
        set y(value) {
          safe.coords.y = value;
          safe.dirty = true;
        },

        get z() { return safe.coords.z; },
        set z(value) {
          safe.coords.z = value;
          safe.dirty = true;
        },

        get height() { return safe.coords.height; },
        set height(value) {
          safe.coords.height = value;
          safe.dirty = true;
        },

        get width() { return safe.coords.width; },
        set width(value) {
          safe.coords.width = value;
          safe.dirty = true;
        },

        get children() { return safe.children; },
        get parent()   { return safe.parent; },
        set parent(value) {
          if (safe.parent) {
            safe.parent.dirty = true;
            safe.parent.remove(this);
          }

          safe.parent = value;
          safe.dirty = true;
        },

        get dirty() { return safe.dirty; },
        set dirty(value) { 
          obj.ascend(function(node) { node._dirty = value; });
        },

        // Functions
        clean : function() {
          safe.dirty = false;
          return obj;
        },

        add : function(child) {
          child.parent = this;
          safe.children.push(child);
          safe.dirty = true;
          return obj;
        },

        child : function(idx) {
          return safe.children[idx] || null;
        },

        remove : function(child) {
          var i = 0; len = safe.children.length;
          for (i; i<len; i++)
          {
            if (safe.children[i] === child) {
              safe.children.splice(i,1);
              break;
            }
          }
          safe.dirty = true;
          return obj;
        },

        walk : function(map, callback, depth) {
          var levels   = (depth) ? depth-1 : null,
              fnResult, // false means stop!
              walker   = {
                _stopped : false,
                stop     : function() {
                  walker._stopped = true;
                },
                stopped  : function() {
                  return walker._stopped;
                },
                nodesWalked : 1,
              };

          if (typeof callback === "function") {
            fnResult = callback(this, walker);
          }

          if (fnResult !== false && 
              (levels === null || levels >= 0) &&
              walker.stopped() === false)
          {
            try {
              map(obj, function(currentNode) {
                var result = currentNode.walk(map, callback, levels);
                if (result.stopped() === true) {
                  throw result;
                }
                walker.nodesWalked += result.nodesWalked;
              });

            // stop mapping if the walker was stopped
            } catch (e) {
              walker.nodesWalked += e.nodesWalked;
            }
          }
          return walker;
        },

        ascend  : function(fn, depth) {
          return obj.walk(function(node, callback) {
            if (node && node.parent) {
              callback(node.parent);
            }
          },fn, depth);
        },

        descend : function(fn, depth) {
          return obj.walk(function(node, callback) {
            var l=node.children.length, i=0, result;
            for (i; i<l; i++) {
              callback(node.child(i));
            }
          }, fn, depth);
        }
      });
    },

    // Provides x,y,z coords and maintains a bounding box
    Renderable : function(obj, options) {
    },

    // Provide collision detection methods
    Collidable : function(obj, options) {
      options = carena.mixin(options, {
        
      });

      return carena.mixin(obj, {
        
      });
    },

    // Provides the ability to bind/trigger external events
    Eventable : function(obj, options) {
      var safe = {
        binds : {}
      };

      var queryBinds = function(name, foundFn) {
        var i=0,
            l,
            results = [],
            bindParts,
            nameParts = name.split("."),
            found,
            last;

        for (var bind in safe.binds) {
         found = true;
         // catch all
          if (bind !== "*" ) {
            bindParts = bind.split(".");
             for (i=0; i<nameParts.length; i++) {
              if (bindParts[i]) {
                if (nameParts[i] !== bindParts[i] && bindParts[i] !== "*" && nameParts[i] !== "*") {
                  found = false;
                  break
                }
                last = bindParts[i];
              } else if (last !== "*") {
                found = false;
                break;
              }
            }
          }

          if (found) {
            l = safe.binds[bind].length;
            for (i=l-1; i>=0; i--) {
              foundFn(bind, i);
            }
          }
        }
      };

      obj.event = {};
      carena.applyProperties(obj.event, {
        bind : function (name, fn) {
          if (!safe.binds[name]) {
            safe.binds[name] = [];
          }
          safe.binds[name].push(fn);
          return obj;
        },

        unbind : function (name, fn) {
          // slice a callback off
          if (name) {
            queryBinds(name, function(resolvedName, index) {
              if (!fn || safe.binds[resolvedName][index] === fn) {
                safe.binds[resolvedName].splice(index,1);
              }
            });
          } else {
            safe.binds[name] = [];
          }
          return obj;
        },

        trigger : function (name, data) {
          queryBinds(name, function(resolvedName, index) {
            var bind = safe.binds[resolvedName][index];
            bind(data, bind);
          });

          // bubbling
          if (obj.parent && obj.parent.event) {
            obj.parent.event.trigger(name, data);
          }
          return obj;
        }
    });
    return obj;
  }

/*

/*
  var nodeId = 0;
  function node() {
    var 
        id     = nodeId++,
        bounds = null,
        binds  = {},
        makeDirty = function() {
          if (self.parent && self.parent !== self) {
            self.parent.dirty = true;
          }
          dirty = true;
        },
        self = {
        };



    self.walk = function(fn, depth) {
      var levels   = (depth) ? depth-1 : null,
          fnResult = false, // false means stop!
          walker   = {
            _stopped : false,
            stop     : function() {
              walker._stopped = true;
            },
            stopped  : function() {
              return walker._stopped;
            },
            nodesWalked : 1,
          };

      if (typeof fn === "function") {
        fnResult = fn(self, walker);
      }

      if (fnResult !== false && 
          (levels === null || levels >= 0) &&
          walker.stopped() === false)
      {
        var l=children.length, i=0, result;
        for (i; i<l; i++)
        {
          result = children[i].walk(fn, levels);
          walker.nodesWalked += result.nodesWalked;
          if (result.stopped()) {
            walker.stop();
            break;
          }
        }
      }
      return walker;
    };
    // Expose self
    return this;
  }*/
  };
  exports.carena = carena;
})(exports || window);
