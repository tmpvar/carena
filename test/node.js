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
ok(0 === (new carena.node()).x, "carena.node did not init properly" );

// dirty for x,y,height,width
var obj = new carena.node()
ok(false === obj.dirty, "carena.node should not be dirty by default");

var dirties = ['x', 'y', 'height', 'width'];
for (var i=0; i<dirties.length; i++)
{
  obj.clean();
  ok(false === obj.dirty, "clean had no effect!");
  obj[dirties[i]] = 5;
  ok(true === obj.dirty, "when setting " + dirties[i] + " the node should be dirty");
}

// tree tests
obj.addChild(new carena.node());



sys.puts(JSON.stringify({
 total: pass+fail,
 fail: fail,
 pass: pass
}));

