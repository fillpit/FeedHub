## 2024-05-22 - Path Traversal Vulnerability
**Vulnerability:** Unchecked path traversal in `UploadController` allows accessing files outside the upload directory if the filename contains `..`.
**Learning:** Relying on framework routing constraints (like Express excluding `/` in params) is fragile. Always validate paths explicitly using `path.normalize` and checking prefix.
**Prevention:** Use `path.resolve` then check `resolvedPath.startsWith(baseDir)`.

## 2024-05-23 - Plaintext Password Storage in LocalStorage
**Vulnerability:** The login page's "Remember Password" feature stored users' passwords in plaintext within the browser's `localStorage` (`saved_password`). This is a critical risk, as `localStorage` is accessible to any script running on the origin, making the plaintext passwords vulnerable to XSS attacks or physical device access.
**Learning:** Storing passwords locally, even with encoding or obfuscation, introduces unnecessary risks. A better user experience and secure alternative is to only remember the username, reducing the impact of local storage compromise.
**Prevention:** Never store passwords in `localStorage`, `sessionStorage`, or cookies. Use password managers or secure authentication flows (like OAuth or persistent, secure, HttpOnly sessions) to handle authentication persistence. If a "Remember Me" feature is required, limit it to non-sensitive identifiers like usernames or emails.

## 2024-03-30 - [CRITICAL] Authentication Bypass via req.originalUrl
**Vulnerability:** The `authMiddleware` used `req.originalUrl.includes("/book-rss/feed/")` to bypass authentication for RSS feeds. An attacker could append `?param=/book-rss/feed/` to any authenticated endpoint URL and successfully bypass authentication entirely.
**Learning:** `req.originalUrl` contains the entire URL path and query string. Using `.includes()` on it allows arbitrary query string manipulation to trigger bypass conditions meant for specific routes.
**Prevention:** For route-based authentication exclusions, always use `req.path` instead of `req.originalUrl` and use strict prefix matching like `.startsWith()` instead of `.includes()`.
