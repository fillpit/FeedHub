import { Request } from "express";
import { ShareInfoResponse, FolderListResponse, SaveFileParams } from "./cloud";

export interface ICloudStorageService {
  setCookie(req: Request): Promise<void>;
  getShareInfo(shareCode: string, receiveCode?: string): Promise<ShareInfoResponse>;
  getFolderList(parentCid?: string): Promise<FolderListResponse>;
  saveSharedFile(params: SaveFileParams): Promise<any>;
}

export interface AuthCredential {
  id?: number;
  name: string;
  authType: "cookie" | "bearer" | "basic" | "custom";
  cookie?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  customHeaders?: Record<string, string>;
  remark?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WebsiteRssConfig {
  id: number;
  key: string;
  title: string;
  url: string;
  fetchMode: "selector" | "script";
  selector: any;
  script: any;
  auth: any;
  authCredentialId?: number;
  lastContent: string;
  lastFetchTime: Date;
  fetchInterval: number;
  rssDescription: string;
  favicon: string;
}
