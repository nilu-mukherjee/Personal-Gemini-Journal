# Project Guidelines & Directives (Gemini)

Refer to `AGENTS.md` for the core architectural directives:
- Google Maps Platform Directive: Key restriction, zero hardcoding, `gmp_mcp_codeassist_v1_aistudio` attribution, and modern `AdvancedMarkerElement`.
- Admin Roles & RBAC Directive: Multi-tier authorization, immutable `/audit_logs`, zero unauthorized privilege escalation.
- External Notification API Directive: Secure server-side webhook proxy, SSRF defense, strict payload schemas for Slack/Discord/Email.
