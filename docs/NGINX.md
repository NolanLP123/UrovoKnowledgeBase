# Deploy under a company website with Nginx

Copy the complete folder contents to the selected static directory, for example:

```text
/var/www/developer.urovo.com/kb/
```

Example Nginx location:

```nginx
location /kb/ {
    alias /var/www/developer.urovo.com/kb/;
    index index.html;
    try_files $uri $uri/ =404;
}
```

Reload Nginx after validating its configuration. The knowledge base will then be:

```text
https://developer.urovo.com/kb/
```

Direct links remain static and shareable:

```text
https://developer.urovo.com/kb/kb.html?id=devicemanager-getdeviceid
```

Serve `.json` files as `application/json` and use UTF-8. No database, application
server or URL rewriting is required.
