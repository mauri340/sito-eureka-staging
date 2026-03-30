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
