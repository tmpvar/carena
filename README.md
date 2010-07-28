# Carena

Lightweight javascript scene graph for use with canvas


# Structure

Provides structure of the tree, in an extremely stripped down representation

   var treeDefinition = {
      canvas : { 
        yellow : {
          green : {}
       },
       red : {
         blue : {}
       }
     }
   }

# Behavior

Implemented in javascript using css-like selectors

    var tree = carena.Builder(treeDefinition, [ /* default features */ ]);
    tree.find("canvas.yellow.green").remove();

# Styling

    { 
      "yellow, red" : {
        width: 100,
        height: 10
      }
    }
     