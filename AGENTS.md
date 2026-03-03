## Cursor Cloud specific instructions

This is a **static HTML website** with no build system, no package manager, and no dependencies to install. There are 8 HTML pages with inline CSS and vanilla JavaScript.

### Running the dev server

Serve the site locally with Python's built-in HTTP server:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

### Key caveats

- **No linter, test suite, or build step exists.** There are no `package.json`, `requirements.txt`, or any dependency files. Validation is limited to manual browser testing.
- **External API dependency:** Pages make `fetch()` calls to `https://api.apprendimentorapido.it`. These calls will succeed or fail depending on network access; the pages handle failures gracefully with fallback text (e.g., "Prossimamente" / "Data da confermare").
- **Images hosted externally:** Most images are loaded from `genspark.ai` CDN. They will not render if the VM has no outbound internet access.
- **No CORS issues with `file://`:** Always use an HTTP server rather than opening HTML files directly via `file://` protocol, as `fetch()` API calls will fail due to CORS restrictions.
