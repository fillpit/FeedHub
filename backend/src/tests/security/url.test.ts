import { isSafeUrl } from "../../utils/security/url";
import { describe, test, expect } from "@jest/globals";

describe("URL Security Utilities", () => {
  describe("isSafeUrl", () => {
    test("allows safe HTTP and HTTPS URLs", () => {
      expect(isSafeUrl("http://example.com")).toBe(true);
      expect(isSafeUrl("https://example.com")).toBe(true);
      expect(isSafeUrl("https://google.com/search?q=test")).toBe(true);
      expect(isSafeUrl("http://8.8.8.8")).toBe(true); // Public IP
    });

    test("blocks non-HTTP(S) protocols", () => {
      expect(isSafeUrl("ftp://example.com")).toBe(false);
      expect(isSafeUrl("file:///etc/passwd")).toBe(false);
      expect(isSafeUrl("gopher://example.com")).toBe(false);
      expect(isSafeUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeUrl("data:text/html,<html>")).toBe(false);
    });

    test("blocks localhost and localdomain", () => {
      expect(isSafeUrl("http://localhost")).toBe(false);
      expect(isSafeUrl("http://localhost:8080")).toBe(false);
      expect(isSafeUrl("http://LOCALHOST")).toBe(false); // Case insensitive
      expect(isSafeUrl("http://localhost.localdomain")).toBe(false);
    });

    test("blocks restricted IP addresses", () => {
      // Loopback
      expect(isSafeUrl("http://127.0.0.1")).toBe(false);
      expect(isSafeUrl("http://127.0.1.1")).toBe(false);
      expect(isSafeUrl("http://127.123.123.123")).toBe(false);
      expect(isSafeUrl("http://[::1]")).toBe(false);
      expect(isSafeUrl("http://[0:0:0:0:0:0:0:1]")).toBe(false);

      // Private networks
      expect(isSafeUrl("http://10.0.0.1")).toBe(false);
      expect(isSafeUrl("http://10.255.255.255")).toBe(false);
      expect(isSafeUrl("http://172.16.0.1")).toBe(false);
      expect(isSafeUrl("http://172.31.255.255")).toBe(false);
      expect(isSafeUrl("http://192.168.0.1")).toBe(false);
      expect(isSafeUrl("http://192.168.255.255")).toBe(false);

      // Link-local
      expect(isSafeUrl("http://169.254.1.1")).toBe(false);
      expect(isSafeUrl("http://[fe80::1]")).toBe(false);

      // IPv4 mapped
      expect(isSafeUrl("http://[::ffff:127.0.0.1]")).toBe(false);
      expect(isSafeUrl("http://[::ffff:192.168.1.1]")).toBe(false);

      // Current network
      expect(isSafeUrl("http://0.0.0.0")).toBe(false);
    });

    test("blocks alternate IP representation bypasses", () => {
      // Decimal format
      expect(isSafeUrl("http://2130706433")).toBe(false); // 127.0.0.1
      expect(isSafeUrl("http://3232235777")).toBe(false); // 192.168.1.1

      // Octal format
      expect(isSafeUrl("http://0177.0.0.1")).toBe(false);

      // Hex format
      expect(isSafeUrl("http://0x7f000001")).toBe(false);

      // Shortened
      expect(isSafeUrl("http://127.1")).toBe(false);
      expect(isSafeUrl("http://0")).toBe(false);
    });

    test("blocks invalid URLs", () => {
      expect(isSafeUrl("not a url")).toBe(false);
      expect(isSafeUrl("http://")).toBe(false);
      expect(isSafeUrl("")).toBe(false);
    });
  });
});
