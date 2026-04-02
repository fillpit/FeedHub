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

## 2024-05-25 - [Command Injection via Type Confusion in NpmPackageController]
**Vulnerability:** A command injection vulnerability existed in `NpmPackageController.installPackage` because the `version` property from `req.body` was only validated using regex if its `typeof` was `"string"`. By providing an array instead of a string (e.g., `["1.0.0; touch /tmp/pwned"]`), an attacker could bypass the validation. This unvalidated array was then passed to `child_process.exec` where string interpolation resulted in arbitrary command execution.
**Learning:** Checking for truthiness and string type via `if (version && typeof version === "string")` before applying regex validation fails securely if the variable is used later without verifying its type. A truthy non-string input (like an array) bypasses the block and allows unexpected types to flow into sensitive sinks like `exec`.
**Prevention:** Explicitly enforce expected types on user input before processing. If an input must be a string and is provided, throw an error if `typeof input !== "string"` rather than silently bypassing validation. Use safer alternatives to `exec` such as `execFile` or `spawn` that don't invoke a shell by default.
