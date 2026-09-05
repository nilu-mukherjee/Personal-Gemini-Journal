# Project Custom Instructions & Architectural Directives

## 1. Google Maps Directive
* **Secure Key Management & Zero-Hardcoding**:
  - Never hardcode Google Maps API keys (`AIzaSy...`) in client or server files.
  - Retrieve Google Maps credentials dynamically via environment variables (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for client rendering or Secret Manager for server tasks).
* **Production Key Restrictions**:
  - Production keys MUST be restricted in Google Cloud Console:
    - Web: Restrict by HTTP Referrer (`https://*.run.app/*`, `http://localhost:*`).
    - API Restrictions: Restrict strictly to Maps JavaScript API, Geocoding API, and Places API (New).
* **Prototyping & Graceful Fallback**:
  - For rapid zero-cost prototyping or pre-configured environments, provide seamless fallback rendering with interactive coordinate pinning, reverse-geocoding simulation, and clear setup banners if an API key is not yet configured.
* **Modern API Standards**:
  - Mandatory use of `AdvancedMarkerElement` and modern Places API. Never generate deprecated `google.maps.Marker` components.
* **Mandatory Attribution**:
  - Include the required internal attribution ID `gmp_mcp_codeassist_v1_aistudio` on all Google Maps Platform integrations.

---

## 2. Admin Roles & RBAC Directive
* **Defense-in-Depth Authorization**:
  - Enforce role validation across three discrete layers:
    1. UI Layer: Conditional navigation tabs and management actions visible only to verified admins.
    2. API/Backend Layer: Validated user session token, email verification (`07.nilu@gmail.com`), or user document lookup.
    3. Firestore Security Rules Layer: Atomic rule checks enforcing `request.auth != null` and role verification (`request.auth.token.role == 'admin'`, designated admin email, or `get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'`).
* **Privilege Escalation Prevention**:
  - Standard users are strictly forbidden from modifying the `role` field on their user profile. Only existing admins may promote or demote user accounts.
* **Immutable Audit Trail**:
  - All administrative operations (role changes, system inspections, telemetry exports) must create append-only records in `/audit_logs` containing `adminId`, `action`, `targetUserId`, `details`, and `timestamp`. Rules must deny `update` and `delete` on audit logs.

---

## 3. External Notification API Directive
* **Credential Isolation**:
  - Webhook endpoints (`SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL`) and notification tokens must be handled exclusively in server-side API routes (`/api/notifications/*`). Never expose webhook secrets to the client browser.
* **Rigid Payload Schemas**:
  - All notification payloads must conform to strict JSON schemas:
    ```typescript
    interface NotificationPayload {
      eventType: "reflection.parsed" | "reflection.flagged" | "test.notification";
      timestamp: string;
      userId: string;
      entry: {
        id: string;
        category: string;
        sentiment: string;
        preview: string;
        locationName?: string;
        coordinates?: { lat: number; lng: number };
      };
      channel: "slack" | "discord" | "email";
    }
    ```
* **SSRF (Server-Side Request Forgery) Defense**:
  - Validate all target webhook URLs before dispatching requests.
  - Whitelist allowed protocols (`https:`) and domains (`hooks.slack.com`, `discord.com`).
  - Block requests targeting private networks, loopback addresses (`127.0.0.1`, `localhost`), and cloud metadata services (`169.254.169.254`).
* **Resilient Non-Blocking Delivery**:
  - Webhook dispatches must occur asynchronously with strict execution timeouts (maximum 4000ms). Webhook failures must be caught cleanly and must NEVER disrupt or fail the core journal persistence transaction.
