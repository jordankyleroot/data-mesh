package datamesh

import future.keywords.if
import future.keywords.in

# ─────────────────────────────────────────────────────────────────────────────
# PII field names that require masking annotations before publication
# ─────────────────────────────────────────────────────────────────────────────
pii_field_names := {
    "email", "phone", "mobile", "ssn", "tax_id", "passport",
    "credit_card", "card_number", "cvv", "bank_account",
    "date_of_birth", "dob", "ip_address", "device_id",
    "full_name", "first_name", "last_name", "home_address",
    "latitude", "longitude", "geo_location"
}

# ─────────────────────────────────────────────────────────────────────────────
# Platform admins (augment from external data in prod)
# ─────────────────────────────────────────────────────────────────────────────
platform_admins := {"platform-admin"}

is_platform_admin if {
    some role in input.requester.roles
    role in platform_admins
}

# ─────────────────────────────────────────────────────────────────────────────
# Schema registration policy
# ─────────────────────────────────────────────────────────────────────────────
default schema_allow := false

schema_allow if {
    input.action == "register"
    subject_domain_matches_requester
    not schema_has_unmasked_pii
    not schema_subject_malformed
}

schema_allow if {
    input.action == "register"
    is_platform_admin
    not schema_has_unmasked_pii
}

schema_violations[msg] {
    not subject_domain_matches_requester
    not is_platform_admin
    msg := sprintf("Requester domain '%v' does not own subject prefix '%v'", [
        requester_domain, input.subject
    ])
}

schema_violations[msg] {
    field := schema_pii_unmasked_fields[_]
    msg := sprintf("Field '%v' appears to be PII but lacks masking annotation. Add pii:true + masked:true or rename.", [field])
}

schema_violations[msg] {
    schema_subject_malformed
    msg := sprintf("Subject '%v' must follow <domain>.<event>-value convention", [input.subject])
}

# helpers
subject_domain_matches_requester if {
    parts := split(input.subject, ".")
    count(parts) >= 2
    parts[0] == requester_domain
}

requester_domain := input.requester.domain

schema_subject_malformed if {
    not regex.match(`^[a-z0-9-]+\.[a-z0-9-]+-value$`, input.subject)
}

schema_has_unmasked_pii if {
    count(schema_pii_unmasked_fields) > 0
}

schema_pii_unmasked_fields[name] {
    field := input.schema.fields[_]
    name := lower(field.name)
    pii_field_names[name]
    not field.masked == true
}

# ─────────────────────────────────────────────────────────────────────────────
# Topic access policy
# ─────────────────────────────────────────────────────────────────────────────
default topic_allow := false

topic_allow if {
    input.action == "produce"
    topic_producer_authorized
}

topic_allow if {
    input.action == "consume"
    topic_consumer_authorized
}

topic_allow if is_platform_admin

topic_producer_authorized if {
    parts := split(input.topic, ".")
    parts[0] == requester_domain
}

topic_consumer_authorized if {
    perm := input.requester.permissions[_]
    perm.resource == input.topic
    perm.access_level in {"read", "write"}
    not perm_expired(perm)
}

perm_expired(perm) if {
    perm.expires_at != null
    time.parse_rfc3339_ns(perm.expires_at) < time.now_ns()
}

# ─────────────────────────────────────────────────────────────────────────────
# Data / dataset access policy
# ─────────────────────────────────────────────────────────────────────────────
default data_allow := false

data_allow if {
    perm := input.requester.permissions[_]
    perm.resource == input.resource
    perm.access_level in {"read", "write"}
    not perm_expired(perm)
}

data_allow if is_platform_admin

# ─────────────────────────────────────────────────────────────────────────────
# Retention enforcement
# ─────────────────────────────────────────────────────────────────────────────
max_retention_ms := 2592000000  # 30 days default

retention_violation[msg] {
    input.retention_ms > max_retention_ms
    not "data-steward" in input.requester.roles
    msg := sprintf("retention_ms %v exceeds maximum %v. Request an exception from a data steward.", [
        input.retention_ms, max_retention_ms
    ])
}
