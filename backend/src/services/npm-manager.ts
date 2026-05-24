import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { getDb } from "../db/schema";

const execAsync = promisify(exec);

const NPM_ENV_DIR = process.env.NPM_ENV_DIR
  || path.join(process.env.ELECTRON_USER_DATA || process.cwd(), "data", "npm_env");

export interface NpmPackage {
  id: number;
  name: string;
  version: string;
  status: "pending" | "installing" | "installed" | "error";
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class NpmManager {
  private static instance: NpmManager;
  private isInitializing = false;

  private constructor() {
    this.ensureEnvDir();
  }

  public static getInstance(): NpmManager {
    if (!NpmManager.instance) {
      NpmManager.instance = new NpmManager();
    }
    return NpmManager.instance;
  }

  private ensureEnvDir() {
    if (!fs.existsSync(NPM_ENV_DIR)) {
      fs.mkdirSync(NPM_ENV_DIR, { recursive: true });
    }
    const pkgPath = path.join(NPM_ENV_DIR, "package.json");
    if (!fs.existsSync(pkgPath)) {
      fs.writeFileSync(pkgPath, JSON.stringify({
        name: "feed-hub-npm-env",
        version: "1.0.0",
        private: true,
        dependencies: {},
      }, null, 2));
    }
  }

  public async getInstalledPackages(): Promise<NpmPackage[]> {
    const db = getDb();
    return db.prepare("SELECT * FROM npm_packages ORDER BY name ASC").all() as NpmPackage[];
  }

  public async addPackage(name: string, version: string = "latest"): Promise<void> {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM npm_packages WHERE name = ?").get(name) as NpmPackage | undefined;

    if (existing) {
      if (existing.status === "installed" && existing.version === version) {
        return;
      }
      db.prepare("UPDATE npm_packages SET version = ?, status = 'pending', error = NULL, updatedAt = datetime('now') WHERE name = ?")
        .run(version, name);
    } else {
      db.prepare("INSERT INTO npm_packages (name, version, status) VALUES (?, ?, 'pending')")
        .run(name, version);
    }

    // Start installation in background
    this.installPackages();
  }

  public async retryPackage(name: string): Promise<void> {
    const db = getDb();
    const existing = db.prepare("SELECT * FROM npm_packages WHERE name = ?").get(name) as NpmPackage | undefined;
    if (!existing) {
      throw new Error(`找不到软件包: ${name}`);
    }

    db.prepare("UPDATE npm_packages SET status = 'pending', error = NULL, updatedAt = datetime('now') WHERE name = ?")
      .run(name);

    this.installPackages();
  }

  public async removePackage(name: string): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM npm_packages WHERE name = ?").run(name);

    try {
      await execAsync(`pnpm remove ${name}`, { cwd: NPM_ENV_DIR });
    } catch (error) {
      console.error(`Failed to remove npm package ${name}:`, error);
    }
  }

  public async installPackages(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    const db = getDb();
    const pending = db.prepare("SELECT * FROM npm_packages WHERE status = 'pending' OR status = 'error'").all() as NpmPackage[];

    for (const pkg of pending) {
      try {
        db.prepare("UPDATE npm_packages SET status = 'installing', updatedAt = datetime('now') WHERE id = ?").run(pkg.id);
        
        const installTarget = `${pkg.name}@${pkg.version}`;
        console.log(`Installing npm package: ${installTarget}`);
        
        await execAsync(`pnpm add ${installTarget}`, { cwd: NPM_ENV_DIR });

        db.prepare("UPDATE npm_packages SET status = 'installed', error = NULL, updatedAt = datetime('now') WHERE id = ?").run(pkg.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to install npm package ${pkg.name}:`, message);
        db.prepare("UPDATE npm_packages SET status = 'error', error = ?, updatedAt = datetime('now') WHERE id = ?").run(message, pkg.id);
      }
    }

    this.isInitializing = false;
  }

  public getNpmEnvDir(): string {
    return NPM_ENV_DIR;
  }
}

export const npmManager = NpmManager.getInstance();
