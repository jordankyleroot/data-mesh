"""
Register the orders schemas with the Schema Registry before first publish.

Usage:
  python register_schema.py --registry-url http://localhost:8081
"""

import argparse
import json
from pathlib import Path

from datamesh import SchemaRegistryClient

SCHEMAS_DIR = Path(__file__).parent.parent.parent / "schemas"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--registry-url", default="http://localhost:8081")
    args = parser.parse_args()

    client = SchemaRegistryClient(args.registry_url)

    for schema_file in SCHEMAS_DIR.glob("*.avsc"):
        schema = json.loads(schema_file.read_text())
        domain = schema["namespace"].split(".")[-1]
        event  = schema_file.stem.replace("_v1", "").replace("_", "-")
        subject = f"{domain}.{event}-value"

        schema_id = client.register(subject, schema, compatibility="FULL_TRANSITIVE")
        print(f"Registered {subject} -> schema_id={schema_id}")


if __name__ == "__main__":
    main()
