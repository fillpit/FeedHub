## 2024-05-22 - Path Traversal Vulnerability
**Vulnerability:** Unchecked path traversal in `UploadController` allows accessing files outside the upload directory if the filename contains `..`.
**Learning:** Relying on framework routing constraints (like Express excluding `/` in params) is fragile. Always validate paths explicitly using `path.normalize` and checking prefix.
**Prevention:** Use `path.resolve` then check `resolvedPath.startsWith(baseDir)`.

## 2025-02-23 - Authentication Bypass via Query String
**Vulnerability:** Authentication middleware used `req.originalUrl.includes()` to check for allowed paths. Attackers could append the allowed string as a query parameter (e.g., `?fake=/book-rss/feed/`) to any protected URL to bypass authentication.
**Learning:** `req.originalUrl` includes the query string and is unsafe for path-based access control checks.
**Prevention:** Always use `req.path` for path checks as it excludes the query string. Use `startsWith` for prefix matching or exact equality where possible.
