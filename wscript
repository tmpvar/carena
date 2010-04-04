import Options
import os

VERSION = '0.0.1'

def test(ctx):
  out = os.popen('node test/node.js').read();
  fp = open("test/status.json", "w+");
  fp.write(out);
  fp.close();
  
