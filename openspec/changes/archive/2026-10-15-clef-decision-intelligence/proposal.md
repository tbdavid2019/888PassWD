# Proposal: Clef Edge Decision Intelligence & Smart Categorization

## Summary
Integrates the Clef-Flash edge decision inference system into NodeWarden (888PassWD), powering password health triage (P0/P1/P2/P3), duplicate credential resolution, and AI website categorization with intelligent folder and tag suggestions. Guarantees zero-knowledge client encryption and resilient fail-open local heuristic execution.

## Motivation
1. Password vault health was static and did not prioritize critical public asset leaks vs internal LAN items.
2. Users with thousands of items had unorganized roots without folders or tags.
3. Duplicates spanned cross-boundary risks (internal vs public networks using identical credentials).
4. Edge decision capabilities must run in <200ms without sending plaintext passwords, sensitive notes, or raw user identities off-device.

## Scope
- Multi-tier fallback architecture: Primary (Clef-Flash), Fallback 2 (Clef-Flash-Q4), Fallback 3 (TypeSafe Jev), Tier 4 (Deterministic Fail-Open Heuristic).
- Security Triage: Automated risk ranking (P0 Urgent, P1 High, P2 Suggested, P3 Good) with persistent cache in localStorage.
- Vault Badges & Counters: Immediate visual status on item cards and sidebar navigation.
- Smart Categorization: AI-suggested folder structures (e.g. 區網10, 區網192, 雲端與開發, 金融與銀行) with 1-click batch creation and move.
- Item deletion: Direct removal from security scan table with instant cache synchronization.
