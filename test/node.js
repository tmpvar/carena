var carena = require("../lib/carena").carena;

var tests = [], pass = 0, fail = 0;
var ok = function(logic, failmsg)
{
    var test = {
      pass: logic,
      msg : failmsg,
    }

    tests.push(test);

    if (!logic) {
      try {
        throw new Error(failmsg);
      } catch (e) {
        console.log(e.stack);
        fail++;
      }
    } else {
      pass++;
    }
}


// Carena Object Construction
var nodeFactory = carena.design({}, ["carena.Node"]);
var aNode = nodeFactory();
ok(aNode.bounds, "Built objects should contain all of the features designated by the 'design' call");

carena.addFeature("test.feature", function(obj) { obj.set = true });
var anExtendedNode = nodeFactory({}, ["test.feature"]);

ok(anExtendedNode.set === true, "Built factories should respect new features");
ok(anExtendedNode.x === 0, "Built factories should still respect old features");

// ID caching
var idroot  = nodeFactory({myId:"root"}, ["carena.Node"]),
    idchild = nodeFactory({myId:"child"}, ["carena.Node"]);

ok(idroot.find("#child") === null, "isolated nodes have no id cache");
idroot.add(idchild);
ok(idroot.find("#child") === idchild, "child should be found");
idroot.remove(idchild);
ok(idroot.find("#child") === null, "isolated nodes have no id cache");




// Node Mutation Events
var events        = ['x', 'y', 'z', 'height', 'width'],
    mutationTest  = carena.build({}, ["carena.Node", "carena.Eventable"]),
    mutationCount = 0;

mutationTest.event.bind("node.*", function(name, data) {
  mutationCount++;
});

mutationTest.event.bind("node.dirty", function(name) {
  mutationCount--;
});

for (var i=0; i<events.length; i++) {
  mutationTest[events[i]] = 100;
}

// Detect duplicate bound events
var doubleBound = carena.build({}, ["carena.Eventable"]),
    dbFnCount = 0,
    dbFn = function() { dbFnCount++; };
doubleBound.event.bind("test", dbFn);
doubleBound.event.bind("test", dbFn);

doubleBound.event.trigger("test");
ok(dbFnCount === 1, "Double binds are not allowed");


// x2 because each operation marks the nodes dirty which emits another event
ok(mutationCount === events.length, "Changing " + JSON.stringify(events) + " should result in mutation events");

// Node Dirtyness
var dirties = ['x', 'y', 'z', 'height', 'width'], dirtyTest = nodeFactory({});
for (var i=0; i<dirties.length; i++)
{
  dirtyTest.clean();
  ok(false === dirtyTest.dirty, "clean had no effect!");
  dirtyTest[dirties[i]] = 5;
  ok(dirties[i] !== 5, "value needs to be set");
  ok(true === dirtyTest.dirty, "when setting " + dirties[i] + " the node should be dirty");
}

// Node Tree
var parent = nodeFactory(), child = nodeFactory();
parent.add(child);
ok(true === parent.dirty, "adding a new node should make the parent dirty");
ok(parent === child.parent, "new children get linked to the new parent");
ok(1 === parent.children.length, "parent.add() updates the children array");
parent.remove(child);
ok(0 === parent.children.length, "remove should update the length");


// Node Tree Traversal
var traversal1  = nodeFactory(),
    traversal2  = nodeFactory(),
    traversal2a = nodeFactory(),
    traversal3  = nodeFactory();

traversal1.add(traversal2.add(traversal2a)).add(traversal3);

// test tiering dirtyness!
traversal2a.x = 50;
ok(true === traversal1.dirty, "dirtyness should tier up the tree to the trunk");

traversal1.remove(traversal3);
ok(true === traversal1.dirty, "removing a node should make the parent dirty");
traversal1.add(traversal3);

var descendNodes = []
var allResult = traversal1.descend(function(node) {
  descendNodes.push(node);
});
ok(descendNodes.length === 4, "walked " + descendNodes.length + " of 4 nodes");

// Node Event Feature
var eventNodeFactory = carena.design({}, ["carena.Node", "carena.Eventable"]);
var topNode = eventNodeFactory(),
    midNode = eventNodeFactory(),
    botNode = eventNodeFactory();

topNode.add(midNode.add(botNode));

var eventCount = 0;
topNode.event.bind("*", function(ev, obj) {
  eventCount++;
});
midNode.event.bind("test.*", function(ev, obj) {
  eventCount++;
});
midNode.event.bind("test.event", function(ev, obj) {
  eventCount++;
});

botNode.event.trigger("test.event");
ok(eventCount === 3, "when an event is triggered it bubbles up the tree");

eventCount = 0
var absoluteEventTest = eventNodeFactory();
absoluteEventTest.event.bind("test.event", function() {
  eventCount++;
})
absoluteEventTest.event.trigger("test.event.further");
ok(eventCount === 0, "absolute events are matched exactly");

eventCount = 0;
midNode.event.unbind("test.*");
botNode.event.trigger("test.event");
ok(eventCount === 1, "unbind by namespace and wildcard");

eventCount = 0;
var argumentTest = eventNodeFactory();
argumentTest.event.bind("argument.test", function(name, data) {
  if (name === "argument.test") {
    eventCount++;
  }
});

argumentTest.event.trigger("argument.test");
ok(eventCount === 1, "the name of the event should be passed into the event handler");

// Bounding boxen (no rotation)
var bounding    = nodeFactory(),
    child1      = nodeFactory(),
    child2      = nodeFactory(),
    child1child = nodeFactory();

bounding.add(child1);
bounding.add(child2);

bounding.x=0;
bounding.y=0;
bounding.width=10;
bounding.height=10;

child1.x=-1;
child1.y=-1;
child1.width=5;
child1.height=5;

child2.x=6;
child2.y=1;
child2.width=10;
child2.height=10;

// Bounding box check
ok(bounding.bounds, "bounds should calculate on the first call/when dirty");
ok(bounding.bounds.x      === -1, "bounding rect x is invalid");

ok(bounding.bounds.y      === -1, "bounding rect y is invalid");
ok(bounding.bounds.width  === 16, "bounding rect width is invalid");
ok(bounding.bounds.height === 11, "bounding rect height is invalid");
ok(bounding.dirty === false, "scene should be clean after a bounds calculation");

ok(child2.bounds.x      === 6, "child2 rect x is invalid");
ok(child2.bounds.y      === 1, "child2 rect y is invalid");
ok(child2.bounds.width  === 10, "child2 rect width is invalid");
ok(child2.bounds.height === 10, "child2 rect height is invalid");

// Point intersection
ok(bounding.containsPoint(-1,-1) === false, "scene starts at 0,0");
ok(bounding.containsPoint(5,5) === true, "5,5 is the center of the scene");
ok(bounding.containsPoint(10,10) === true, "10,10 is the bottom right of scene");
ok(child1.containsPoint(3,3) === true, "3,3 is contained in child1");
ok(child1.containsPoint(3,3) === true, "3,3 is contained in child1");
ok(child2.containsPoint(8,10) === true, "8,10 is contained in child2");
ok(child2.containsPoint(-1,-1) === false, "-1,-1 is not contained in child2");

// Grandparent relative
var RelativeNode = carena.design({}, [
  "carena.Node",
  "carena.Eventable",
  "carena.RelativeToParent"
]);
var a = RelativeNode({x:0,y:0}),
    b = RelativeNode({x:0,y:0}),
    c = RelativeNode({x:0,y:0}),
    d = RelativeNode({x:0,y:0});

a.add(b.add(c).add(d));

a.x = 100;
ok(a.x === d.x && a.x === 100, "a.x is 100, so is d.x");

a.x = 50;
ok(a.x === 50 && d.x === 50, "a.x and d.x equal 50");

a.y = 123;

ok(d.x === 50, "Relative to parent nodes should move when parents move");
ok(d.y === 123, "Relative to parent nodes should move when parents move");

d.x = 10;
ok(d.x === 10, "Setting a child's x should still work");
b.x = 500;
ok(d.x === 460, "(500-50) + 10 == d.x, aka 460 not " + d.x);

// carena.feature.Box
// Basic css3 box model
var box = carena.build({}, ['carena.Box']);

// Box requires carena.feature.Style
box.width  = 100;
box.height = 50;
box.style.paddingLeft = 10;
box.style.paddingRight = 10;

ok(box.style.innerWidth === 80, "left/right padding contracts the innerWidth");
ok(box.width = 100, "padding does not enlarge the width");
ok(box.height === 50, "left/right padding does not affect the height");

box.style.paddingTop = 30;
box.style.paddingBottom = 10;
ok(box.style.innerHeight === 10, "top/bottom padding contracts the innerHeight");
ok(box.height === 50, "top/bottom padding should not affect the height");

box.width = 200;
box.height = 40;
ok(box.style.innerWidth === 180, "innerWidth changes when the width changes");
ok(box.style.innerHeight === 0, "innerHeight changes when height changes");

// Background color
var colorBox = carena.build({style:{backgroundColor:"green"}},["carena.Box"]);
ok(colorBox.style.backgroundColor === "green", "styles should be setup after creation");

console.log(JSON.stringify({
 total: pass+fail,
 fail: fail,
 pass: pass
}));
