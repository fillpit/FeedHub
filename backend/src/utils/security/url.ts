import * as url from "url";
import * as net from "net";

/**
 * Checks if an IP address is a private, loopback, or otherwise restricted IP address.
 */
function isRestrictedIP(ip: string): boolean {
  if (!net.isIP(ip)) {
    return false;
  }

  // IPv4 loopback
  if (/^127\./.test(ip)) return true;
  // IPv4 private networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (/^10\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  // IPv4 link-local (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;
  // IPv4 current network
  if (ip === "0.0.0.0") return true;

  // IPv6 loopback
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return true;
  // IPv6 unique local address
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true;
  // IPv6 link-local
  if (/^fe80:/i.test(ip)) return true;
  // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  const lowerIp = ip.toLowerCase();
  if (lowerIp.startsWith("::ffff:")) {
    const v4Part = lowerIp.substring(7);

    // Sometimes url.URL converts ::ffff:127.0.0.1 to ::ffff:7f00:1
    // 10.x.x.x starts with a
    // 172.16-31.x.x starts with ac10 to ac1f
    // 192.168.x.x starts with c0a8
    // 169.254.x.x starts with a9fe
    if (
      v4Part === "7f00:1" ||
      v4Part === "7f00:0:1" ||
      v4Part.startsWith("a:") ||
      /^ac1[0-f]:/.test(v4Part) ||
      v4Part.startsWith("c0a8:") ||
      v4Part.startsWith("a9fe:")
    ) {
      return true;
    }

    if (net.isIP(v4Part) === 4) {
      // Create a copy of the check logic for v4 to avoid recursion passing invalid IP format to net.isIP
      if (/^127\./.test(v4Part)) return true;
      if (/^10\./.test(v4Part)) return true;
      if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(v4Part)) return true;
      if (/^192\.168\./.test(v4Part)) return true;
      if (/^169\.254\./.test(v4Part)) return true;
      if (v4Part === "0.0.0.0") return true;
    }
  }

  return false;
}

/**
 * Validates a URL to prevent Server-Side Request Forgery (SSRF) vulnerabilities.
 * Checks that the URL has a safe protocol and its hostname does not resolve to a local/private IP.
 * @param urlString The URL to validate.
 * @returns True if the URL is safe, false otherwise.
 */
export function isSafeUrl(urlString: string): boolean {
  try {
    const parsedUrl = new url.URL(urlString);

    // Only allow HTTP and HTTPS
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Prevent direct localhost resolution
    if (hostname === "localhost" || hostname === "localhost.localdomain") {
      return false;
    }

    // Clean up hostname if it contains brackets for IPv6
    const cleanHostname =
      hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;

    // Check if hostname is an IP address using ipaddr.js for comprehensive support
    try {
      // Use ipaddr.js to catch alternate IP formats (e.g. 0x7f000001, 2130706433, 127.1)
      const ipaddr = require("ipaddr.js");
      const parsedIP = ipaddr.process(cleanHostname);
      // Determine if it is in a restricted range
      const range = parsedIP.range();
      if (
        range === "loopback" ||
        range === "private" ||
        range === "uniqueLocal" ||
        range === "linkLocal" ||
        range === "unspecified"
      ) {
        return false;
      }

      // If we parsed an IPv6 IPv4-mapped address, check its nested v4
      if (parsedIP.kind() === "ipv6" && parsedIP.isIPv4MappedAddress()) {
        const v4 = parsedIP.toIPv4Address();
        const v4range = v4.range();
        if (
          v4range === "loopback" ||
          v4range === "private" ||
          v4range === "linkLocal" ||
          v4range === "unspecified"
        ) {
          return false;
        }
      }
    } catch (e) {
      // It's not a valid IP string format according to ipaddr.js
      // Just fallback to the traditional method as a secondary layer
      if (net.isIP(cleanHostname) && isRestrictedIP(cleanHostname)) {
        return false;
      }
    }

    // TODO: In a more robust system, we would resolve the DNS of the hostname
    // to ensure it doesn't resolve to a private IP (e.g., localtest.me -> 127.0.0.1).
    // For now, this mitigates direct IP SSRF.

    return true;
  } catch (error) {
    // If it can't be parsed as a valid URL, it's unsafe.
    return false;
  }
}
