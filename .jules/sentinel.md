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
## 2024-05-18 - [CRITICAL] Fix command injection vulnerability in NpmPackageService

**Vulnerability:** Found uses of `child_process.exec` using string interpolation (`exec(`npm view ${packageName} version`)`) in `backend/src/services/NpmPackageService.ts` to execute npm packages, which introduces a critical command injection vulnerability allowing malicious packages to execute arbitrary shell commands.
**Learning:** `child_process.execFile` natively resolves argument arrays and bypasses shell-related injection issues. However, `.cmd` executables (like `npm.cmd` on Windows) cannot be spawned without a shell natively in Node.js, introducing cross-platform challenges. Adding `{ shell: true }` defeats the security purpose. We must explicitly invoke `cmd.exe /c` with the command arguments to match native Windows shell handling without compromising structured arguments.
**Prevention:** Strictly enforce `child_process.execFile` to execute external commands. For `.cmd`/`.bat` execution on Windows, strictly use `process.platform === 'win32' ? execFileAsync('cmd.exe', ['/c', 'npm', ...args]) : execFileAsync('npm', args)`.
