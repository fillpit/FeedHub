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
## 2026-04-06 - Command Injection in execAsync
**Vulnerability:** The `NpmPackageService.ts` used `child_process.exec` with string interpolation (e.g. `exec(\"npm install \${packageName} \")`) which allowed potential command injection if package names were unsanitized, permitting attackers to execute arbitrary system commands by appending shell characters.
**Learning:** Never use `child_process.exec` with user-supplied arguments because it wraps the execution in a shell, making it susceptible to injection. When replacing with `child_process.execFile` on Windows, ensure that `{shell: true}` is combined with explicit un-interpolated arguments (via array) or utilize safe alternatives.
**Prevention:** Always spawn system processes using `execFile` or `spawn` with parameters isolated in argument arrays, avoiding direct string composition.

## 2026-04-06 - Safe execution of Windows .cmd files without shell injection
**Vulnerability:** The `safeExecAsync` function in `NpmPackageService.ts` used `execFile` but enabled `{ shell: true }` on Windows in order to execute `.cmd` scripts (like `npm.cmd`). Using `shell: true` completely bypasses safe argument escaping and reintroduces command injection vulnerabilities. However, simply removing `shell: true` breaks the application, because Node's `execFile` cannot natively spawn `.cmd` files on Windows without a shell.
**Learning:** Executing `.cmd` or `.bat` files safely on Windows via Node.js is surprisingly tricky. You cannot use `shell: false` natively with `execFile` or `spawn` for these file types. The accepted, safe, cross-platform solution is to use the `cross-spawn` library, which automatically handles the complex Windows shell argument escaping rules and allows spawning these files without falling victim to command injection.
**Prevention:** Never use `{ shell: true }` when spawning child processes with user input. When needing to execute cross-platform commands that resolve to `.cmd` or `.bat` on Windows (like `npm`), always use the `cross-spawn` library.
