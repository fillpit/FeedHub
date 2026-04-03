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

## 2024-05-24 - Command Injection via `child_process.exec`
**Vulnerability:** In `NpmPackageService.ts`, system commands like `npm install`, `npm uninstall`, and `du -sb` were being constructed using string interpolation with unsanitized user inputs (`packageName`, `version`) and executed using `child_process.exec()`. This could allow an attacker to inject arbitrary shell commands.
**Learning:** Passing concatenated strings to `exec()` invokes a subshell, exposing the application to command injection vulnerabilities if user input is not strictly validated and sanitized. The Node.js documentation warns against this practice for untrusted input.
**Prevention:** Always use `child_process.execFile()` instead of `exec()` when executing external commands. Pass arguments as a distinct array rather than appending them to a command string. This avoids invoking a shell and ensures arguments are safely passed to the executable.
