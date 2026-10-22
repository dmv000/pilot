# Reference solution for B-3. Never shown to the agent.
import argparse
import csv
import json
import math
import re
import sys

TYPES = {"string", "integer", "number", "boolean"}
BOOLS = {"true": True, "yes": True, "1": True, "false": False, "no": False, "0": False}


def usage_error(msg):
    print(f"error: {msg}", file=sys.stderr)
    sys.exit(1)


def load_schema(path):
    try:
        with open(path, encoding="utf-8") as f:
            schema = json.load(f)
    except FileNotFoundError:
        usage_error(f"schema file not found: {path}")
    except json.JSONDecodeError as e:
        usage_error(f"invalid schema JSON: {e.msg}")
    cols = schema.get("columns") if isinstance(schema, dict) else None
    if not isinstance(cols, dict) or not cols:
        usage_error("schema must have a non-empty 'columns' object")
    for name, rule in cols.items():
        if not isinstance(rule, dict) or rule.get("type") not in TYPES:
            usage_error(f"column {name}: unknown type {rule.get('type') if isinstance(rule, dict) else rule}")
    return cols


def convert(value, rule):
    t = rule["type"]
    if t == "integer":
        if not re.fullmatch(r"[+-]?\d+", value):
            raise ValueError(f"not an integer: {value!r}")
        v = int(value)
    elif t == "number":
        try:
            v = float(value)
        except ValueError:
            raise ValueError(f"not a number: {value!r}")
        if math.isnan(v) or math.isinf(v):
            raise ValueError(f"not a finite number: {value!r}")
    elif t == "boolean":
        if value.lower() not in BOOLS:
            raise ValueError(f"not a boolean: {value!r}")
        return BOOLS[value.lower()]
    else:
        if "pattern" in rule and not re.fullmatch(rule["pattern"], value):
            raise ValueError(f"does not match pattern: {value!r}")
        return value
    if "min" in rule and v < rule["min"]:
        raise ValueError(f"below minimum {rule['min']}: {value}")
    if "max" in rule and v > rule["max"]:
        raise ValueError(f"above maximum {rule['max']}: {value}")
    return v


def main():
    ap = argparse.ArgumentParser(prog="csv2json")
    ap.add_argument("input")
    ap.add_argument("--schema", required=True)
    ap.add_argument("-o", "--output")
    args = ap.parse_args()
    cols = load_schema(args.schema)
    try:
        f = open(args.input, encoding="utf-8-sig", newline="")
    except FileNotFoundError:
        usage_error(f"input file not found: {args.input}")
    with f:
        reader = csv.reader(f)
        try:
            header = [h.strip() for h in next(reader)]
        except StopIteration:
            usage_error("empty file: header row required")
        for name in header:
            if name not in cols:
                usage_error(f"unknown column {name}")
        for name in cols:
            if name not in header:
                usage_error(f"missing column {name}")
        rows, errors = [], []
        start = reader.line_num + 1
        for record in reader:
            line = start
            start = reader.line_num + 1
            if not any(c.strip() for c in record):
                continue
            values = dict(zip(header, (c.strip() for c in record)))
            row = {}
            for name, rule in cols.items():
                raw = values.get(name, "")
                if raw == "":
                    if rule.get("required"):
                        errors.append(f"line {line}: {name}: required value is empty")
                    row[name] = None
                    continue
                try:
                    row[name] = convert(raw, rule)
                except ValueError as e:
                    errors.append(f"line {line}: {name}: {e}")
            rows.append(row)
    if errors:
        print("\n".join(errors), file=sys.stderr)
        sys.exit(2)
    text = json.dumps(rows, ensure_ascii=False, indent=2)
    if args.output:
        with open(args.output, "w", encoding="utf-8") as out:
            out.write(text + "\n")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        print(text)


main()
