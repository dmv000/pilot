# Hidden acceptance tests for B-3. Never shown to the agent.
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

SCHEMA = {"columns": {
    "name": {"type": "string", "required": True},
    "age": {"type": "integer", "min": 0, "max": 150},
    "score": {"type": "number"},
    "active": {"type": "boolean"},
    "email": {"type": "string", "pattern": r"[^@\s]+@[^@\s]+\.[a-z]+"},
}}


def run(csv_text, schema=SCHEMA, out=False, bom=False, raw_schema=None):
    d = tempfile.mkdtemp()
    csv_path = os.path.join(d, "in.csv")
    with open(csv_path, "wb") as f:
        f.write((b"\xef\xbb\xbf" if bom else b"") + csv_text.encode("utf-8"))
    schema_path = os.path.join(d, "schema.json")
    with open(schema_path, "w", encoding="utf-8") as f:
        f.write(raw_schema if raw_schema is not None else json.dumps(schema))
    args = [sys.executable, "-m", "csv2json", csv_path, "--schema", schema_path]
    out_path = os.path.join(d, "out.json")
    if out:
        args += ["-o", out_path]
    p = subprocess.run(args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    return p, out_path


HEADER = "name,age,score,active,email\n"


class Hidden(unittest.TestCase):
    def test_fr001_typed_output_in_schema_order(self):
        p, _ = run("email,active,score,age,name\nann@x.io,yes,9.5,31,Ann\n")
        self.assertEqual(p.returncode, 0, p.stderr)
        rows = json.loads(p.stdout)
        self.assertEqual(rows, [{"name": "Ann", "age": 31, "score": 9.5, "active": True, "email": "ann@x.io"}])
        self.assertEqual(list(rows[0].keys()), ["name", "age", "score", "active", "email"])

    def test_fr001_empty_optional_cells_are_null(self):
        p, _ = run(HEADER + "Bob,,,,\n")
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual(json.loads(p.stdout), [{"name": "Bob", "age": None, "score": None, "active": None, "email": None}])

    def test_fr001_output_file(self):
        p, out_path = run(HEADER + "Cy,5,1,no,cy@x.io\n", out=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        with open(out_path, encoding="utf-8") as f:
            self.assertEqual(json.load(f)[0]["active"], False)

    def test_fr002_boolean_forms(self):
        rows = "".join(f"P{i},,,{v},\n" for i, v in enumerate(["TRUE", "False", "Yes", "NO", "1", "0"]))
        p, _ = run(HEADER + rows)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.assertEqual([r["active"] for r in json.loads(p.stdout)], [True, False, True, False, True, False])

    def test_fr002_integer_and_number_rules(self):
        p, _ = run(HEADER + "A,+7,-1e3,,\n")
        self.assertEqual(p.returncode, 0, p.stderr)
        r = json.loads(p.stdout)[0]
        self.assertEqual((r["age"], r["score"]), (7, -1000.0))

    def test_fr002_bad_values_are_errors(self):
        cases = ["X,1.5,,,", "X,abc,,,", "X,-1,,,", "X,151,,,", "X,,nan,,", "X,,inf,,", "X,,,maybe,", "X,,,,not-an-email"]
        for row in cases:
            with self.subTest(row=row):
                p, _ = run(HEADER + row + "\n")
                self.assertEqual(p.returncode, 2, p.stdout)
                self.assertRegex(p.stderr, r"^line 2: (age|score|active|email): ")

    def test_fr002_pattern_is_full_match(self):
        p, _ = run(HEADER + "X,,,,ann@x.io trailing\n")
        self.assertEqual(p.returncode, 2)

    def test_fr003_all_errors_with_physical_lines_and_no_output(self):
        csv_text = HEADER + 'Ann,30,1,yes,a@b.io\nBen,abc,1,yes,b@b.io\n"Multi\nline",40,1,yes,m@b.io\n,50,1,yes,e@b.io\n'
        p, out_path = run(csv_text, out=True)
        self.assertEqual(p.returncode, 2)
        lines = [l for l in p.stderr.splitlines() if l.strip()]
        self.assertTrue(any(l.startswith("line 3: age:") for l in lines), p.stderr)
        self.assertTrue(any(l.startswith("line 6: name:") for l in lines), p.stderr)
        self.assertEqual(len(lines), 2, p.stderr)
        self.assertFalse(os.path.exists(out_path))
        self.assertEqual(p.stdout.strip(), "")

    def test_fr004_unknown_and_missing_columns(self):
        p, _ = run("name,age,score,active,email,extra\nA,1,1,yes,a@b.io,z\n")
        self.assertEqual(p.returncode, 1)
        self.assertEqual(p.stderr.strip(), "error: unknown column extra")
        p, _ = run("name,age,score,active\nA,1,1,yes\n")
        self.assertEqual(p.returncode, 1)
        self.assertEqual(p.stderr.strip(), "error: missing column email")

    def test_fr004_bad_schema_and_missing_file(self):
        p, _ = run(HEADER, raw_schema="{not json")
        self.assertEqual(p.returncode, 1)
        self.assertTrue(p.stderr.startswith("error: "))
        p, _ = run(HEADER, schema={"columns": {"name": {"type": "date"}}})
        self.assertEqual(p.returncode, 1)
        q = subprocess.run([sys.executable, "-m", "csv2json", "/nonexistent/x.csv", "--schema", "/nonexistent/s.json"], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(q.returncode, 1)
        self.assertTrue(q.stderr.startswith("error: "))

    def test_fr005_bom_quotes_commas_spaces_unicode(self):
        p, _ = run(HEADER + '"Doe, ""Jo""",  42  ,1,yes,jo@x.io\nZoë Ångström,1,2,no,z@x.io\n', bom=True)
        self.assertEqual(p.returncode, 0, p.stderr)
        rows = json.loads(p.stdout)
        self.assertEqual(rows[0]["name"], 'Doe, "Jo"')
        self.assertEqual(rows[0]["age"], 42)
        self.assertEqual(rows[1]["name"], "Zoë Ångström")
        self.assertIn("Zoë", p.stdout)


if __name__ == "__main__":
    unittest.main()
