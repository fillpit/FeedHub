import path from "path";
import { safeResolvePath } from "../../utils/security/path";
import { describe, test, expect } from '@jest/globals';

describe("Security Path Utils", () => {
  const baseDir = path.resolve("/tmp/uploads");

  test("should resolve safe path", () => {
    const filename = "test.txt";
    const result = safeResolvePath(baseDir, filename);
    expect(result).toBe(path.join(baseDir, filename));
  });

  test("should throw error for path traversal", () => {
    const filename = "../secret.txt";
    expect(() => safeResolvePath(baseDir, filename)).toThrow("非法的文件路径访问");
  });

  test("should throw error for complex path traversal", () => {
    const filename = "subdir/../../secret.txt";
    expect(() => safeResolvePath(baseDir, filename)).toThrow("非法的文件路径访问");
  });

  test("should allow safe subdirectory access if intended", () => {
      const filename = "subdir/test.txt";
      const result = safeResolvePath(baseDir, filename);
      expect(result).toBe(path.join(baseDir, "subdir/test.txt"));
  });
});
