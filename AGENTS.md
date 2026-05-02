## Agent Operating Policy (Cost + Quality)

- Use a lower-cost/faster model by default to contain usage costs.
- Escalate to a more capable model only when needed:
  - non-trivial bugs that do not converge after 1-2 focused attempts
  - multi-file architectural changes or high-risk refactors
  - ambiguous failures requiring deeper reasoning
- Prioritize functional correctness over minimal diffs: implement complete, robust fixes (not "quick minimal patches").
- Always run focused validation before handoff (automated and/or manual as appropriate) and report concrete test evidence.
- Keep explanations concise and practical unless the user asks for deep detail.

## Cursor Cloud specific instructions

This is a **static HTML website** with no build system, no package manager, and no dependencies to install. There are 8 HTML pages with inline CSS and vanilla JavaScript.

### Running the dev server

For local development with the chat widget, use the mock API server (serves static files + chat API):

```
python3 mock-api.py
```

This starts on port 8000 and handles both static files and the 4 chat endpoints. Open `http://localhost:8000/` in a browser.

For static-only serving (no chat backend): `python3 -m http.server 8000`

### Chat widget

`chat-widget.js` is a self-contained widget injected via `<script>` in all HTML pages. It reads `data-api=""` from the script tag for the backend base URL (empty = same origin). For production, set `data-api="https://your-render-url"`.

`mock-api.py` provides a local mock of the chat backend for testing. It returns contextual greetings per page and keyword-based responses.

### Key caveats

- **No linter, test suite, or build step exists.** There are no `package.json`, `requirements.txt`, or any dependency files. Validation is limited to manual browser testing.
- **External API dependency:** Pages make `fetch()` calls to `https://api.apprendimentorapido.it`. These calls will succeed or fail depending on network access; the pages handle failures gracefully with fallback text (e.g., "Prossimamente" / "Data da confermare").
- **Images hosted externally:** Most images are loaded from `genspark.ai` CDN. They will not render if the VM has no outbound internet access.
- **No CORS issues with `file://`:** Always use an HTTP server rather than opening HTML files directly via `file://` protocol, as `fetch()` API calls will fail due to CORS restrictions.
## WordPress Staging Environment
- Staging URL: https://staging.apprendimentorapido.it
- Hosting: Artera cPanel, server Lugano CH
- Theme: Kadence (wp-content/themes/kadence/)
- Deploy: automatic via GitHub Actions on every push to main

## Repository structure
- HTML standalone pages in root (master-eureka.html, coaching.html, etc.)
- Page-specific folders in root (black-friday/, demo-zoom/, dai-una-svolta/, etc.)
- WordPress theme in wp-content/themes/kadence/

## Rules
- Never modify wp-admin/, wp-includes/
- Never create files in wp-content/uploads/
- Every push to main auto-deploys to staging within 20 seconds
- Chat widget backend URL: https://api.apprendimentorapido.it

## Chat System Architecture

A reusable modular chat system is now available at `/chat-system/`. All tests (current and future) share the same chat infrastructure.

### Adding a New Test

To add a new test to this system:

1. **Create new folder**: Create `/new-test-name/` in the repo root
2. **Build the test logic**: Implement your quiz/test functionality 
3. **Add results screen**: On results screen, copy `/chat-system/user-form-template.html`
4. **Configure redirect**: On form submit, redirect to `/chat-system/chat.html` with URL params:
   ```javascript
   const chatUrl = `/chat-system/chat.html?userId=${userId}&nome=${nome}&cognome=${cognome}&email=${email}&telefono=${telefono}&punteggio=${punteggio}&quiz_status=new_test_name&pam=non_definito`;
   window.location.href = chatUrl;
   ```
5. **Backend integration**: Backend team adds handling for new `quiz_status` value

### Existing Quiz Integration

Current tests integrate as follows:
- `quiz_status=memoria` → Memory test (Quiz_test_memoria/)
- `quiz_status=lettura` → Reading speed test (tool-ai/)  
- `quiz_status=costo_ignoranza` → Ignorance cost test (Quiz_costo/)

### Chat System Components

- `/chat-system/chat.html` - Single chat page for ALL tests
- `/chat-system/chat-ai.js` - WebSocket system  
- `/chat-system/style.css` - Chat styles
- `/chat-system/js/` - Organized utility modules (audio, UI, network, utils)
- `/chat-system/user-form-template.html` - Reusable form component

WebSocket endpoint: `wss://backend-quiz-ai.onrender.com/ws`  
Submit endpoint: `https://backend-quiz-ai.onrender.com/quiz/submit`

Analytics tracking IDs (shared by all tests):
- GA4: G-2X3V7JZPBJ
- Facebook Pixel: 957273196609597 (consolidato 2026-05-02 — sostituiti 1113993426083027 e 1749584092436791)  
- LinkedIn: 6008396
