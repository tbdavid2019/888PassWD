# decision-intelligence Specification

## Purpose
Provides sub-200ms edge decision inference and deterministic fail-open heuristics for vault security triage, duplicate resolution, and website smart categorization while guaranteeing zero-knowledge client encryption.

## Requirements

### Requirement: Zero-Knowledge Edge Security Triage
The system SHALL prioritize compromised and weak credentials without transmitting plaintext passwords, decrypted notes, or identifiable user handles to remote models.

#### Scenario: Public asset credential breach prioritization
Given a vault item with exposedCount > 0 on a public-facing domain
When security triage is evaluated
Then the item is classified as P0 emergency remediation
And plaintext passwords and user notes are excluded from the evaluation payload.

### Requirement: Multi-Tier Resilient Fail-Over
The system SHALL query primary, secondary, and tertiary decision endpoints with a 2-second timeout, falling back gracefully to local deterministic heuristics if all endpoints fail.

#### Scenario: Remote endpoints unreachable
Given primary Clef-Flash, fallback Q4, and TypeSafe Jev are unavailable
When a decision request is issued
Then the system returns a successful result with provider "local_fallback"
And no unhandled runtime exceptions are thrown to the user.

### Requirement: Smart Website Categorization & Batch Organizing
The system SHALL classify web credentials into domain-aware categories and map them to existing or suggested new folders with relevant tags.

#### Scenario: Private LAN IP address classification
Given a credential with URI matching 10.x.x.x or 192.168.x.x
When website categorization is evaluated
Then the item is assigned to category "internal_network"
And the suggested folder is "區網10" or "區網192"
And suggested tags include "#內網".

### Requirement: Persistent Assessment Caching
The system SHALL cache security scan and triage results in client-side storage to eliminate redundant cryptographic iterations upon navigation.

#### Scenario: Navigating away and returning to security page
Given a completed password security scan for N items
When the user navigates to another page and returns
Then the cached assessment loads instantly without initiating a new background scan.
