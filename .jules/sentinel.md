## 2024-05-22 - Path Traversal Vulnerability
**Vulnerability:** Unchecked path traversal in `UploadController` allows accessing files outside the upload directory if the filename contains `..`.
**Learning:** Relying on framework routing constraints (like Express excluding `/` in params) is fragile. Always validate paths explicitly using `path.normalize` and checking prefix.
**Prevention:** Use `path.resolve` then check `resolvedPath.startsWith(baseDir)`.

## 2024-05-23 - Plaintext Password Storage in LocalStorage
**Vulnerability:** The login page's "Remember Password" feature stored users' passwords in plaintext within the browser's `localStorage` (`saved_password`). This is a critical risk, as `localStorage` is accessible to any script running on the origin, making the plaintext passwords vulnerable to XSS attacks or physical device access.
**Learning:** Storing passwords locally, even with encoding or obfuscation, introduces unnecessary risks. A better user experience and secure alternative is to only remember the username, reducing the impact of local storage compromise.
**Prevention:** Never store passwords in `localStorage`, `sessionStorage`, or cookies. Use password managers or secure authentication flows (like OAuth or persistent, secure, HttpOnly sessions) to handle authentication persistence. If a "Remember Me" feature is required, limit it to non-sensitive identifiers like usernames or emails.

## 2024-05-24 - Authentication Bypass via Query String
**Vulnerability:** The global authentication middleware used `req.originalUrl.includes("/book-rss/feed/")` to bypass authentication for RSS feeds. An attacker could access any protected endpoint by simply appending `?/book-rss/feed/` to the query string, as `originalUrl` includes the query parameters.
**Learning:** Checking `originalUrl` for allowlisting routes is dangerous because it includes user-controlled query parameters. The allowlist should strictly rely on the normalized path component of the request.
**Prevention:** Always use `req.path` instead of `req.originalUrl` when determining whether a route should bypass authentication or authorization checks.

## 2024-10-24 - Command Injection via `exec` in NpmPackageService
**Vulnerability:** The `NpmPackageService` used `child_process.exec` to run `npm` and `du` commands. It concatenated user-supplied input (`packageName` and `version`) directly into the command string (e.g., `exec(\`npm view ${packageName} version\`)`). Even with format validation upstream, this practice is fundamentally flawed as it allows a potential attacker to append shell metacharacters and execute arbitrary code on the server if validation is ever bypassed or slightly inaccurate.
**Learning:** Shell evaluation (using `exec`) interprets metacharacters like `;`, `&`, `|`, etc., turning unescaped input into a CRITICAL command injection vulnerability. Always treat parameters dynamically injected into command strings with extreme caution.
**Prevention:** Never use `child_process.exec` with dynamic user input. Instead, use `child_process.execFile` or `child_process.spawn` without setting the `shell: true` option. This passes arguments directly to the executable without invoking a shell to parse them, effectively eliminating command injection.
