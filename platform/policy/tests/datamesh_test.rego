package datamesh_test

import data.datamesh
import future.keywords.if

# ─── Schema registration tests ───────────────────────────────────────────────

test_schema_allow_valid_owner if {
    datamesh.schema_allow with input as {
        "action": "register",
        "subject": "orders.order-placed-value",
        "requester": {"domain": "orders", "roles": ["domain-owner"], "permissions": []},
        "schema": {
            "type": "record",
            "name": "OrderPlaced",
            "fields": [
                {"name": "orderId", "type": "string"},
                {"name": "total",   "type": "double"}
            ]
        }
    }
}

test_schema_deny_wrong_domain if {
    not datamesh.schema_allow with input as {
        "action": "register",
        "subject": "orders.order-placed-value",
        "requester": {"domain": "inventory", "roles": ["domain-owner"], "permissions": []},
        "schema": {
            "type": "record",
            "name": "OrderPlaced",
            "fields": [{"name": "orderId", "type": "string"}]
        }
    }
}

test_schema_deny_unmasked_pii if {
    not datamesh.schema_allow with input as {
        "action": "register",
        "subject": "users.profile-updated-value",
        "requester": {"domain": "users", "roles": ["domain-owner"], "permissions": []},
        "schema": {
            "type": "record",
            "name": "ProfileUpdated",
            "fields": [
                {"name": "userId", "type": "string"},
                {"name": "email",  "type": "string"}
            ]
        }
    }
}

test_schema_allow_masked_pii if {
    datamesh.schema_allow with input as {
        "action": "register",
        "subject": "users.profile-updated-value",
        "requester": {"domain": "users", "roles": ["domain-owner"], "permissions": []},
        "schema": {
            "type": "record",
            "name": "ProfileUpdated",
            "fields": [
                {"name": "userId", "type": "string"},
                {"name": "email",  "type": "string", "masked": true}
            ]
        }
    }
}

test_schema_admin_bypass_domain if {
    datamesh.schema_allow with input as {
        "action": "register",
        "subject": "orders.order-placed-value",
        "requester": {"domain": "platform", "roles": ["platform-admin"], "permissions": []},
        "schema": {
            "type": "record",
            "name": "OrderPlaced",
            "fields": [{"name": "orderId", "type": "string"}]
        }
    }
}

# ─── Topic access tests ────────────────────────────────────────────────────

test_topic_allow_producer_own_domain if {
    datamesh.topic_allow with input as {
        "action": "produce",
        "topic": "orders.order-placed.critical",
        "requester": {"domain": "orders", "roles": ["domain-owner"], "permissions": []}
    }
}

test_topic_deny_producer_wrong_domain if {
    not datamesh.topic_allow with input as {
        "action": "produce",
        "topic": "orders.order-placed.critical",
        "requester": {"domain": "inventory", "roles": ["domain-owner"], "permissions": []}
    }
}

test_topic_allow_consumer_with_permission if {
    datamesh.topic_allow with input as {
        "action": "consume",
        "topic": "orders.order-placed.critical",
        "requester": {
            "domain": "inventory",
            "roles": [],
            "permissions": [{
                "resource": "orders.order-placed.critical",
                "access_level": "read",
                "expires_at": null
            }]
        }
    }
}

test_topic_deny_consumer_no_permission if {
    not datamesh.topic_allow with input as {
        "action": "consume",
        "topic": "orders.order-placed.critical",
        "requester": {"domain": "inventory", "roles": [], "permissions": []}
    }
}

# ─── Retention tests ──────────────────────────────────────────────────────

test_retention_violation_exceeds_max if {
    count(datamesh.retention_violation) > 0 with input as {
        "retention_ms": 9999999999,
        "requester": {"domain": "orders", "roles": []}
    }
}

test_retention_ok_within_max if {
    count(datamesh.retention_violation) == 0 with input as {
        "retention_ms": 604800000,
        "requester": {"domain": "orders", "roles": []}
    }
}
