"""Run unittest tests under a directory; exit 0 when there are none. Usage: python3 scripts/run_tests.py <dir> [--exclude <dir>]"""
import os
import sys
import unittest

args = sys.argv[1:]
start = args[0] if args else "tests"
exclude = os.path.abspath(args[2]) if len(args) >= 3 and args[1] == "--exclude" else None
loader = unittest.TestLoader()
suite = unittest.TestSuite()
for root, dirs, files in os.walk(start):
    if exclude and os.path.abspath(root).startswith(exclude):
        continue
    for name in sorted(files):
        if name.startswith("test") and name.endswith(".py"):
            path = os.path.join(root, name)
            spec_dir = os.path.dirname(path)
            sys.path.insert(0, spec_dir)
            suite.addTests(loader.discover(spec_dir, pattern=name, top_level_dir=spec_dir))
            sys.path.pop(0)
if suite.countTestCases() == 0:
    print(f"no tests under {start}")
    sys.exit(0)
result = unittest.TextTestRunner(verbosity=1).run(suite)
sys.exit(0 if result.wasSuccessful() else 1)
