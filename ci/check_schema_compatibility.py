#!/usr/bin/env python3
"""
CI helper: check every .avsc file against the staging Schema Registry.
Exits non-zero if any schema is incompatible or invalid.

Usage:
  python ci/check_schema_compatibility.py \\
    --registry-url http://localhost:8081 \\
    --schemas-dir samples/schemas
"""

import argparse
import json
import sys
from pathlib import Path

import requests


def check(registry_url: str, schemas_dir: str) -> bool:
    schemas_path = Path(schemas_dir)
    passed = True

    for schema_file in sorted(schemas_path.glob("*.avsc")):
        schema = json.loads(schema_file.read_text())
        ns     = schema.get("namespace", "com.datamesh.unknown")
        domain = ns.split(".")[-1]
        event  = schema_file.stem.replace("_v1", "").replace("_", "-")
        subject = f"{domain}.{event}-value"

        url = f"{registry_url}/compatibility/subjects/{subject}/versions/latest"
        body = {"schema": json.dumps(schema), "schemaType": "AVRO"}
        headers = {"Content-Type": "application/vnd.schemaregistry.v1+json"}

        try:
            r = requests.post(url, json=body, headers=headers, timeout=10)
            if r.status_code == 404:
                print(f"  [NEW]  {subject} — no existing version, will be registered fresh")
                continue
            r.raise_for_status()
            result = r.json()
            if result.get("is_compatible"):
                print(f"  [OK]   {subject}")
            else:
                print(f"  [FAIL] {subject} — INCOMPATIBLE: {result}", file=sys.stderr)
                passed = False
        except requests.RequestException as e:
            print(f"  [ERR]  {subject} — request failed: {e}", file=sys.stderr)
            passed = False

    return passed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry-url", default="http://localhost:8081")
    parser.add_argument("--schemas-dir", default="samples/schemas")
    args = parser.parse_args()

    print(f"Checking schema compatibility against {args.registry_url}")
    if not check(args.registry_url, args.schemas_dir):
        sys.exit(1)
    print("\nAll schemas are compatible.")


if __name__ == "__main__":
    main()
