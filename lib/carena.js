(function(exports) {
  var debug;
  if (typeof require !== "undefined") {
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

      features = features || [];
      var i        = 0,
          len      = features.length;

      return function(_obj, _features, _options) {
        features.push.apply(features, _features || []);
        return carena.Build(_obj, features, _options); 
      };
    },
    _nodeId : 0,
    // Build an actual reference
    Build  : function(obj, features, options) {
      carena._nodeId+=1;
      obj = obj || {};
      var i        = 0,
          features = features || [],
          len      = features.length;

      // Based on the incomming parts array, build out self.
      for (i=0; i<len; i+=1) {
        features[i](obj, options);
      }
      obj.myId = carena._nodeId;
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
          if (safe.dirty) {
            safe.bounds.x      = safe.coords.x;
            safe.bounds.y      = safe.coords.y;
            safe.bounds.width  = safe.size.width;
            safe.bounds.height = safe.size.height;

            var len    = obj.children.length,
                i      = 0,
                bounds = safe.bounds,
                node;

            // recursively calculate the bounding box
            for (i; i<len; i++) {
              if (obj.children[i].dirty === false) { continue; }
              node = obj.children[i].bounds;

              bounds.x      = (node.x < bounds.x) ? node.x : bounds.x;
              bounds.y      = (node.y < bounds.y) ? node.y : bounds.y;

              bounds.width  = (node.x + node.width > bounds.width) ?
                               node.x + node.width                 :
                               bounds.width;

              bounds.height = (node.y + node.height > bounds.y) ?
                               node.y + node.height             :
                               bounds.height;
            }
            safe.dirty = false;
          }

          // return the cached result
          return safe.bounds;
        },
        
        containsPoint : function(x,y,bounding) {
          var c = {};
          if (bounding) {
            c  = obj.bounds;
          } else {
            c = safe.coords;
            c.width = safe.size.width;
            c.height = safe.size.height;
          }
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
          if (obj.event && typeof obj.event.trigger === "function") {
             obj.event.trigger("node.x", {node : obj, oldValue: safe.coords.x, value: value});
          }
          safe.coords.x = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get y() { return safe.coords.y; },
        set y(value) {
          if (obj.event && typeof obj.event.trigger === "function") {
             obj.event.trigger("node.y", {node : obj, oldValue: safe.coords.y, value: value});
          }
          safe.coords.y = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get z() { return safe.coords.z; },
        set z(value) {
          if (obj.event && typeof obj.event.trigger === "function") {
             obj.event.trigger("node.z", {node : obj, oldValue: safe.coords.z, value: value});
          }
          safe.coords.z = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get height() { return safe.size.height; },
        set height(value) {
          if (obj.event && typeof obj.event.trigger === "function") {
             obj.event.trigger("node.height", {node : obj, oldValue: safe.coords.x, value: value});
          }
          safe.size.height = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get width() { return safe.size.width; },
        set width(value) {
          if (obj.event && typeof obj.event.trigger === "function") {
             obj.event.trigger("node.width", {node : obj, oldValue: safe.coords.x, value: value});
          }
          safe.size.width = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
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
          if (value === safe.dirty) {
            return;
          }
          
          if (obj.event) {
             obj.event.trigger("node.dirty", {node : obj, oldValue: safe.dirty, value: value});
          }
          safe.dirty = value || false;
          obj.ascend(function(node) {
            if (node !== obj) {
              node.dirty = value;
            }
          });
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

    // Provides the ability to bind/trigger external events
    Eventable : function(obj, options) {
      var safe = {
        binds : {}
      };

      var queryBinds = function(name, foundFn) {
        var i=0,  l,  results = [], bindParts,
            nameParts = name.split("."), found, last;

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
            bind(name, data);
          });

          // bubbling
          if (obj.parent && obj.parent.event) {
            obj.parent.event.trigger(name, data);
          }
          return obj;
        }
      });
      return obj;
    },
    
    Renderer : function(obj, options) {
      var safe = {
        canvas  : null,
        context : null
      };
      
      if (!options.canvas) {
        throw new Error("Renderer requires an options.canvas");
      }
      
      safe.context = options.canvas.getContext("2d");

      carena.applyProperties(obj, {
        get context() {  return safe.context; },
        get canvas() { return options.canvas; },
        
        render : function(node) {
          node.walk(function(node, callback) {
            var l=node.children.length, i=l-1;
            for (i; i>=0; i--) {
              callback(node.child(i));
            }
          }, function(node, walker) {
            
            node.render();
            /*
            TODO: optimize me.
            currently, dirty propagates up the tree, but in reality it needs to go down the tree as well
            for this to be "optimized".  Adding to this problem, we have a trigger on every dirty so things
            get recursive.
            
            if (node.dirty) {
              if (node.render) {
                node.render();
              }
            } else {
              return false; // don't continue down this branch
            }*/
          });
        }
      });
      
      obj.x = 0;
      obj.y = 0;
      obj.width = options.canvas.width;
      obj.height = options.canvas.height;
      return obj;
    },
    
    Camera : function(obj, options) {
      var safe = {
        target : null,
        mouse  : {x:0, y:0},
        oldMouseMoveTarget : null, // TODO: odd way of caching.. might want to reconsider this
        mouseDownTarget : null
      };
      
      if (!options.renderer) {
        throw new Error("Creating a canvas requires an options.renderer (carena.features.Renderer)");
      }
      
      // TODO: this might not always be on a document *winky wink*
      document.addEventListener("mousemove", function(ev) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        safe.mouse.x = ev.clientX - (options.renderer.canvas.offsetLeft - window.pageXOffset);
        safe.mouse.y = ev.clientY - (options.renderer.canvas.offsetTop  - window.pageYOffset);
        var target = obj.nodeByPoint(safe.mouse.x, safe.mouse.y);
        if (target && target.event) {
          if (safe.oldMouseMoveTarget && safe.oldMouseMoveTarget !== target) {
            safe.oldMouseMoveTarget.event.trigger("mouse.out", {
              target: target, 
              mouse: safe.mouse
            });
            safe.oldMouseMoveTarget = null;
          }

          if (!safe.oldMouseMoveTarget) {
            safe.oldMouseMoveTarget = target;
            target.event.trigger("mouse.in", {
              target: safe.oldMouseMoveTarget,
              mouse: safe.mouse
            });
          }

          target.event.trigger("mouse.move", {target: target, mouse: safe.mouse});
        } else if (safe.oldMouseMoveTarget) {
          safe.oldMouseMoveTarget.event.trigger("mouse.out", {
            target: safe.oldMouseMoveTarget,
            mouse: safe.mouse
          });
          safe.oldMouseMoveTarget = null;
        }

        if (safe.mouseDownTarget && safe.mouseDownTarget.event) {
          safe.mouseDownTarget.event.trigger("mouse.move", {
            target: safe.mouseDownTarget,
            mouse: safe.mouse
          });
        }
      });

      // TODO: this might not always be on a dom document *winky wink*
      document.addEventListener("mousedown", function(ev) {
        safe.mouseDownTarget = safe.oldMouseMoveTarget;
        if (safe.mouseDownTarget) {
          safe.mouseDownTarget.event.trigger("mouse.down", {
            target: safe.mouseDownTarget,
            mouse: safe.mouse
          });
        }
      });

      document.addEventListener("mouseup", function(ev) {
        if (safe.mouseDownTarget) {
          safe.mouseDownTarget.event.trigger("mouse.up", {
            target: self.mouseDownTarget,
            mouse: safe.mouse
          });
        }
        safe.mouseDownTarget = null;
      });

      return carena.applyProperties(obj, {
        get target() { return safe.target; },
        set target(value) { 
          safe.target = value;
        },
        nodeByPoint : function(x, y) {
          var found = null;

          if (safe.target) {
            safe.target.walk(function(node, callback) {
              var l=node.children.length, i=l-1;
              for (i; i>=0; i--) {
                callback(node.child(i));
              }
            }, function(node, walker) {
              if (node.containsPoint(x, y)) {
                
                found = node;
              } else if (!found) {
                //return false; // don't continue down this branch
              }
            });
          }
          return found;
        },
        render : function() {
          options.renderer.render(safe.target);
        }
      });
    },
    
    Draggable : function(obj, options) {
      options = options || {};
      options.draggingZ = options.draggingZ || 1;
      var safe = {
        node   : null,
        offset : {x:0, y:0},
        originalZ : 0
      }

      if (obj.event) {
        obj.event.bind("mouse.down", function(name, data) {
          if (data.target === obj) {
            safe.node = obj.dragstart(data.target, data.mouse);
            obj.event.trigger("drag.start", data);
          }
        });

        // Mouse movement is tricky.  On one hand, you don't want to continue sending mouse.move
        // to a node after you have mouse.out'd. On the other hand, dragging items around can be
        // slow, and may experience a few mouse.out events.
        obj.event.bind("mouse.move", function(name, data) {
          if (safe.node) {
            obj.dragging(safe.node, data.mouse);
            obj.event.trigger("drag.move", data);
          }
        });
        obj.event.bind("mouse.up", function(name, data) {
          if (safe.node) {
            obj.dragend(safe.node, data.mouse);
            obj.event.trigger("drag.end", data);
          }
        });
      }

      return carena.applyProperties(obj, {
        dragstart : function (node, mouse) {
          safe.originalZ = node.z;
          node.z = safe.draggingZ;
          safe.offset.x = node.x-mouse.x;
          safe.offset.y = node.y-mouse.y;
          return node;
        },

        dragging : function (node, mouse) {
          obj.x = mouse.x + safe.offset.x;
          obj.y = mouse.y + safe.offset.y;
        },

        dragend : function (node, mouse) {
          safe.offset = {x:0, y:0};
          node.z = safe.originalZ;
          safe.node = null;
        }
      });
    }
  };
  exports.carena = carena;
})(window || exports);