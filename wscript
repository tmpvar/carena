import Options
import os

VERSION = '0.0.1'

def test(ctx):
  print os.popen('node test/node.js').read();

