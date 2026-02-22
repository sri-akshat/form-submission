# form-submission

Sprint 1 scaffold for the Chrome extension MVP (ITR assistant).

## Prerequisites

- Node.js `20+`
- npm (bundled with Node.js)
- Google Chrome (latest stable)
- Git

Verify installation:

```bash
node -v
npm -v
```

## Project setup

```bash
git clone <repo-url>
cd form-submission
npm install
```

`npm install` is required even with minimal dependencies to standardize local environment setup.

## Run tests

```bash
npm test
```

Expected result: unit and integration tests run via Node's built-in test runner.

## Prepare unpacked extension (temporary workaround)

Current manifest is located at `src/manifest/manifest.json` and uses `../` paths.  
To make a Chrome-loadable unpacked folder for Sprint 1, run:

```bash
node -e "const fs=require('fs'); const path=require('path'); fs.rmSync('dist-extension',{recursive:true,force:true}); fs.mkdirSync('dist-extension',{recursive:true}); fs.cpSync('src','dist-extension',{recursive:true}); const manifestPath=path.join('src','manifest','manifest.json'); const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')); manifest.background.service_worker='background/worker.js'; manifest.action.default_popup='popup/popup.html'; manifest.content_scripts=(manifest.content_scripts||[]).map(cs=>({...cs,js:['content/content-entry.js']})); fs.writeFileSync(path.join('dist-extension','manifest.json'), JSON.stringify(manifest,null,2));"
```

This creates `dist-extension/` with corrected internal manifest paths:
- `background.service_worker -> "background/worker.js"`
- `action.default_popup -> "popup/popup.html"`
- `content_scripts[*].js -> ["content/content-entry.js"]`

## Load in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `dist-extension/`.
5. Confirm extension appears as **ITR Form Assistant**.

## Quick verification

- Extension is visible in Chrome extensions page.
- Popup opens and shows **Start Session** button.
- `npm test` passes locally.

## Troubleshooting

- `node: command not found`
  - Install Node.js 20+ and restart terminal.
- `npm: command not found`
  - Reinstall Node.js (npm ships with it) and verify `node -v` / `npm -v`.
- Chrome load unpacked fails or shows stale manifest/path issues
  - Recreate bundle: rerun the temporary workaround command to rebuild `dist-extension/`.
- Tests fail with unsupported runtime/version errors
  - Confirm `node -v` is `>=20` as required by `package.json`.

## What is implemented in Sprint 1

- MV3 extension skeleton (`src/manifest/manifest.json`)
- Background worker with message router and session bootstrap
- Portal context detector (URL + text signal based)
- Deterministic Form 16 text parser v1
- Append-only audit log writer

## Test coverage

### Unit tests

- `tests/unit/portal-detector.test.js`
  - Detects Income Tax portal context using URL + content signals
  - Verifies non-portal pages are rejected
- `tests/unit/form16-parser.test.js`
  - Extracts taxpayer profile, salary, deductions, TDS
  - Produces warnings for missing critical fields
- `tests/unit/audit-log.test.js`
  - Ensures ordered event append semantics
  - Validates JSON export format
- `tests/unit/session-orchestrator.test.js`
  - Validates session bootstrap and state transitions
  - Confirms Form 16 parse persistence and audit emission

### Integration tests

- `tests/integration/background-message-flow.test.js`
  - Exercises message flow from `START_SESSION` to `PORTAL_CONTEXT_DETECTED`
  - Verifies orchestrator state and audit side effects
- `tests/integration/extraction-audit-pipeline.test.js`
  - Exercises `UPLOAD_FORM16_TEXT` through parser and audit pipeline
  - Verifies parsed payload persistence and `FORM16_PARSED` audit event
