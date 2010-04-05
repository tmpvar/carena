var carena = require("../lib/carena");
var sys    = require("sys");


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
ok(obj === child.parent, "adding a child node should automatically create a link to the parent")
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



sys.puts(JSON.stringify({
 total: pass+fail,
 fail: fail,
 pass: pass
}));
