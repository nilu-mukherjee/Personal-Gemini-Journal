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

Deploy the owner-bound security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
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
