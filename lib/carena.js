(function(exports) {
  var debug = console.log;

  var carena = {
    features : {},
    addFeature : function(name, fn) {
      carena.features[name] = fn;
      return fn;
    },
    require : function(name, args) {
      var obj = args[0];
      obj.features = obj.features || {};

      for (var i=0; i<obj.features.length; i++) {
        if (obj.features[i] === name) { return }
      }

      if (!obj.features[name]) {
        if (typeof carena.features[name] !== 'function') {
          throw new Error("Feature '" + name  + "' is not registered!");
        }
        //obj.features[name] = carena.features[name];
        if (!obj.features) {
          obj.features = [];
        }

        obj.features.unshift(name);
        carena.features[name].apply(obj, args);
      }
    },
    applyProperties : function(obj, props){
      for (var i in props) {
        if (props.hasOwnProperty(i)) {
          if (Object.getOwnPropertyDescriptor) {

            Object.defineProperty(obj,
                                  i,
                                  Object.getOwnPropertyDescriptor(props, i));
          } else if (props.__lookupGetter__) {
            var getter = props.__lookupGetter__(i),
                setter = props.__lookupSetter__(i);

            if (getter) {
              obj.__defineGetter__(i, getter);
            } else {
              obj[i] = props[i];
            }

            if (setter) {
              obj.__defineSetter__(i, setter);
            }
          }
        }
      }
      return obj;
    },
    // build a tree from a raw js object
    erect : function(obj, features, options) {
      if (obj) {
        var k, tmp, node,
            root = carena.build({name: "root"}, features, options),
            process = function(parent, _obj, _features, _options) {
              if (_obj) {
                for (k in _obj) {
                  if (_obj.hasOwnProperty(k)) {
                    var _node = carena.build({name: k}, _features, _options);
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

    // build a reusable factory
    design : function(obj, features, options) {
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
        return carena.build(_obj, tmp, _options);
      };
    },
    _nodeId : 0,
    // build an actual reference
    build  : function(obj, features, options) {
      carena._nodeId+=1;
      obj = obj || {};

      var i        = 0,
          features = features || [],
          len      = features.length,
          nodeStorage = {};

      obj.hasFeature = function(feature) {
        for (var z=0; z < obj.features.length; z++) {
          if (feature === obj.features[z]) {
            return true;
          }
        }
        return false;
      }

      obj.dehydrate = function() {
        return nodeStorage;
      }

      options = options || obj;

      if (features) {
        if (!obj.features) {
          obj.features = [];
        }
        if (typeof features === "function") {
          features(obj, options, nodeStorage)
        } else {
          // Based on the incomming parts array, build out self.
          for (i=0; i<len; i+=1) {
            if (typeof features[i] === "string") {
              var skip = false;
              for (var j=0; j<obj.features.length; j++) {
                if (obj.features[j] === features[i]) { break; }
              }
              if (!skip && carena.features[features[i]]) {
                carena.features[features[i]](obj, options, nodeStorage);
                obj.features.push(features[i]);
              } else {
                throw new Error(features[i] + " is not registered with carena");
              }
            } else {
              throw new Error(features[i] + " is not a function!");
            }
          }
        }
      }
      function S4() {
         return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      }
      function guid() {
         return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
      }

      obj.myId = nodeStorage.myId = options.myId || guid();
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
    },
    createCanvas : function() {
      // TODO: this will not always be a document!
      return document.createElement("canvas");
    }
  };

  // Default available features
  carena.addFeature("carena.Renderable", function(obj, options, storage) {
    carena.require("carena.Eventable", arguments);

    var last = { x: obj.x|| 0, y: obj.y||0, w: 1, h: 1 },
        clearRects = [];

    obj.event.bind("node.y", function(name, data) {
      if (data.node === obj) {
        last.y = data.previous;
      }
    });

    obj.event.bind("node.x", function(name, data) {
      if (data.node === obj) {
        last.x = data.previous;
      }
    });

    return carena.applyProperties(obj, {
      clear : function(renderer) {
        var ctx = renderer.context;
        // use last and calculate what needs to be cleared
        // TODO : implement this without diving into overlap cache hell.
        /*ctx.fillStyle = "black";
        ctx.fillRect(last.x, last.y, last.w+10, last.h+10);*/
      },

      // TODO: Document
      // These are used for pre/post render steps
      preRender : [],
      postRender : [],
      render : function(renderer) {
        var ctx   = renderer.context,
            color = (obj.style && obj.style.backgroundColor) ?
                     obj.style.backgroundColor               :
                     obj.color;
        if (ctx.fillStyle !== color) {
          ctx.fillStyle = color;
        }
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
      }
    });
  });

  carena.addFeature("carena.Node", function(obj, options, storage) {
    carena.require("carena.Renderable", arguments);
    carena.require("carena.Eventable", arguments);
    options        = options    || {};
    storage        = storage    || {};
    storage.x      = obj.x      || 0;
    storage.y      = obj.y      || 0;
    storage.z      = obj.z      || 0;
    storage.width  = obj.width  || 0;
    storage.height = obj.height || 0;

    var safe = {
      bounds   : { x:0, y:0, width:0, height:0, dirty: false },
      children : [],
      parent   : null,
      dirty    : false,
      ids      : {}
    };

    obj.event.bind("node.add", function(name, data) {
      safe.ids[data.child.myId] = data.child;
    });

    obj.event.bind("node.remove", function(name, data) {
      if (safe.ids[data.child.myId]) {
        delete safe.ids[data.child.myId];
      }
    });

    return carena.applyProperties(obj, {
      // Calculate bounds and return an object {x,y,width,height}
      get bounds() {
        if (safe.dirty) {
          safe.bounds.x      = storage.x;
          safe.bounds.y      = storage.y;
          safe.bounds.width  = storage.width;
          safe.bounds.height = storage.height;

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
          c = storage;
        }
        // simply AABB
        if (c.x <= x && c.x+c.width  >= x &&
            c.y <= y && c.y+c.height >= y)
        {
          return true;
        }
        return false;
      },
      get storage() { return storage; },
      get id() { return obj.myId; },
      get x() { return storage.x; },
      set x(value) {
        if (obj.event && typeof obj.event.trigger === "function") {
          obj.event.trigger("node.x", {
            node     : obj,
            previous : storage.x,
            current  : value
          }, false);
        }
        storage.x = value;
        safe.bounds.dirty = true;
        obj.dirty = true;
      },

      get y() { return storage.y; },
      set y(value) {
        if (obj.event && typeof obj.event.trigger === "function") {
          obj.event.trigger("node.y", {
            node     : obj,
            previous : storage.y,
            current  : value
          }, false);
        }
        storage.y = value;
        safe.bounds.dirty = true;
        obj.dirty = true;
      },

      get z() { return storage.z; },
      set z(value) {
        if (obj.event && typeof obj.event.trigger === "function") {
          obj.event.trigger("node.z", {
            node     : obj,
            previous : storage.z,
            current  : value
          }, false);
        }
        storage.z = value;
        safe.bounds.dirty = true;
        obj.dirty = true;
      },

      get height() { return storage.height; },
      set height(value) {
        var oldValue = storage.height;
        storage.height = value;

        if (obj.event) {
           obj.event.trigger("node.height", {
             node     : obj,
             previous : oldValue,
             current  : value
           });
        }
        safe.bounds.dirty = true;
        obj.dirty = true;
      },

      get width() { return storage.width; },
      set width(value) {
        var oldValue = storage.width;
        storage.width = value;

        if (obj.event) {
           obj.event.trigger("node.width", {
             node     : obj,
             previous : oldValue,
             current  : value
           });
        }
        safe.bounds.dirty = true;
        obj.dirty = true;
      },

      get color() {
        return (storage.style && storage.style.color) ?
                storage.style.color : 'white';
      },
      set color(value) {
        if (!storage.style) {
          storage.style = {};
        }
        storage.style.color = value;
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
            previous : oldParent,
            current: value
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
            previous : safe.dirty,
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

      // Simple unshift method, adds nodes to the beginning
     // of the children array
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
        obj.dirty = true;
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
        var i = 0, len = safe.children.length;
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
      ascend  : function(fn) {
        fn(obj);
        if (obj.parent && obj.parent.ascend) {
          obj.parent.ascend(fn);
        }
      },

      // Walks the entire tree depth first and in reverse render order
      descend : function(fn) {
        var l=obj.children.length, i=0, child, res;

        if (typeof fn === "function") {
          fn(obj);
        }

        for (i; i<l; i++) {
          child = obj.children[i];

          // the child needs to be a proper node
          if (child.descend) {
            child.descend(fn);
          }
        }
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
      },
      _findRegex : /(#)(.*)/,
      find : function(str) {

        var matches = str.match(obj._findRegex);
        if (matches.length > 0) {
          if (matches[1] === "#" && safe.ids[matches[2]]) {
            return safe.ids[matches[2]];
          }
        }
        return null;
      }
    });


  });

  // Provides the ability to bind/trigger external events
  carena.addFeature("carena.Eventable", function(obj, options, storage) {
    var safe = {
      binds : {},
      sequence : 0
    };

    var queryBinds = function(name, foundFn) {
      var i=0,  l,  results = [], bindParts,
          nameParts = name.split("."), found, lastBind, lastName, containsWildcard;

      for (var bind in safe.binds) {
        found = true;
        // catch all
        if (bind !== "*") {
          bindParts = bind.split(".");
          containsWildcard = ((name + bind).indexOf("*") > -1);

          if (nameParts !== bindParts               &&
              nameParts.length !== bindParts.length &&
              !containsWildcard)
          {
            found = false;
          } else if (nameParts !== "*" && bindParts !== "*") {
            for (i=0; i<nameParts.length; i++) {
              if (!bindParts[i]) {
                found = false;
                break;
              } else if (bindParts[i] !== nameParts[i] &&
                         lastBind     !== "*"          &&
                         lastName     !== "*"          &&
                         bindParts[i] !== "*"          &&
                         nameParts[i] !== "*")
              {
                found = false;
                break;
              }
              lastBind = bindParts[i];
              lastName = nameParts[i];
            }
          }
        }
        if (found) {
          l = safe.binds[bind].length;
          for (i=l-1; i>=0; i--) {
            if (foundFn(bind, i) === false) {
              return false;
            }
          }
        }
      }
    };

    obj.event = {};
    carena.applyProperties(obj.event, {
      isBound : function(name, fn) {
        for (var i = 0; i<safe.binds[name].length; i++) {
          if (safe.binds[name][i] === fn) {
            return true;
          }
        }
      },
      bind : function (name, fn) {
        if (!safe.binds[name]) {
          safe.binds[name] = [];
        }
        if (!obj.event.isBound(name, fn)) {
          safe.binds[name].push(fn);
        }
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

      trigger : function (name, data, bubble) {
        var i=0,  l,  results = [], bindParts,
            nameParts = name.split("."), found,
            last, res = true,

            res = queryBinds(name, function(resolvedName, index) {
              var bind = safe.binds[resolvedName][index];
              return bind(name, data);
            });

        // bubbling
        if (bubble !== false   &&
            res !== false      &&
            obj.parent         &&
            obj !== obj.parent &&
            obj.parent.event)
        {
          obj.parent.event.trigger(name, data);
          res = obj;
        }
        return res;
      }
    });
    return obj;
  });

  carena.addFeature("carena.Scale", function(obj, options, storage) {
    carena.require("carena.Renderable", arguments);

    var safe = {
      scale  : 1,
      render : obj.render
    };

    return carena.applyProperties(obj, {
      set scale(v) {
        safe.scale = v;
      },
      get scale() {
        return safe.scale;
      },
      render : function(renderer) {
        renderer.context.scale(safe.scale, safe.scale);
        safe.render(renderer);
      }
    });

  });

  carena.addFeature("carena.Renderer", function(obj, options, storage) {
    storage = storage || {};
    storage.style = storage.style || obj.style || options.style || {
      backgroundColor : "black"
   };

    var safe = {
      canvas     : null,
      context    : null,
      dirty      : true // used for first render, for now.
    };

    if (!options.canvas) {
      throw new Error("Renderer requires an options.canvas");
    }

    safe.context = options.canvas.getContext("2d");

    carena.applyProperties(obj, {
      get context() {  return safe.context; },
      set context(value) { safe.context = value },
      get canvas() { return options.canvas; },
      get clearColor() {
        // TODO: emit event
        return storage.style.backgroundColor;
      },
      set clearColor(value) {
        storage.style.backgroundColor = value;
        safe.dirty = true;
      },
      renderTree : function(root, options) {
        if (!root) { return false; }


        var res = root.walk(function(node, callback) {
          // save the transform matrix

          var l=node.children.length, i=0;
          for (i; i<l; i++) {
            callback(node.child(i));
          }

          // restore the transform matrix
        }, function(node, walker) {
          node.clean();
          if (node.clear) {
            node.clear(obj);
          }

          // TODO: Only rendering dirty nodes would be optimal
          if (node.render) {
            node.render(obj);
          } else {
            safe.context.fillStyle = node.color || "white";
            safe.context.fillRect(node.x, node.y, node.width, node.height);
          }
        });
        return res;
      },

      render : function(root, options) {


        // TODO: Optimize me! whether its using ImageData or clearing rects
        //       dirty nodes on the camer and under root need to be cleared.
        if (root.dirty || true) {
          safe.dirty = false;
          obj.context.fillStyle = storage.style.backgroundColor;
          obj.context.fillRect(0, 0, obj.canvas.width, obj.canvas.height);
        }
        obj.renderTree(root, options);
        return obj;
      }
    });

    obj.x = 0;
    obj.y = 0;
    obj.width = options.canvas.width;
    obj.height = options.canvas.height;
    return obj;
  });

  carena.addFeature("carena.Camera", function(obj, options, storage) {
    var safe = {
      target : null,
      mouse  : {x:0, y:0},
      // TODO: odd way of caching.. might want to reconsider this
      oldMouseMoveTarget : null,
      mouseDownTarget : null,
      clickTimeout : options.clickTimeout || 250,
      maxClicks    : options.maxClicks || 2
    };

    if (!options.renderer) {
      throw new Error("Creating a canvas requires an options.renderer");
    }

    carena.require("carena.Node", arguments);
    carena.require("carena.Eventable", arguments);

    // TODO: this might not always be on a document *winky wink*
    function mouseMove(ev) {
      ev.preventDefault();
      var canvas = options.renderer.canvas, targets, i = 0, l;
      safe.mouse.x = ev.clientX - (canvas.offsetLeft - window.pageXOffset);
      safe.mouse.y = ev.clientY - (canvas.offsetTop  - window.pageYOffset);
      var targets = (safe.target) ?
                 safe.target.nodesByPoint(safe.mouse.x, safe.mouse.y) :
                 [], target;

      // Add menu elements to the mix :)
      var cameraTargets = obj.nodesByPoint(safe.mouse.x, safe.mouse.y);
      Array.prototype.unshift.apply(targets, cameraTargets || []);
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
    document.addEventListener("mousemove", mouseMove, true);
    document.addEventListener("touchmove", function(ev) {
      mouseMove(ev);
      ev.preventDefault();
    }, true);

    var scale = 1;
    window.addEventListener("mousewheel", function(ev) {
      var amount = ev.wheelDeltaY/5000;
      if (safe.target && safe.target.scale) {
        console.log("applying scale...");
        safe.target.scale += amount;
      }
    }, true);

    // TODO: this might not always be on a dom document *winky wink*
    var lastMouseUp = null;
    function mouseDown(ev) {
      safe.mouseDownTarget = safe.oldMouseMoveTarget;
      var node = safe.mouseDownTarget,
          eventName = "mouse.down";
      while (node) {
        if (node.parent) {
          node.parent._remove(node);
          node.parent._add(node);
        }
        node = node.parent;
      }

      if (safe.mouseDownTarget) {
        var currentTime = (new Date()).getTime(),
            data = {
              target: safe.mouseDownTarget,
              mouse: safe.mouse,
              collisions : safe.targets,
              times: 0
            };

        safe.mouseDownTarget.event.trigger(eventName, data);
      }
    }
    document.addEventListener("mousedown",mouseDown, true);
    document.addEventListener("touchstart", function(ev) {
      mouseDown(ev);
      ev.preventDefault();
    }, true);

    function mouseUp(ev) {
      var eventName = "mouse.up",
          clickEvent = {
            target: safe.mouseDownTarget,
            collisions : safe.targets,
            mouse: safe.mouse
          };

      if (lastMouseUp) {
        clearTimeout(lastMouseUp);
        lastMouseUp = null;
      }

      if (!safe.mouseDownTarget) {
        return;
      }

      lastMouseUp = setTimeout(function() {
        if (!safe.mouseDownTarget.clickCount ||
            safe.mouseDownTarget.clickCount < 2)
        {
          eventName = "mouse.click";
        } else {
          eventName = "mouse.click." + safe.mouseDownTarget.clickCount;
        }

        safe.mouseDownTarget.clickCount = 0;
        safe.mouseDownTarget.event.trigger(eventName , clickEvent);
      },safe.clickTimeout);

      if (safe.mouseDownTarget) {
        if (!safe.mouseDownTarget.clickCount) {
          safe.mouseDownTarget.clickCount = 1;
        } else {
          safe.mouseDownTarget.clickCount++;
        }

        if (safe.mouseDownTarget.clickCount >= safe.maxClicks) {
          eventName = 'mouse.click';
          eventName += (safe.maxClicks > 1)  ?
                        '.' + safe.maxClicks :
                        '';

          safe.mouseDownTarget.clickCount = 0;
          clearTimeout(lastMouseUp);
          lastMouseUp = null;
          safe.mouseDownTarget.event.trigger(eventName, clickEvent);
        }

        safe.mouseDownTarget.event.trigger('mouse.up', clickEvent);
      }
    }

    document.addEventListener("mouseup", mouseUp, true)
    document.addEventListener("touchend", function(ev) {
      mouseUp(ev);
      ev.preventDefault();
    }, true);

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
        return obj.event.trigger.apply(obj, arguments);
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
  });

  carena.addFeature("carena.DragManager", function(obj, options, storage) {
    carena.require("carena.Eventable", arguments);

    // TODO: multitouch
    var safe = {
      node : null
    }

    obj.event.bind("mouse.down", function(name, data) {
      if (data.target && data.target.dragstart) {
        safe.node = data.target.dragstart(data.target, data.mouse);
        safe.offset = data.mouse.offset || {x:0, y:0};
        data.source = safe.node;
        safe.node.event.trigger("drag.start", data);
        return false;
      }
    });

    obj.event.bind("mouse.move", function(name, data) {
      if (safe.node) {
        data.mouse.offset = safe.offset;
        safe.node.dragging(safe.node, data.mouse);
        data.source = safe.node;
        safe.node.event.trigger("drag.move", data);
      }
    });
    obj.event.bind("mouse.up", function(name, data) {
      if (safe.node) {
        data.source = safe.node;
        safe.node.event.trigger("drag.end", data);
        safe.node.dragend(safe.node, data.mouse);
        safe.node = null;
      }
    });
  });

  carena.addFeature("carena.Draggable", function(obj, options, storage) {
    options = options || {};
    obj.draggingZ = options.draggingZ = options.draggingZ || 1;
    var safe = {
      offset : {x:0, y:0},
      originalZ : 0
    };

    carena.require("carena.Eventable", arguments);

    return carena.applyProperties(obj, {
      dragstart : function (node, mouse) {
        node.originalZ = node.z;
        node.z = node.draggingZ;
        mouse.offset = {
          x : node.x-mouse.x,
          y : node.y-mouse.y
        };
        return node;
      },

      dragging : function (node, mouse) {
        node.x = mouse.x + mouse.offset.x;
        node.y = mouse.y + mouse.offset.y;
      },

      dragend : function (node, mouse) {
        node.z = node.originalZ;
      }
    });
  });

  carena.addFeature("carena.DropTarget", function(obj, options, storage) {
    carena.require("carena.Eventable", arguments);

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
      dropFilter: function(source, mouse) {
        return true;
      },
      dropstart : function(source, mouse) {
      },
      dropping  : function(source, mouse) {
      },
      dropend   : function(source, mouse) {
        node.parent.remove(source);
        obj.add(source);
      }
    });
  });

  carena.addFeature("carena.DropManager", function(obj, options, storage) {
    carena.require("carena.Eventable", arguments);

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
  });

  carena.addFeature("carena.RelativeToParent", function(obj, options, storage) {
    carena.require("carena.Eventable", arguments);

    // Bind to this node
    obj.event.bind("node.parent", function(name, data) {
     if (data.node === obj) {
       if (data.previous && data.previous.event) {
         data.previous.event.unbind("node.x", obj.positionChanged);
         data.previous.event.unbind("node.y", obj.positionChanged);
       }

       if (data.current && data.current.event) {
         data.current.event.bind("node.x", obj.positionChanged);
         data.current.event.bind("node.y", obj.positionChanged);
       }
     }
    });

    return carena.applyProperties(obj, {
      positionChanged : function(name, data) {
        if (data.node === obj.parent) {
          var diff = (data.current - data.previous);
          switch (name) {
            case "node.x":
              obj.x += diff;
            break;
            case "node.y":
              obj.y += diff;
            break;
          }
        }
      }
    });
  });

  // CSS / Box Model
  carena.addFeature("carena.Style", function(obj, options, storage) {
    storage.style = obj.style || storage.style || {};

    carena.require("carena.Node", arguments);
    carena.require("carena.Eventable", arguments);
    var style = obj.style || {};
    obj.style = {};

    function defineEventedProperty(name, defaultValue) {
      var setter = function(value) {
            var oldValue = storage.style[name] || defaultValue;
            storage.style[name] = value;
            obj.event.trigger('style.' + name, {
              node     : obj,
              previous : oldValue,
              current  : value
            });
          },
          getter = function() {
            return storage.style[name] || defaultValue;
          };
      if (Object.defineProperty) {
        Object.defineProperty(obj.style , name, {
          get : getter,
          set : setter
        });
      } else {
        obj.style.__defineGetter__(name, getter);
        obj.style.__defineSetter__(name, setter);
      }
    }

    var properties = [
      // Style Name       ,System Default
      ['paddingRight'     ,0],
      ['paddingLeft'      ,0],
      ['paddingTop'       ,0],
      ['paddingBottom'    ,0],
      ['backgroundColor'  ,'white']
    ], i, l = properties.length;

    for (i=0; i<l; i++) {
      var prop = properties[i];
      defineEventedProperty(prop[0], style[prop[0]] || prop[1]);
    }
    return obj;
  });

  carena.addFeature("carena.Box", function(obj, options, storage) {
    carena.require("carena.Style", arguments);

    // TODO: support other units besides pixels
    storage.style.innerHeight = 0;
    storage.style.innerWidth  = 0;

    carena.applyProperties(obj.style, {
      get innerHeight() {
        return storage.style.innerHeight;
      },
      get innerWidth() {
        return storage.style.innerWidth;
      }
    });

    // Events
    function recalcInnerWidth() {
      var innerWidth = obj.width -
                      (obj.style.paddingLeft + obj.style.paddingRight),
          oldInnerWidth = obj.style.innerWidth || 0;

      if (innerWidth !== obj.style.innerWidth) {
        storage.style.innerWidth = innerWidth;
        obj.event.trigger('style.innerWidth', {
          node     : obj,
          previous : oldInnerWidth,
          current  : innerWidth
        });
      }
    }
    function recalcInnerHeight() {
      var innerHeight = obj.height -
                       (obj.style.paddingTop +
                        obj.style.paddingBottom),
          oldInnerHeight = obj.style.innerHeight || 0;
      if (innerHeight !== obj.style.innerHeight) {
        storage.style.innerHeight = innerHeight;
        obj.event.trigger('style.innerHeight', {
          node     : obj,
          previous : oldInnerHeight,
          current  : innerHeight
        });
      }
    }

    obj.event.bind("node.width", recalcInnerWidth);
    obj.event.bind("style.paddingLeft", recalcInnerWidth);
    obj.event.bind("style.paddingRight", recalcInnerWidth);

    obj.event.bind("node.height", recalcInnerHeight);
    obj.event.bind("style.paddingTop", recalcInnerHeight);
    obj.event.bind("style.paddingBottom", recalcInnerHeight);

    recalcInnerWidth();
    recalcInnerHeight();

    return obj;
  });


  exports.carena = carena;
})((typeof exports === "undefined") ? window : exports);
