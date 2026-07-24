# Deploy to GitHub Pages

## Option A — repository root

1. Create a GitHub repository.
2. Upload the complete contents of this folder to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. After deployment, open the URL shown by GitHub.

Your API reference will be available at:

```text
https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/kb.html
```

A direct API link will look like:

```text
https://YOUR-ACCOUNT.github.io/YOUR-REPOSITORY/kb.html?id=devicemanager-getdeviceid
```

## Updates

After editing `knowledge-template.xlsx`, regenerate `public/knowledge.json`, commit
the updated files and push them to `main`. GitHub Pages will redeploy automatically.

## Custom domain

Configure the domain in **Settings → Pages → Custom domain**. If you use a custom
domain, follow GitHub's displayed DNS instructions and enable HTTPS.
