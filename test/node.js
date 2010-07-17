var sys    = require("sys"),
    carena = require("../lib/carena").carena;

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
        sys.puts(e.stack);
        fail++;
      }
    } else {
      pass++;
    }
}

// Base feature testing
ok(carena.feature.Node({}).x === 0, "Nodes should provide an x coord");

// Carena Object Construction
var nodeFactory = carena.Design({}, [carena.feature.Node]);
var aNode = nodeFactory();
ok(aNode.bounds, "Built objects should contain all of the features designated by the 'Design' call");

var anExtendedNode = nodeFactory({}, [function(obj) { obj.set = true }]);
ok(anExtendedNode.set === true, "Built factories should respect new features");
ok(anExtendedNode.x === 0, "Built factories should still respect old features");

// Node Mutation Events

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
    traversal2  = nodeFactory()
    traversal2a = nodeFactory(),
    traversal3  = nodeFactory()
    ;
traversal1.add(traversal2.add(traversal2a)).add(traversal3);

// test tiering dirtyness!
traversal2a.x = 50;
ok(true === traversal1.dirty, "dirtyness should tier up the tree to the trunk");

traversal1.remove(traversal3);
ok(true === traversal1.dirty, "removing a node should make the parent dirty");
traversal1.add(traversal3);

var allResult = traversal1.descend();
ok(allResult.nodesWalked === 4, "walked " + allResult.nodesWalked + " of 4 nodes");

var falseResult = traversal1.descend(function(node) { 
  if (node === traversal2) {
    return false;
  }
});
ok(falseResult.nodesWalked === 3, "when a walk callback returns false, stop walking that branch");

var cancelledResult = traversal1.descend(function(node, walker) { 
  if (node === traversal2) {
    walker.stop();
  }
});
ok(cancelledResult.nodesWalked === 2, "when a walk is cancelled, stop immediately");


// Node Event Feature
var eventNodeFactory = carena.Design({}, [carena.feature.Node, carena.feature.Eventable]);
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
eventCount = 0;
midNode.event.unbind("test.*");
botNode.event.trigger("test.event");
ok(eventCount === 1, "unbind by namespace and wildcard");



/*
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

ok(child2.bounds.x      === 6, "bounding rect x is invalid");
ok(child2.bounds.y      === 1, "bounding rect y is invalid");
ok(child2.bounds.width  === 10, "bounding rect width is invalid");
ok(child2.bounds.height === 10, "bounding rect height is invalid");

// Point intersection
ok(bounding.containsPoint(-1,-1) === false, "scene starts at 0,0");
ok(bounding.containsPoint(5,5) === true, "5,5 is the center of the scene");
ok(bounding.containsPoint(10,10) === true, "10,10 is the bottom right of scene");
ok(child1.containsPoint(3,3) === true, "3,3 is contained in child1");
ok(child1.containsPoint(3,3) === true, "3,3 is contained in child1");
ok(child2.containsPoint(8,10) === true, "8,10 is contained in child2");
ok(child2.containsPoint(-1,-1) === false, "-1,-1 is not contained in child2");
*/
sys.puts(JSON.stringify({
 total: pass+fail,
 fail: fail,
 pass: pass
}));
