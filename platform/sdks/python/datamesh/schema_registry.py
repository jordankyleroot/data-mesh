"""Thin client around Confluent Schema Registry REST API."""

import json
from typing import Optional
import requests


class SchemaRegistryClient:
    def __init__(self, url: str, *, api_key: Optional[str] = None, api_secret: Optional[str] = None):
        self._url = url.rstrip("/")
        self._auth = (api_key, api_secret) if api_key else None
        self._session = requests.Session()
        if self._auth:
            self._session.auth = self._auth

    def register(self, subject: str, schema: dict, compatibility: str = "FULL_TRANSITIVE") -> int:
        self._session.put(
            f"{self._url}/config/{subject}",
            json={"compatibility": compatibility},
            timeout=5,
        ).raise_for_status()

        r = self._session.post(
            f"{self._url}/subjects/{subject}/versions",
            json={"schema": json.dumps(schema), "schemaType": "AVRO"},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
            timeout=5,
        )
        r.raise_for_status()
        return r.json()["id"]

    def check_compatibility(self, subject: str, schema: dict) -> bool:
        r = self._session.post(
            f"{self._url}/compatibility/subjects/{subject}/versions/latest",
            json={"schema": json.dumps(schema), "schemaType": "AVRO"},
            headers={"Content-Type": "application/vnd.schemaregistry.v1+json"},
            timeout=5,
        )
        if r.status_code == 404:
            return True
        r.raise_for_status()
        return r.json().get("is_compatible", False)

    def get_latest(self, subject: str) -> dict:
        r = self._session.get(f"{self._url}/subjects/{subject}/versions/latest", timeout=5)
        r.raise_for_status()
        data = r.json()
        return json.loads(data["schema"])

    def list_subjects(self) -> list[str]:
        r = self._session.get(f"{self._url}/subjects", timeout=5)
        r.raise_for_status()
        return r.json()
