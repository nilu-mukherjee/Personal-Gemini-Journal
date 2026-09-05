# Gemini Journal & Reflections

A secure, user-authenticated journaling and personal reflection web application powered by **Next.js 15**, **Firebase Authentication**, **Cloud Firestore**, and **Gemini 3.6 Flash**.

---

## Architecture & Security Overview

- **User Identity**: Firebase Authentication with federated Google Sign-In. Passwords and credentials are never stored or processed on application servers.
- **Data Isolation**: Multi-turn reflections and executive summaries are stored in Cloud Firestore under `/users/{userId}/interactions/{interactionId}`. Firestore security rules strictly isolate reads and writes to `request.auth.uid == userId`.
- **AI Processing Engine**: Server-side Gemini 3.6 Flash with automated fallback ladder (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`).
- **Secret Management**: Google Cloud Secret Manager / Environment Variables for zero-hardcoding hygiene. `GEMINI_API_KEY` is accessible exclusively to backend route handlers.

---

## 1. Environment & Prerequisites

1. **Install the Google Cloud SDK (`gcloud` CLI)** and authenticate:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Enable Required Google Cloud Services**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     secretmanager.googleapis.com \
     firestore.googleapis.com \
     identitytoolkit.googleapis.com
   ```

---

## 2. Firestore Security Rules

Deploy the owner-bound security rules with Role-Based Access Control (RBAC) and immutable audit logging:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isAdmin() {
      return isAuthenticated() && (
        request.auth.token.role == 'admin' ||
        request.auth.token.email == '07.nilu@gmail.com' ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
      );
    }

    // User profile and role document
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId) && (
        request.resource.data.role == 'user' ||
        request.auth.token.email == '07.nilu@gmail.com' ||
        isAdmin()
      );
      allow update: if (isOwner(userId) && request.resource.data.role == resource.data.role) || isAdmin();
      allow delete: if isAdmin();

      // User reflections and AI interactions
      match /interactions/{interactionId} {
        allow read: if isOwner(userId) || isAdmin();
        allow write: if isOwner(userId) || isAdmin();
      }

      // User notification settings
      match /settings/{settingId} {
        allow read, write: if isOwner(userId) || isAdmin();
      }
    }

    // Administrative immutable audit trail
    match /audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false; // strictly immutable
    }
  }
}
```

To deploy via the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 3. Secret Management Setup

Create the secret for the Gemini API key in Google Cloud Secret Manager and grant the Cloud Run runtime service account access:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Google Cloud Run Deployment

Deploy the containerized application to Google Cloud Run, mounting the secret as an environment variable:

```bash
gcloud run deploy gemini-journal \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --port 3000
```

---

## 5. Automated Challenge Verification Binding

Apply the mandatory resource label to register the service for automated challenge verification:

```bash
gcloud run services update gemini-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=asia-southeast1
```

---

## 6. Functional Verification Walkthrough

Follow these testing steps to verify full end-to-end functionality:

1. **Authentication Flow**:
   - Navigate to the application entry URL. Confirm the `AuthView` landing card appears.
   - Click **Sign In with Google** (or **Sandbox Demo Access**).
   - Verify redirect to the private dashboard, and confirm the user email and Firestore connection badge appear in the header.

2. **Multi-Turn Reflection & Gemini Response**:
   - Click **New Reflection** or select a starter prompt.
   - Select the **Deep Reflection** lens and type a thought in the composer.
   - Press `Cmd/Ctrl + Enter` or click **Send**.
   - Verify the loading indicator displays while Gemini synthesizes a response.
   - Confirm Gemini's reply renders cleanly with timestamp and model tag (`gemini-3.6-flash`).
   - Write a follow-up response to test multi-turn conversation memory. Confirm prior exchanges are maintained.

3. **Lens Switching & Summarization**:
   - Switch the lens to **Key Summary** or **Brainstorm**.
   - Submit another thought and observe that Gemini tailors its output structure (bullet points, creative action ideas).

4. **User-Isolated Firestore Persistence**:
   - Verify the "Saved to Firestore" confirmation badge appears.
   - Refresh the browser page. Confirm that the previous conversation and its title reload automatically from Firestore.
   - Inspect Firestore in the Firebase Console: verify the document exists under `/users/{userId}/interactions/{interactionId}`.

5. **History & Deletion**:
   - Use the search bar in the **Past Entries** sidebar to filter by keyword or category.
   - Click the delete icon on an entry and accept the confirmation dialog. Verify the document is removed from Firestore and the UI.

6. **Location-Aware Entries (Google Maps Integration)**:
   - In the workspace header, click **Pin Location**.
   - The interactive location picker drawer will expand. Select a preset (e.g., Tokyo, Paris, San Francisco) or use **Current Location** / map click.
   - Enter a custom place label and click **Confirm Location Pin**.
   - Verify the location badge appears in the reflection header and on the history card in the sidebar.
   - Verify coordinates and place name persist to the Firestore document under `location: { lat, lng, name }`.

7. **External System Notifications (Slack / Discord / Webhook)**:
   - Click the **Alert** (Bell) button in the workspace toolbar.
   - In the modal, select a service (**Slack Webhook**, **Discord Webhook**, or **Custom HTTPS**).
   - Enter a test webhook URL (must start with `https://`).
   - Click **Send Test Payload**. Verify that invalid or private URLs (e.g., `http://localhost`, `10.0.0.1`) are blocked with an SSRF prevention alert.
   - Select an alert trigger category (**Key Breakthrough**, **Action Item Identified**, or **High Priority**) and click **Dispatch Notification**.
   - Verify the confirmation badge and verify that the dispatch operation is logged to the server logs.

8. **Admin Dashboard & Role-Based Access Control (RBAC)**:
   - Sign in as the designated administrator (`07.nilu@gmail.com`).
   - Notice the **Admin Console** button appears in the top navigation bar.
   - Click **Admin Console** to switch to the administrative interface.
   - Verify the three administrative panels:
     1. **System Health & Metrics**: Displays active users, total interactions, and security status.
     2. **User Access Management**: View registered user profiles and toggle roles between `user` and `admin`.
     3. **Immutable Audit Trail**: Inspect real-time audit logs for all administrative actions (role updates, permission changes) stored in the write-only `/audit_logs` collection.
   - Click **Back to Workspace** to return to personal journaling.

