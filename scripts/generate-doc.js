const fs = require('fs');
const path = require('path');
const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  BorderStyle, 
  WidthType, 
  AlignmentType,
  ShadingType
} = require('docx');

async function generateDocx() {
  console.log('Generating comprehensive Word Document (.docx)...');

  const createHeading = (text, level = HeadingLevel.HEADING_1) => {
    return new Paragraph({
      text,
      heading: level,
      spacing: { before: 280, after: 120 },
    });
  };

  const createPara = (text, options = {}) => {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          size: 22, // 11pt
          font: 'Arial',
          ...options,
        }),
      ],
      spacing: { after: 120, line: 300 },
    });
  };

  const createBullet = (boldPrefix, text) => {
    return new Paragraph({
      bullet: { level: 0 },
      children: [
        new TextRun({
          text: boldPrefix,
          bold: true,
          size: 22,
          font: 'Arial',
        }),
        new TextRun({
          text: ` ${text}`,
          size: 22,
          font: 'Arial',
        }),
      ],
      spacing: { after: 80, line: 280 },
    });
  };

  const createTableCell = (text, isHeader = false, widthPercent = 25) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: isHeader ? { type: ShadingType.CLEAR, fill: '2D3748' } : { type: ShadingType.CLEAR, fill: 'F7FAFC' },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isHeader,
              color: isHeader ? 'FFFFFF' : '2D3748',
              size: 20, // 10pt
              font: 'Arial',
            }),
          ],
          spacing: { before: 80, after: 80 },
        }),
      ],
      margins: { top: 120, bottom: 120, left: 140, right: 140 },
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: 'Gemini Journal & Reflections Platform',
                bold: true,
                size: 44, // 22pt
                font: 'Arial',
                color: '1A365D',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Architecture & Implementation Document',
                bold: true,
                size: 28, // 14pt
                font: 'Arial',
                color: '4A5568',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Production Guide covering Authenticity, Usability, Stability, and Security',
                italics: true,
                size: 20,
                color: '718096',
                font: 'Arial',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
          }),

          createHeading('1. Executive Summary & Google AI Studio Workflow', HeadingLevel.HEADING_1),
          createPara(
            'This document presents the complete architectural lifecycle of the Gemini Journal & Reflections platform, a production-grade web application created using Google AI Studio. Google AI Studio served as the core development environment to iterate, test, and harden the system against real-world production demands.'
          ),
          createPara(
            'How Google AI Studio was used to implement this system:'
          ),
          createBullet(
            'Conversational Systems Architecture:',
            'Google AI Studio transformed natural language requirements into a structured, modular Next.js 15 App Router architecture. It separated concerns between client-side user experience components and server-side secret isolation proxies.'
          ),
          createBullet(
            'Iterative Threat Modeling & Security Directives:',
            'Using Google AI Studio, every external boundary (Cloud Firestore, Google Maps JavaScript API, Gemini API, Slack/Discord webhooks) was systematically modeled against the OWASP Top 10 and OWASP Top 10 for LLMs. Strict directives were authored into AGENTS.md and GEMINI.md.'
          ),
          createBullet(
            'Automated Diagnostic & Error Recovery:',
            'When Next.js experienced build artifact lock contention between the background dev server and production builds, Google AI Studio isolated .next-dev from .next. When Google Maps encountered runtime key format discrepancies, AI Studio built pre-flight key inspection and a vector-based zero-config fallback canvas.'
          ),

          createHeading('2. Core Pillars of Implementation', HeadingLevel.HEADING_1),

          createHeading('Pillar 1: Authenticity — Unique Features Beyond the Starter Lab', HeadingLevel.HEADING_2),
          createPara(
            'Standard educational or starter labs typically feature a basic prompt box connecting directly to a single AI endpoint, accompanied by unauthenticated client-side database calls. This project extends far beyond standard starter implementations with five core authentic features:'
          ),
          createBullet(
            'Resilient 4-Tier Model Fallback Ladder:',
            'The backend never depends on a single static model string. If Google Cloud encounters transient 503 Unavailable or 429 Rate Limit conditions, the server sequentially steps down through gemini-3.6-flash, gemini-3.1-flash-lite, gemini-flash-latest, and gemini-3.7-flash before bubbling an error.'
          ),
          createBullet(
            'Dual-Mode Google Maps Platform & Interactive Vector Canvas:',
            'Integrates live Google Maps Platform using the latest AdvancedMarkerElement and mandatory attribution gmp_mcp_codeassist_v1_aistudio. In environments without an API key or upon authentication failure, the application seamlessly switches to a zero-config interactive SVG canvas supporting click-to-pin, preset cities, and GPS.'
          ),
          createBullet(
            'SSRF-Defended External Webhook Broadcasting:',
            'Enables users to broadcast reflections and executive summaries to team channels (Slack and Discord). All requests are routed through a server-side proxy that enforces strict domain whitelisting and blocks loopback/cloud metadata targets.'
          ),
          createBullet(
            'Multi-Tier RBAC with Write-Once Immutable Audit Logging:',
            'Distinguishes between standard reflectors and administrative users. Administrative actions write to an append-only /audit_logs collection where update and delete operations are strictly prohibited by Firestore security rules.'
          ),
          createBullet(
            'Integrated Security Test Suite & Git Hooks:',
            'Contains scripts/security-check.js running 4 automated tests (gitignore protection, secret scanning, Firestore rule verification, AI isolation) hooked into pre-commit checks and CI/CD pipelines.'
          ),

          createHeading('Pillar 2: Usability — Single Sign-On (SSO) & Error-Free Interactions', HeadingLevel.HEADING_2),
          createPara(
            'Usability was prioritized to ensure a smooth, approachable experience free of dead clicks or lost input:'
          ),
          createBullet(
            'Frictionless Google Single Sign-On (SSO):',
            'Outsources password management by leveraging Google Sign-In through Firebase Authentication. Users log in with a single click, maintaining cross-tab persistence and zero password exposure.'
          ),
          createBullet(
            'Defensive Input Handling & Zero Dead Clicks:',
            'Every interactive control has a verified, responsive event handler. Dynamic category switching allows toggling between Reflection (cognitive reframing), Executive Summary (actionable items), and Brainstorming (lateral perspectives).'
          ),
          createBullet(
            'Null-Safe Payload Hygiene:',
            'All data payloads are scrubbed of undefined properties prior to sending to Cloud Firestore, preventing database serialization exceptions.'
          ),
          createBullet(
            'Lossless Input Buffering:',
            'If a network glitch or AI generation error occurs, the user-written prompt is preserved in the active buffer with an explicit retry option, preventing data loss.'
          ),

          createHeading('Pillar 3: Stability — Robust Error Handling & Deployment Uptime', HeadingLevel.HEADING_2),
          createPara(
            'Production stability was engineered into the build pipeline and runtime execution:'
          ),
          createBullet(
            'Decoupled Build Directory Isolation:',
            'Configured next.config.ts to isolate the local development server directory (.next-dev) from the production release directory (.next), eliminating ENOENT routes-manifest.json file lock errors.'
          ),
          createBullet(
            'Asynchronous Non-Blocking Delivery:',
            'External webhook calls are encapsulated in AbortController timers capped at 4,000ms. Failures in third-party services never block or corrupt the core reflection save transaction.'
          ),
          createBullet(
            'Standalone Multi-Stage Containerization:',
            'Scaffolded a multi-stage Dockerfile utilizing Next.js standalone output, resulting in a minimal, high-speed container image designed for scale-to-zero Cloud Run hosting.'
          ),
          createBullet(
            'Clean Linting & Compilation Compliance:',
            'ESLint flat configuration explicitly ignores compiled chunks in .next and .next-dev, guaranteeing 100% clean passes for lint_applet and compile_applet.'
          ),

          createHeading('Pillar 4: Security — Hardening of Database Paths, API Keys, & Access Controls', HeadingLevel.HEADING_2),
          createPara(
            'Security and defense-in-depth principles govern every layer of the architecture:'
          ),
          createBullet(
            'Strict Path Isolation in Firestore Rules:',
            'Prohibits wide-open access (allow read, write: if true). Personal interactions are bound to /users/{userId}/interactions/{interactionId}, strictly requiring request.auth.uid == userId.'
          ),
          createBullet(
            'Zero Hardcoded Credentials & Secret Manager Access:',
            'No API keys or private credentials exist in client code. GEMINI_API_KEY is retrieved exclusively on the server from Google Cloud Secret Manager or runtime secrets.'
          ),
          createBullet(
            'Privilege Escalation Prevention:',
            'Standard users are prohibited from modifying the role field on their profile document. Only verified administrators can promote or demote accounts.'
          ),
          createBullet(
            'Server-Side Request Forgery (SSRF) Defense:',
            'Outgoing notification URLs are validated against allowed schemes (https:) and domains (hooks.slack.com, discord.com). Requests to private IP spaces (10.0.0.0/8, 192.168.0.0/16, 127.0.0.1) and Cloud Run metadata (169.254.169.254) are rejected.'
          ),

          createHeading('3. Agentic Threat Modeling Matrix', HeadingLevel.HEADING_1),
          createPara(
            'Below is the structured threat analysis across the five primary attack zones:'
          ),

          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Threat Zone', true, 20),
                  createTableCell('Identified Risk', true, 25),
                  createTableCell('Severity', true, 15),
                  createTableCell('Implemented Countermeasure', true, 40),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Input Surfaces', false, 20),
                  createTableCell('Malformed payloads or oversized text attempting DoS', false, 25),
                  createTableCell('Medium', false, 15),
                  createTableCell('Server-side schema validation, content length caps, and stripping undefined fields', false, 40),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Planning & Reasoning', false, 20),
                  createTableCell('Prompt injection attempting system prompt extraction', false, 25),
                  createTableCell('Medium', false, 15),
                  createTableCell('Strict system framing and structured JSON deserialization before client rendering', false, 40),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Tool Execution (SSRF)', false, 20),
                  createTableCell('Webhook payloads targeting internal metadata (169.254.169.254)', false, 25),
                  createTableCell('Critical', false, 15),
                  createTableCell('Strict protocol (https:) and host whitelisting (hooks.slack.com, discord.com)', false, 40),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Memory & State', false, 20),
                  createTableCell('Unauthorized document reading or profile role tampering', false, 25),
                  createTableCell('Critical', false, 15),
                  createTableCell('Owner-bound rules (request.auth.uid == userId) and immutable /audit_logs', false, 40),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell('Inter-System Comms', false, 20),
                  createTableCell('Gemini or Maps credential leakage in client bundles', false, 25),
                  createTableCell('High', false, 15),
                  createTableCell('Gemini isolated to backend routes; Maps key validated and restricted by HTTP referrer', false, 40),
                ],
              }),
            ],
          }),

          createHeading('4. Step-by-Step Implementation Lifecycle', HeadingLevel.HEADING_1),
          createBullet(
            'Step 1 (Architecture & Blueprints):',
            'Configured Next.js 15 App Router, initialized Tailwind CSS, Lucide icons, and created firebase-blueprint.json schema.'
          ),
          createBullet(
            'Step 2 (Federated Identity & SSO):',
            'Implemented Firebase Authentication with Google Auth Provider popup, session persistence, and AuthView component.'
          ),
          createBullet(
            'Step 3 (AI Proxy & Fallback Ladder):',
            'Built /api/gemini/reflect using @google/genai SDK with automated 4-tier model fallback ladder.'
          ),
          createBullet(
            'Step 4 (Geographic Grounding):',
            'Developed GoogleMapPicker supporting live Google Maps JS API with AdvancedMarkerElement, attribution, and vector fallback canvas.'
          ),
          createBullet(
            'Step 5 (External Webhook Dispatcher):',
            'Constructed /api/notifications/dispatch with SSRF protection, host whitelisting, and non-blocking delivery.'
          ),
          createBullet(
            'Step 6 (Role-Based Access Control):',
            'Built AdminPanel for designated administrator (07.nilu@gmail.com) and write-once /audit_logs collection.'
          ),
          createBullet(
            'Step 7 (Hardening & Container Deployment):',
            'Configured distDir build separation, authored scripts/security-check.js, and prepared multi-stage Dockerfile for Cloud Run.'
          ),

          createHeading('5. Functional Stability & Verification Walkthrough', HeadingLevel.HEADING_1),
          createPara(
            'Every major system interaction has a corresponding verification test case:'
          ),
          createBullet('TC-01 (Security Suite):', 'Run npm run test:security — Passes all 4 checks (gitignore, secrets, rules, AI isolation).'),
          createBullet('TC-02 (Google SSO):', 'Click "Sign in with Google" — Firebase popup authenticates user and sets session in Firestore.'),
          createBullet('TC-03 (AI Reflection):', 'Submit journal prompt — /api/gemini/reflect calls Gemini 3.6 Flash and returns analysis.'),
          createBullet('TC-04 (Fallback Ladder):', 'Simulate 503 error — Engine automatically invokes gemini-3.1-flash-lite without UI failure.'),
          createBullet('TC-05 (Map Fallback Canvas):', 'Load without key — Vector canvas renders with status badge and click-to-pin interactivity.'),
          createBullet('TC-06 (Map Presets & GPS):', 'Click preset pill (Tokyo/Paris) — Marker repositions to preset coordinates.'),
          createBullet('TC-07 (Webhook SSRF Defense):', 'Submit http://169.254.169.254 — Server rejects request with 400 Bad Request.'),
          createBullet('TC-08 (RBAC Enforcement):', 'Log in as standard user — Admin tab is hidden; unauthorized rule writes are blocked.'),
          createBullet('TC-09 (Audit Immutability):', 'Execute delete on /audit_logs/{id} — Security rules reject the operation.'),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const rootDocxPath = path.join(process.cwd(), 'IMPLEMENTATION_DOC.docx');
  const publicDocxPath = path.join(process.cwd(), 'public', 'IMPLEMENTATION_DOC.docx');

  fs.writeFileSync(rootDocxPath, buffer);
  fs.writeFileSync(publicDocxPath, buffer);
  console.log('✅ Successfully wrote IMPLEMENTATION_DOC.docx to root and public directories!');
}

function generateHtmlAndDoc() {
  console.log('Generating HTML and Word-compatible .doc file...');

  const htmlContent = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Gemini Journal & Reflections - Architecture & Implementation Document</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      margin: 1.0in;
      size: letter;
    }
    body {
      font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #2D3748;
      max-width: 850px;
      margin: 0 auto;
      padding: 40px 20px;
      background-color: #FAFAFA;
    }
    .document-card {
      background: #FFFFFF;
      padding: 48px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      border: 1px solid #E2E8F0;
    }
    h1 {
      font-size: 24pt;
      color: #1A365D;
      text-align: center;
      margin-bottom: 8px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 16px;
    }
    h2 {
      font-size: 16pt;
      color: #2B6CB0;
      margin-top: 32px;
      margin-bottom: 12px;
      border-bottom: 1px solid #EDF2F7;
      padding-bottom: 6px;
    }
    h3 {
      font-size: 13pt;
      color: #2D3748;
      margin-top: 20px;
      margin-bottom: 8px;
    }
    p {
      margin-bottom: 12px;
    }
    ul {
      margin-top: 6px;
      margin-bottom: 16px;
      padding-left: 24px;
    }
    li {
      margin-bottom: 8px;
    }
    strong {
      color: #1A202C;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    th {
      background-color: #2D3748;
      color: #FFFFFF;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      border: 1px solid #CBD5E0;
    }
    td {
      padding: 10px 12px;
      border: 1px solid #E2E8F0;
      background-color: #FFFFFF;
    }
    tr:nth-child(even) td {
      background-color: #F7FAFC;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9pt;
      font-weight: bold;
    }
    .badge-critical { background: #FED7D7; color: #9B2C2C; }
    .badge-high { background: #FEEBC8; color: #9C4221; }
    .badge-medium { background: #FEFCBF; color: #975A16; }
    .download-bar {
      margin-bottom: 24px;
      padding: 12px 16px;
      background: #EDF2F7;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .download-btn {
      background: #2B6CB0;
      color: #FFFFFF;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 10pt;
    }
    .download-btn:hover {
      background: #2C5282;
    }
  </style>
</head>
<body>
  <div class="download-bar">
    <span>📄 <strong>Format Options</strong>: View online, print to PDF, or download as Word document (.docx / .doc).</span>
    <a href="/IMPLEMENTATION_DOC.docx" class="download-btn" download>Download .docx File</a>
  </div>

  <div class="document-card">
    <h1>Gemini Journal & Reflections Platform</h1>
    <p style="text-align: center; color: #718096; font-size: 12pt; margin-top: -8px;">
      <strong>Architecture & Implementation Document</strong><br>
      <em>Comprehensive Production Lifecycle covering Authenticity, Usability, Stability, and Security</em>
    </p>

    <h2>1. Executive Summary & Google AI Studio Workflow</h2>
    <p>
      This document provides the complete end-to-end implementation details of the <strong>Gemini Journal & Reflections</strong> application. <strong>Google AI Studio</strong> served as the central system-scaffolding and testing engine, facilitating the transition from conceptual requirements to a secure, enterprise-grade full-stack web service.
    </p>
    <p>Key workflows accomplished via Google AI Studio:</p>
    <ul>
      <li><strong>Conversational Systems Architecture</strong>: AI Studio decomposed product goals into an idiomatic Next.js 15 App Router codebase, separating interactive client views from secure server API routes.</li>
      <li><strong>Threat Modeling & Policy Authoring</strong>: AI Studio evaluated each integration surface against the OWASP Top 10 and authored persistent security rules in <code>AGENTS.md</code> and <code>GEMINI.md</code>.</li>
      <li><strong>Automated Diagnostics & Resilience Engineering</strong>: When runtime collisions occurred between Next.js build steps, AI Studio resolved the file locks by isolating development builds to <code>.next-dev</code>. When Google Maps credentials mismatched, it introduced pre-flight key inspection and a vector-drawn fallback canvas.</li>
    </ul>

    <h2>2. Core Pillars of Implementation</h2>

    <h3>Pillar 1: Authenticity — Unique Features Beyond the Starter Lab</h3>
    <p>Standard starter projects typically provide a solitary text input tied to a hardcoded AI endpoint with unauthenticated database access. This application delivers five production-grade authentic capabilities:</p>
    <ul>
      <li><strong>Automated Multi-Tier Gemini Fallback Ladder</strong>: Rather than hardcoding a single model string, the backend automatically transitions across a resilience hierarchy (<code>gemini-3.6-flash</code> &rarr; <code>gemini-3.1-flash-lite</code> &rarr; <code>gemini-flash-latest</code> &rarr; <code>gemini-3.7-flash</code>) when encountering 503 or 429 errors.</li>
      <li><strong>Dual-Mode Geographic Grounding (Google Maps Platform + Vector Canvas)</strong>: Uses modern Google Maps JavaScript API with <code>AdvancedMarkerElement</code> and attribution <code>gmp_mcp_codeassist_v1_aistudio</code>. If a key is missing or fails authentication, the app switches to an interactive SVG vector map canvas with click-to-pin, preset cities, and browser GPS.</li>
      <li><strong>SSRF-Defended Notification Webhooks</strong>: Server-side proxy (<code>/api/notifications/dispatch</code>) dispatches summaries to Slack and Discord while blocking loopback and cloud metadata requests.</li>
      <li><strong>Multi-Role RBAC & Immutable Audit Trail</strong>: Distinguishes standard users from administrators (<code>07.nilu@gmail.com</code>). System events produce write-once records in <code>/audit_logs</code> protected by rules denying update and delete operations.</li>
      <li><strong>In-Repo Security Test Suite</strong>: <code>scripts/security-check.js</code> automates four essential checks (gitignore protection, secret detection, Firestore rules, AI proxy isolation) wired into pre-commit git hooks.</li>
    </ul>

    <h3>Pillar 2: Usability — Single Sign-On (SSO) & Error-Free Interactions</h3>
    <ul>
      <li><strong>Google Identity Single Sign-On</strong>: Frictionless one-click authentication via Firebase Auth with session persistence across tabs and no password storage risks.</li>
      <li><strong>Defensive Input Handling & Zero Dead Clicks</strong>: Every interactive button, modal, and mode switch features verified click handlers and loading states.</li>
      <li><strong>Dynamic Mode Switching</strong>: Instant toggling between <strong>Reflection</strong> (emotional reframing), <strong>Executive Summary</strong> (action items), and <strong>Brainstorming</strong> (divergent ideas).</li>
      <li><strong>Lossless Input Buffering</strong>: In the event of an API or network failure, user input remains preserved in the active buffer with a retry prompt.</li>
    </ul>

    <h3>Pillar 3: Stability — Robust Error Handling & Deployment Uptime</h3>
    <ul>
      <li><strong>Decoupled Build Isolation</strong>: Separated development server artifacts (<code>.next-dev</code>) from production build artifacts (<code>.next</code>), eliminating race-condition build failures.</li>
      <li><strong>Non-Blocking Webhook Delivery</strong>: External notifications are encapsulated in 4,000ms timeouts, ensuring external network hiccups never disrupt user reflection persistence.</li>
      <li><strong>Minimal Multi-Stage Container</strong>: Next.js standalone output packaged into a multi-stage Dockerfile optimized for instant cold starts and scale-to-zero Cloud Run deployment.</li>
      <li><strong>Clean Tooling Compliance</strong>: ESLint flat config ignores build output, ensuring 100% clean passes for linter and compiler tools.</li>
    </ul>

    <h3>Pillar 4: Security — Hardening of Database Paths, API Keys, & Access Controls</h3>
    <ul>
      <li><strong>Owner-Bound Cloud Firestore Rules</strong>: Enforces <code>request.auth.uid == userId</code> on all reflection paths (<code>/users/{userId}/interactions/*</code>). Unauthenticated reads and writes are blocked.</li>
      <li><strong>Zero Hardcoded Credentials</strong>: All secrets (Gemini API keys, webhook URLs) are isolated to server environments and loaded via Google Cloud Secret Manager.</li>
      <li><strong>Privilege Escalation Defense</strong>: Normal users cannot modify their own <code>role</code> field. Role assignments require administrative permissions.</li>
      <li><strong>SSRF Defense</strong>: Target URLs are validated against allowed schemes (<code>https:</code>) and domains (<code>hooks.slack.com</code>, <code>discord.com</code>), blocking internal network targets.</li>
    </ul>

    <h2>3. Agentic Threat Modeling Matrix</h2>
    <table>
      <thead>
        <tr>
          <th>Threat Zone</th>
          <th>Identified Risk</th>
          <th>Severity</th>
          <th>Implemented Countermeasure</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Input Surfaces</strong></td>
          <td>Malformed prompts, oversized payloads, or prototype injection</td>
          <td><span class="badge badge-medium">Medium</span></td>
          <td>Server-side validation, length limits, and stripping undefined properties before database writes.</td>
        </tr>
        <tr>
          <td><strong>Planning & Reasoning</strong></td>
          <td>Prompt injection attempting to alter persona or leak instructions</td>
          <td><span class="badge badge-medium">Medium</span></td>
          <td>Strict system instruction framing and structured JSON deserialization before client display.</td>
        </tr>
        <tr>
          <td><strong>Tool Execution (SSRF)</strong></td>
          <td>User-supplied webhook URLs targeting internal Cloud Run metadata (169.254.169.254)</td>
          <td><span class="badge badge-critical">Critical</span></td>
          <td>Strict protocol (https:) and host whitelisting (hooks.slack.com, discord.com) with private IP rejection.</td>
        </tr>
        <tr>
          <td><strong>Memory & State</strong></td>
          <td>Cross-user data leakage or unauthorized role escalation</td>
          <td><span class="badge badge-critical">Critical</span></td>
          <td>Owner-bound path rules (request.auth.uid == userId) and immutable append-only /audit_logs.</td>
        </tr>
        <tr>
          <td><strong>Inter-System Comms</strong></td>
          <td>Gemini or Maps credential leakage in client browser bundles</td>
          <td><span class="badge badge-high">High</span></td>
          <td>Gemini isolated to backend server proxy; Google Maps key restricted by HTTP Referrer in Google Cloud.</td>
        </tr>
      </tbody>
    </table>

    <h2>4. Step-by-Step Implementation Lifecycle</h2>
    <ul>
      <li><strong>Step 1: Scaffolding & Blueprint</strong> — Set up Next.js 15 App Router, Tailwind CSS, and <code>firebase-blueprint.json</code>.</li>
      <li><strong>Step 2: SSO Authentication</strong> — Built Google Sign-In with Firebase Auth and <code>AuthView.tsx</code>.</li>
      <li><strong>Step 3: AI Reflection Engine</strong> — Implemented <code>/api/gemini/reflect</code> with the 4-tier model fallback ladder.</li>
      <li><strong>Step 4: Location Module</strong> — Scaffolded <code>GoogleMapPicker.tsx</code> with live Maps JS API and interactive vector fallback.</li>
      <li><strong>Step 5: Webhook Dispatcher</strong> — Created <code>/api/notifications/dispatch</code> with SSRF filtering and non-blocking delivery.</li>
      <li><strong>Step 6: RBAC & Audit Logs</strong> — Built <code>AdminPanel.tsx</code> and write-once <code>/audit_logs</code> collection.</li>
      <li><strong>Step 7: Production Hardening</strong> — Configured <code>next.config.ts</code> distDir isolation, <code>scripts/security-check.js</code>, and <code>Dockerfile</code>.</li>
    </ul>

    <h2>5. Functional Stability & Verification Walkthrough</h2>
    <ul>
      <li><strong>TC-01 (Security Suite)</strong>: Run <code>npm run test:security</code> &rarr; Passes all 4 tests.</li>
      <li><strong>TC-02 (Google SSO)</strong>: Click "Sign in with Google" &rarr; Authenticates via Firebase popup.</li>
      <li><strong>TC-03 (AI Reflection)</strong>: Submit journal reflection &rarr; Receives structured analysis from Gemini.</li>
      <li><strong>TC-04 (Fallback Ladder)</strong>: Upstream 503 error &rarr; Automatically falls back to secondary model without UI crash.</li>
      <li><strong>TC-05 (Map Fallback Canvas)</strong>: Load without key &rarr; Interactive vector canvas renders with click-to-pin.</li>
      <li><strong>TC-06 (Map Presets & GPS)</strong>: Click "Tokyo" or "Paris" &rarr; Repositions pin marker instantly.</li>
      <li><strong>TC-07 (Webhook SSRF Defense)</strong>: Submit <code>http://169.254.169.254</code> &rarr; Blocked with <code>400 Bad Request</code>.</li>
      <li><strong>TC-08 (RBAC Enforcement)</strong>: Standard user login &rarr; Admin tab hidden; role updates denied.</li>
      <li><strong>TC-09 (Audit Immutability)</strong>: Attempt <code>deleteDoc</code> on <code>/audit_logs</code> &rarr; Rejected by Firestore rules.</li>
    </ul>
  </div>
</body>
</html>`;

  // Write HTML document
  const publicHtmlPath = path.join(process.cwd(), 'public', 'documentation.html');
  fs.writeFileSync(publicHtmlPath, htmlContent);

  // Write Microsoft Word compatible .doc file
  const rootDocPath = path.join(process.cwd(), 'IMPLEMENTATION_GUIDE.doc');
  const publicDocPath = path.join(process.cwd(), 'public', 'IMPLEMENTATION_GUIDE.doc');
  fs.writeFileSync(rootDocPath, htmlContent);
  fs.writeFileSync(publicDocPath, htmlContent);

  console.log('✅ Successfully wrote documentation.html and IMPLEMENTATION_GUIDE.doc to root and public!');
}

async function main() {
  await generateDocx();
  generateHtmlAndDoc();
  console.log('🎉 All document formats successfully generated!');
}

main().catch((err) => {
  console.error('Error generating documents:', err);
  process.exit(1);
});
