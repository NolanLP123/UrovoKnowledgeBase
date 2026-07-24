# Urovo Technical Knowledge Base

A static, deploy-anywhere technical knowledge base generated from
`USDK Interface documentation_V15.5.01E.docx`.

## Included files

- `index.html` — knowledge base landing page
- `kb.html` — search, filter and API detail interface
- `style.css` — responsive presentation
- `app.js` — search, filtering, deep links and copy actions
- `public/knowledge.json` — structured knowledge data
- `knowledge-template.xlsx` — editable maintenance workbook
- `tools/xlsx-to-json.py` — converts the workbook back to JSON
- `docs/GITHUB_PAGES.md` — GitHub Pages deployment
- `docs/NGINX.md` — company website / Nginx deployment

## Local preview

From this directory:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

Do not open the HTML file directly if your browser blocks local JSON requests.

## Maintain the content

1. Edit `knowledge-template.xlsx`.
2. Keep every `id` unique and URL-safe.
3. Regenerate JSON:

```bash
python3 tools/xlsx-to-json.py knowledge-template.xlsx public/knowledge.json
```

The converter requires `openpyxl`.

## Direct API links

Every API has a stable query link:

```text
kb.html?id=devicemanager-getdeviceid
```

This format works under GitHub Pages and under a company website subdirectory.
