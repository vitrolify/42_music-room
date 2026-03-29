<!--
Sync Impact Report
- Version change: 0.0.0 -> 1.0.0
- Modified principles:
	- Template Principle 1 -> I. Mobile Client as Backend Remote
	- Template Principle 2 -> II. Backend-Owned Data
	- Template Principle 3 -> III. REST + JSON Contract Discipline
	- Template Principle 4 -> IV. CI-First Collaborative Delivery
	- Template Principle 5 -> V. Observability and Action Audit Logging
- Added sections:
	- Security and Configuration Constraints
	- Delivery Workflow and Quality Gates
- Removed sections:
	- None
- Templates requiring updates:
	- ✅ updated: .specify/templates/plan-template.md
	- ✅ updated: .specify/templates/spec-template.md
	- ✅ updated: .specify/templates/tasks-template.md
	- ⚠ pending: .specify/templates/commands/*.md (directory not present in repository)
- Deferred TODOs:
	- None
-->

# 42 Music Room Constitution

## Core Principles

### I. Mobile Client as Backend Remote
The mobile application MUST operate as a control surface for backend capabilities,
not as an independent source of business truth. The backend base URL MUST be
configurable per environment (development, staging, production) without code
changes. Rationale: this preserves deployment flexibility and avoids coupling app
releases to infrastructure changes.

### II. Backend-Owned Data
All persistent application data MUST be stored and managed in the backend. The
mobile client MUST NOT persist authoritative domain data locally beyond temporary
cache required for UX continuity. Rationale: centralized data ownership guarantees
consistency, simplifies security controls, and supports real-time collaboration.

### III. REST + JSON Contract Discipline
All feature integration between mobile and backend MUST occur through versioned
REST endpoints or websockets, and request/response payloads MUST use JSON. Any breaking API
change MUST include explicit versioning or a documented migration strategy before
implementation. Rationale: consistent protocol contracts enable parallel team
delivery and predictable client-server evolution.

### IV. CI-First Collaborative Delivery
Continuous Integration is mandatory and acts as the primary integration control
point for multi-developer collaboration. Every pull request MUST pass automated
validation gates (build, lint, tests, and contract checks when API changes are
present) before merge. Rationale: early feedback and deterministic gates reduce
integration risk and keep delivery velocity stable.

### V. Observability and Action Audit Logging
The platform MUST support measurable API capacity by machine size through
observability tooling (metrics, logs, and traces or equivalent telemetry). Any
user action triggered in the mobile app MUST produce structured logs in the
backend with correlation identifiers when available. Rationale: observability is
required for capacity planning, incident response, and product reliability.

## Security and Configuration Constraints

- Secrets (API keys, database credentials, tokens, certificates, and similar
	sensitive material) MUST NOT be committed to git history.
- Repository changes MUST use secure secret handling (environment variables,
	secret managers, encrypted CI variables, or equivalent).
- API endpoints and backend URL configuration MUST be documented for each
	environment used during development and release.

## Delivery Workflow and Quality Gates

- Feature specs and plans MUST state how REST contracts, JSON schemas,
	observability signals, and backend logging requirements are verified.
- Task breakdowns MUST include CI setup/updates, API contract validation,
	observability implementation, and secret-safety checks where applicable.
- Code review MUST reject changes that violate backend-owned data, bypass CI
	protections, remove observability, or add undeclared secrets.

## Governance

This constitution overrides conflicting workflow conventions in this repository.
Amendments require: (1) a documented proposal in a pull request, (2) explicit
review by project maintainers, and (3) synchronization updates to impacted
templates and guidance artifacts.

Versioning policy for this constitution follows semantic versioning:
- MAJOR: incompatible principle or governance removals/redefinitions.
- MINOR: new principles/sections or materially expanded mandatory guidance.
- PATCH: clarifications, wording improvements, and non-semantic refinements.

Compliance review is required on every pull request. Reviewers MUST verify that
specification, plan, and task artifacts remain aligned with these principles.

**Version**: 1.0.0 | **Ratified**: 2026-03-29 | **Last Amended**: 2026-03-29
