var i,l,raw, nodes, node, loc, pw, ph;
onmessage = function(ev) {
  var data = JSON.parse(ev.data);
  nodes = data.nodes;
  l = nodes.length;
  raw = { data: data.pixels.data };
  pw = data.pixels.width;
postMessage(JSON.stringify(data));
return;
  setInterval(function() {
//    for (i=0; i<l; i+=1) {
      node = nodes[0];
      node.x++;
      loc = 0;//(node.x*4) + (pw*node.y*4)
      data.pixels.data[loc] = 255;
      data.pixels.data[loc+1] = 255;
      data.pixels.data[loc+2] = 255;
      data.pixels.data[loc+3] = 255;
  //  }
    postMessage(JSON.stringify(data.pixels.data));
  }, 1000);
}
