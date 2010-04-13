var sys    = require("sys");
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
        sys.puts(e.stack);
        fail++;
      }
    } else {
      pass++;
    }
}

// sanity
var obj = new carena.node()
ok(0 === obj.x, "carena.node did not init properly" );
ok(0 === obj.id, "carena nodes are id'd")
// dirty for x,y,height,width

ok(false === obj.dirty, "carena.node should not be dirty by default");

var dirties = ['x', 'y', 'z', 'height', 'width'];
for (var i=0; i<dirties.length; i++)
{
  obj.clean();
  ok(false === obj.dirty, "clean had no effect!");
  obj[dirties[i]] = 5;
  ok(dirties[i] !== 5, "value needs to be set");
  ok(true === obj.dirty, "when setting " + dirties[i] + " the node should be dirty");
}

// tree tests
var child = new carena.node();
ok(1 === child.id, "carena nodes are id'd")
obj.add(child);
ok(true === obj.dirty, "adding a new node should make the parent dirty");
ok(obj === child.parent, "new children get linked to the new parent");
ok(1 === obj.children.length, "adding a node should update the children array");
obj.clean();

var grandchild = new carena.node();
child.add(grandchild);
obj.clean();
child.clean();
grandchild.clean();

// test tiering dirtyness!
grandchild.x = 50;
ok(true === obj.dirty, "dirtyness should tier up the tree to the trunk");

obj.remove(child);
ok(true === obj.dirty, "removing a node should make the parent dirty");
ok(0 === obj.children.length, "remove should update the length");


// Bounding boxen (no rotation)
var bounding  = new carena.node(), 
    child1 = new carena.node(), 
    child2 = new carena.node();
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

// Node picking
ok(bounding.getNodeAtPoint(-10,-10) === null, "blatently wrong");
ok(bounding.getNodeAtPoint(-1,-1) === child1, "child1 lives on -1,-1");
ok(bounding.getNodeAtPoint(0,4) === child1, "child1 contains on 0,4");
ok(bounding.getNodeAtPoint(6,1) === child2, "child2 lives on 6,1");
ok(bounding.getNodeAtPoint(6,6) === child2, "child2 contains on 6,6");
ok(bounding.getNodeAtPoint(7,0) === bounding, "scene contains 0,7");

sys.puts(JSON.stringify({
 total: pass+fail,
 fail: fail,
 pass: pass
}));
