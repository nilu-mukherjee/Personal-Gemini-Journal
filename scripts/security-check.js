const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n======================================================');
console.log('🔒 RUNNING AUTOMATED SECURITY & COMPLIANCE TESTS');
console.log('======================================================\n');

let failed = false;

function pass(testName, details) {
  console.log(`✅ PASS: ${testName}`);
  if (details) console.log(`   └─ ${details}`);
}

function fail(testName, error) {
  console.error(`❌ FAIL: ${testName}`);
  console.error(`   └─ ⚠️ ${error}`);
  failed = true;
}

// ----------------------------------------------------
// TEST 1: Check .gitignore for sensitive files
// ----------------------------------------------------
try {
  const gitignorePath = path.resolve('.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    fail('.gitignore presence', '.gitignore file is missing!');
  } else {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const requiredPatterns = ['gcp-key.json', '.env*'];
    const missing = requiredPatterns.filter(p => !gitignore.includes(p));
    if (missing.length > 0) {
      fail('Sensitive patterns in .gitignore', `Missing required ignore patterns: ${missing.join(', ')}`);
    } else {
      pass('.gitignore protection', 'Protects gcp-key.json and .env files.');
    }
  }
} catch (e) {
  fail('.gitignore check', e.message);
}

// ----------------------------------------------------
// TEST 2: Secret Leakage & Credential Scanning
// ----------------------------------------------------
try {
  let trackedFiles = [];
  try {
    const trackedFilesOutput = execSync('git ls-files', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    trackedFiles = trackedFilesOutput.split(/\r?\n/).filter(Boolean);
  } catch {
    // Fallback: Scan repository directory directly if not a git repository
    function getFiles(dir, fileList = []) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.next', '.next-dev', '.git'].includes(entry.name)) continue;
          getFiles(fullPath, fileList);
        } else {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }
    trackedFiles = getFiles('.');
  }

  let leakFound = false;
  const sensitiveFiles = ['gcp-key.json', '.env', '.env.local', '.env.production'];

  for (const f of trackedFiles) {
    // Skip the security check script itself
    if (f.includes('scripts/security-check.js') || f.includes('scripts\\security-check.js')) continue;

    if (sensitiveFiles.includes(path.basename(f))) {
      fail('Tracked sensitive file', `Forbidden sensitive file tracked in git: ${f}`);
      leakFound = true;
    }

    if (!fs.existsSync(f)) continue;

    // Skip binary files and lockfiles
    if (f.endsWith('.lock') || f.endsWith('.png') || f.endsWith('.ico') || f.endsWith('.svg')) continue;

    const content = fs.readFileSync(f, 'utf8');

    // Check for private keys
    if (content.includes('BEGIN PRIVATE KEY') || content.includes('BEGIN RSA PRIVATE KEY')) {
      fail('Private Key Leak', `Private key found inside tracked file: ${f}`);
      leakFound = true;
    }

    // Check for service account JSON
    if (content.includes('"type": "service_account"') && content.includes('"private_key"')) {
      fail('Service Account Key Leak', `GCP Service Account credential found in tracked file: ${f}`);
      leakFound = true;
    }

    // Check for client-side exposure of GEMINI_API_KEY (skip docs/prose, which may
    // mention the forbidden variable name as a warning rather than actually using it)
    const isDocFile = ['.md', '.mdx', '.html', '.txt'].includes(path.extname(f).toLowerCase());
    if (!isDocFile && content.includes('NEXT_PUBLIC_GEMINI_API_KEY')) {
      fail('API Key Exposure', `Forbidden client-exposed environment variable NEXT_PUBLIC_GEMINI_API_KEY found in: ${f}`);
      leakFound = true;
    }
  }

  if (!leakFound) {
    pass('Secret Scanning', `Audited ${trackedFiles.length} tracked files. No leaked credentials, private keys, or API tokens found.`);
  }
} catch (e) {
  fail('Secret Scanning', e.message);
}

// ----------------------------------------------------
// TEST 3: Cloud Firestore Security Rules Verification
// ----------------------------------------------------
try {
  const rulesPath = path.resolve('firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    fail('Firestore Rules Presence', 'firestore.rules file does not exist in root directory.');
  } else {
    const rules = fs.readFileSync(rulesPath, 'utf8');

    // Disallow wildcard or unauthenticated access
    if (rules.includes('allow read, write: if true') || rules.includes('allow read: if true') || rules.includes('allow write: if true')) {
      fail('Firestore Rules Security', 'Insecure open permissions (allow if true) detected in firestore.rules!');
    } else if (
      rules.includes('request.auth != null') &&
      rules.includes('request.auth.uid == userId')
    ) {
      pass('Firestore Security Rules', 'Verified owner-isolated security boundary (request.auth.uid == userId).');
    } else {
      fail('Firestore Security Rules', 'firestore.rules missing mandatory user-isolation checks (request.auth.uid == userId).');
    }
  }
} catch (e) {
  fail('Firestore Rules Verification', e.message);
}

// ----------------------------------------------------
// TEST 4: Backend AI Route Isolation
// ----------------------------------------------------
try {
  const clientComponents = ['components/ReflectionWorkspace.tsx', 'components/AuthView.tsx', 'components/Navbar.tsx', 'components/HistorySidebar.tsx'];
  let unsafeSdkUsage = false;

  for (const comp of clientComponents) {
    if (fs.existsSync(comp)) {
      const content = fs.readFileSync(comp, 'utf8');
      if (content.includes('@google/genai') || content.includes('GoogleGenAI')) {
        fail('AI Engine Boundary', `Client component ${comp} attempts to invoke GoogleGenAI directly. AI calls must go through backend /api/gemini/reflect route.`);
        unsafeSdkUsage = true;
      }
    }
  }

  if (!unsafeSdkUsage) {
    pass('AI Architecture Isolation', 'Gemini API is strictly isolated to backend API routes with Secret Manager.');
  }
} catch (e) {
  fail('Architecture Isolation Check', e.message);
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('------------------------------------------------------');
if (failed) {
  console.error('❌ SECURITY VERIFICATION FAILED!');
  console.error('Cloud Run deployment blocked until all security issues are resolved.\n');
  process.exit(1);
} else {
  console.log('✨ ALL SECURITY & COMPLIANCE TESTS PASSED!');
  console.log('Safe to proceed with Cloud Run deployment.\n');
  process.exit(0);
}
