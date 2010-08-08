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
          Object.defineProperty(obj,
                                i,
                                Object.getOwnPropertyDescriptor(props, i));
        }
      }
      return obj;
    },
    // build a tree from a raw js object
    Erect : function(obj, features, options) {
      if (obj) {
        var k, tmp, node,
            root = carena.Build({name: "root"}, features, options),
            process = function(parent, _obj, _features, _options) {
              if (_obj) {
                for (k in _obj) {
                  if (_obj.hasOwnProperty(k)) {
                    var _node = carena.Build({name: k}, _features, _options);
                    process(_node, obj[k], _features, _options);
                    parent.add(_node);
                  };
                }
              }
            };
        process(root, obj, features, options);
        return root;
      }
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
        var tmp = [];
        tmp.push.apply(tmp, features);
        tmp.push.apply(tmp, _features || []);
        return carena.Build(_obj, tmp, _options);
      };
    },
    _nodeId : 0,
    // Build an actual reference
    Build  : function(obj, features, options) {
      carena._nodeId+=1;
      obj = obj || {};
      var i        = 0,
          features = features || [],
          len      = features.length,
          origObj  = JSON.parse(JSON.stringify(obj));
      options = options || {};

      if (features) {
        if (typeof features === "function") {
          features(obj, options)
        } else {
          // Based on the incomming parts array, build out self.
          for (i=0; i<len; i+=1) {
            if (typeof features[i] === "function") {
              features[i](obj, options);
            } else {
              throw new Error(features[i] + " is not a function!");
            }
          }
        }
      }

      // Naive merge of default features onto the
      for (var k in origObj) {
        try {
          obj[k] = origObj[k];
        } catch (e) {
          console.log("had a problem setting " + k);
        }
      }

      obj.myId = carena._nodeId;
      return obj;
    },

    commonAncestor : function(node1, node2) {
      var path1 = [], path2 = [], i = 0, l;
      node1.ascend(function(node) {
        path1.push(node);
      });

      node2.ascend(function(node) {
        path2.push(node);
      });

      l = path1.length;
      for (i; i<l; i++) {
        if (path2[i] && path2[i] === path1[i]) {
          return path1[i];
        }
      }
      return null;
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
            obj.event.trigger("node.x", {
              node     : obj,
              oldValue : safe.coords.x,
              value    : value
            });
          }
          safe.coords.x = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get y() { return safe.coords.y; },
        set y(value) {
          if (obj.event && typeof obj.event.trigger === "function") {
            obj.event.trigger("node.y", {
              node     : obj,
              oldValue : safe.coords.y,
              value    : value
            });
          }
          safe.coords.y = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get z() { return safe.coords.z; },
        set z(value) {
          if (obj.event && typeof obj.event.trigger === "function") {
            obj.event.trigger("node.z", {
              node     : obj,
              oldValue : safe.coords.z,
              value    : value
            });
          }
          safe.coords.z = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get height() { return safe.size.height; },
        set height(value) {
          if (obj.event) {
             obj.event.trigger("node.height", {
               node    : obj,
               oldValue: safe.coords.x,
               value: value
             });
          }
          safe.size.height = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get width() { return safe.size.width; },
        set width(value) {
          if (obj.event) {
             obj.event.trigger("node.width", {
               node     : obj,
               oldValue : safe.coords.x,
               value    : value
             });
          }
          safe.size.width = value;
          safe.bounds.dirty = true;
          obj.dirty = true;
        },

        get children() { return safe.children; },
        get parent()   { return safe.parent; },
        set parent(value) {
          if (safe.parent === value) {
            return;
          }
          var oldParent = safe.parent;
          safe.parent = value;

          if (obj.event) {
            obj.event.trigger("node.parent", {
              node    : obj,
              current : oldParent,
              next: value
            });
          }

          safe.dirty = true;
        },

        // Getter/Setter for managing dirtyness of this node
        get dirty() { return safe.dirty; },
        set dirty(value) {
          if (value === safe.dirty) {
            return;
          }

          if (obj.event) {
            obj.event.trigger("node.dirty", {
              node     : obj,
              oldValue : safe.dirty,
              value    : value
            });
          }
          safe.dirty = value || false;
          obj.ascend(function(node) {
            if (node !== obj) {
              node.dirty = value;
            }
          });
        },

        // Clean this node
        clean : function() {
          safe.dirty = false;
          return obj;
        },

        // Simple unshift method, adds nodes to the beginning of the render list
        _unshift : function(child) {
          safe.children.unshift(child);
        },
        unshift : function(child) {
          // Recursion check
          var node = child;
          while (node) {
            if (node === obj) {
              return false;
            }
            node = node.parent;
          }

          child.parent = obj;
          obj._unshift(child);
          safe.dirty = true;
          if (obj.event) {
            // TODO: make this node.unshift?
            obj.event.trigger("node.add", {node: obj, child: child});
          }
          return obj;


        },

        // Simple add method, which does not emit an event
        _add : function(child) {
          safe.children.push(child);
        },

        // Push a child onto the end of the chilren array and emit node.add
        add : function(child) {
          // Recursion check
          var node = child;
          while (node) {
            if (node === obj) {
              return false;
            }
            node = node.parent;
          }

          child.parent = obj;
          safe.children.push(child);
          safe.dirty = true;
          if (obj.event) {
            obj.event.trigger("node.add", {node: obj, child: child});
          }
          return obj;
        },

        // Return a child object by its id. null on not found
        child : function(idx) {
          return safe.children[idx] || null;
        },

        // Return the index of the specified child, -1 on not found
        childIndex : function(child) {
          var i = 0; len = safe.children.length;
          for (i; i<len; i++) {
            if (safe.children[i] === child) {
              return i;
            }
          }
          return -1;
        },

        // Simplistic node removal function
        _remove : function(child) {
          var childIndex = obj.childIndex(child);
          if (childIndex > -1) {
            safe.children.splice(childIndex,1);
            return true;
          }
          return false;
        },

        // Remove a node from the children array, and emit an event
        remove : function(child) {
          if (obj._remove(child)) {
            child.parent = null;
            if (obj.event) {
              obj.event.trigger("node.remove", {node: obj, child: child});
            }
            safe.dirty = true;
          }
          return obj;
        },

        // Generic tree walking method.
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

        // Walks up the tree via parents
        ascend  : function(fn, depth) {
          return obj.walk(function(node, callback) {
            if (node && node.parent) {
              callback(node.parent);
            }
          },fn, depth);
        },

        // Walks the entire tree depth first and in reverse render order
        descend : function(fn, depth) {
          return obj.walk(function(node, callback) {
            var l=node.children.length, i=0, result;
            for (i; i<l; i++) {
              callback(node.child(i));
            }
          }, fn, depth);
        },

        // Returns an array of nodes containing a point in render order
        nodesByPoint : function(x, y) {
          var ret = [];
          if (obj) {
            obj.walk(function(node, callback) {
              var l=node.children.length, i=l-1;
              for (i; i>=0; i--) {
                callback(node.child(i));
              }
            }, function(node, walker) {
              if (node.containsPoint(x, y)) {
                ret.push(node);
              }
            });
          }
          return ret;
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
                if (nameParts[i] !== bindParts[i] &&
                    bindParts[i] !== "*"          &&
                    nameParts[i] !== "*")
                {
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
              if (foundFn(bind, i) === false) {
                break;
              }
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
            return bind(name, data);
          });

          // bubbling
          if (obj.parent && obj !== obj.parent && obj.parent.event) {
            obj.parent.event.trigger(name, data);
          }
          return obj;
        }
      });
      return obj;
    },

    Renderer : function(obj, options) {
      var safe = {
        canvas     : null,
        context    : null,
        dirty      : true,
        clearColor : "black"
      };

      if (!options.canvas) {
        throw new Error("Renderer requires an options.canvas");
      }

      safe.context = options.canvas.getContext("2d");

      carena.applyProperties(obj, {
        get context() {  return safe.context; },
        get canvas() { return options.canvas; },
        get dirty() { return safe.dirty || false; },
        get clearColor() {
          // TODO: emit event
          return safe.clearColor;
        },
        set clearColor(value) {
          safe.clearColor = value;
          safe.dirty = true;
        },
        renderTree : function(node) {
          if (!node) { return false; }

          return node.walk(function(node, callback) {
            var l=node.children.length, i=0;
            for (i; i<l; i++) {
              callback(node.child(i));
            }
          }, function(node, walker) {

            if (node.render) {
              node.render(obj);
            } else {
              safe.context.fillStyle = node.color || "white";
              safe.context.fillRect(node.x, node.y, node.width, node.height);
            }
            /*
            TODO: optimize me.
            currently, dirty propagates up the tree, but in reality it needs
            to go down the tree as well for this to be "optimized".  Adding
            to this problem, we have a trigger on every dirty so things get
            unweildly.

            if (node.dirty) {
              if (node.render) {
                node.render();
              }
            } else {
              return false; // don't continue down this branch
            }*/
          });
        },

        render : function(node) {
          // TODO: this probably should be made more portable
          if (obj.dirty || true) {
            obj.context.fillStyle = safe.clearColor;
            obj.context.fillRect(0, 0, obj.canvas.width, obj.canvas.height);
            safe.dirty = false;
          }
          obj.renderTree(node);
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
        // TODO: odd way of caching.. might want to reconsider this
        oldMouseMoveTarget : null,
        mouseDownTarget : null
      };

      if (!options.renderer) {
        throw new Error("Creating a canvas requires an options.renderer");
      }

      if (!obj.event) {
        carena.feature.Eventable(obj,options);
      }

      if (!obj.myId) {
        carena.feature.Node(obj, options);
      }

      // TODO: this might not always be on a document *winky wink*
      function mouseMove(ev) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        var canvas = options.renderer.canvas, targets, i = 0, l;
        safe.mouse.x = ev.clientX - (canvas.offsetLeft - window.pageXOffset);
        safe.mouse.y = ev.clientY - (canvas.offsetTop  - window.pageYOffset);
        targets = (safe.target) ?
                   safe.target.nodesByPoint(safe.mouse.x, safe.mouse.y) :
                   [];

        // Add menu elements to the mix :)
        var cameraTargets = obj.nodesByPoint(safe.mouse.x, safe.mouse.y);
        Array.prototype.push.apply(targets, cameraTargets || []);
        l = targets.length;
        safe.targets = targets;
        if (l > 0) {
          for (i; i<l; i++) {
            target = targets[i];
            if (target.event &&
                target.nodesByPoint(safe.mouse.x, safe.mouse.y).length === 1)
            {
              if (safe.oldMouseMoveTarget &&
                  safe.oldMouseMoveTarget !== target)
              {
                safe.oldMouseMoveTarget.event.trigger("mouse.out", {
                  target: target,
                  collisions : safe.targets,
                  mouse: safe.mouse
                });
                safe.oldMouseMoveTarget = null;
              }

              if (!safe.oldMouseMoveTarget) {
                safe.oldMouseMoveTarget = target;
                target.event.trigger("mouse.in", {
                  target: safe.oldMouseMoveTarget,
                  collisions : safe.targets,
                  mouse: safe.mouse
                });
              }

              safe.mouseDownTarget = target;
              break;
            }
          }
        } else if (safe.oldMouseMoveTarget) {
          safe.oldMouseMoveTarget.event.trigger("mouse.out", {
            target: safe.oldMouseMoveTarget,
            collisions : safe.targets,
            mouse: safe.mouse
          });
          safe.oldMouseMoveTarget = null;
        }

        if (safe.mouseDownTarget && safe.mouseDownTarget.event) {
          safe.mouseDownTarget.event.trigger("mouse.move", {
            target: safe.mouseDownTarget,
            collisions : safe.targets,
            mouse: safe.mouse
          });
        }
      };
      document.addEventListener("mousemove", mouseMove);
      document.addEventListener("touchmove", function(ev) {
        mouseMove(ev);
        ev.preventDefault();
      });

      // TODO: this might not always be on a dom document *winky wink*
      function mouseDown(ev) {
        safe.mouseDownTarget = safe.oldMouseMoveTarget;
        var node = safe.mouseDownTarget;
        while (node) {
          if (node.parent) {
            node.parent._remove(node);
            node.parent._add(node);
          }
          node = node.parent;
        }
        if (safe.mouseDownTarget) {
          safe.mouseDownTarget.event.trigger("mouse.down", {
            target: safe.mouseDownTarget,
            mouse: safe.mouse,
            collisions : safe.targets
          });
        }
      }
      document.addEventListener("mousedown",mouseDown);
      document.addEventListener("touchstart", function(ev) {
        mouseDown(ev);
        ev.preventDefault();
      });

      function mouseUp(ev) {
        if (safe.mouseDownTarget) {
          safe.mouseDownTarget.event.trigger("mouse.up", {
            target: safe.mouseDownTarget,
            collisions : safe.targets,
            mouse: safe.mouse
          });
        }
        safe.mouseDownTarget = null;
      }

      document.addEventListener("mouseup", mouseUp)
      document.addEventListener("touchend", function(ev) {
        mouseUp(ev);
        ev.preventDefault();
      });

      return carena.applyProperties(obj, {
        get target() { return safe.target; },
        set target(value) {
          if (safe.target && safe.target.event) {
            safe.target.event.unbind("*", obj.eventProxy);
          }
          safe.target = value;
          if (safe.target && safe.target.event) {
            safe.target.event.bind("*", obj.eventProxy);
          }
        },
        eventProxy : function() {
          obj.event.trigger.apply(obj, arguments);
        },
        render : function() {
          options.renderer.render(safe.target);
          if (obj.children.length > 0) {
            // Don't call renderTree on the camera as it has a render method
            // and it will recurse
            for (var i=0; i<obj.children.length; i++) {
              options.renderer.renderTree(obj.children[i]);
            }
          }
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
      };

      if (!obj.event) {
        carena.feature.Eventable(obj, options);
      }
      obj.event.bind("mouse.down", function(name, data) {
        if (data.target === obj) {
          safe.node = obj.dragstart(data.target, data.mouse);
          data.source = safe.node;
          safe.node.event.trigger("drag.start", data);
          return false;
        }
      });

      // Mouse movement is tricky.  On one hand, you don't want to continue
      // sending mouse.move to a node after you have mouse.out'd. On the
      // other hand, dragging items around can be slow, and may experience
      // a few mouse.out events.
      //
      // LESSON: do not release a drag until the user releases the mouse
      obj.event.bind("mouse.move", function(name, data) {
        if (safe.node) {
          safe.node.dragging(safe.node, data.mouse);
          data.source = safe.node;
          safe.node.event.trigger("drag.move", data);
          return false;
        }
      });
      obj.event.bind("mouse.up", function(name, data) {
        if (safe.node) {
          data.source = safe.node;
          obj.event.trigger("drag.end", data);
          obj.dragend(safe.node, data.mouse);
          return false;
        }
      });

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
    },

    DropTarget : function(obj, options) {
      if (!obj.event) {
        carena.feature.Eventable(obj, options);
      }

      obj.event.bind("drop.start", function(name, data) {
        obj.dropstart(data.target, data.mouse);
      });

      obj.event.bind("drop.move", function(name, data) {
        obj.dropping(data.target, data.mouse);
      });

      obj.event.bind("drop.end", function(name, data) {
        obj.dropend(data.target, data.mouse);
        return false;
      });

      return carena.applyProperties(obj, {
        dropFilter: function(node, mouse) {
          return true;
        },
        dropstart : function(node, mouse) {
        },
        dropping  : function(node, mouse) {
        },
        dropend   : function(node, mouse) {
          node.parent.remove(node);
          obj.add(node);
        }
      });
    },

    DropManager : function(obj, options) {
       if (!obj.event) {
          carena.feature.Eventable(obj, options);
       }
       // TODO: build this out, need a drop.start, drop.move
       obj.event.bind("drag.end", function(name, data) {
         var mouse = data.mouse,
             dropTargets = obj.target.nodesByPoint(mouse.x, mouse.y),
             i = 0,
             l = dropTargets.length,
             dropTarget;

         for (i; i<l; i++) {
           dropTarget = dropTargets[i];
           if (dropTargets[i] !== data.target &&
               dropTarget.dropFilter          &&
               dropTarget.dropFilter(data.target, mouse))
           {
             dropTargets[i].event.trigger("drop.end", data);
             break;
           }
         }
       });

       return carena.applyProperties(obj, {});
    },
    RelativeToParent : function(obj, options) {
      if (!obj.event) {
        carena.feature.Eventable(obj, options);
      }

       // Bind to this node
       obj.event.bind("node.parent", function(name, data) {
        if (data.node === obj) {
          if (data.current && data.current.event) {
            data.current.event.unbind("node.x", obj.posChange);
            data.current.event.unbind("node.y", obj.posChange);
          }

          if (data.next && data.next.event) {
            data.next.event.bind("node.x", obj.posChange);
            data.next.event.bind("node.y", obj.posChange);
          }
          return false;
        }
       });

       carena.applyProperties(obj, {
         posChange : function(name, data) {
           if (data.node === obj.parent) {
            switch (name) {
              case "node.x":
                obj.x += (data.value - data.oldValue);
              break;

              case "node.y":
                obj.y += (data.value - data.oldValue);
              break;
            }
          }
        }
      });
      return obj;
    }
  };
  exports.carena = carena;
})((typeof exports === "undefined") ? window : exports);
