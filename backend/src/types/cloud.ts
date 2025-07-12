export interface ShareInfoResponse {
  data: {
    list: ShareInfoItem[];
    fileSize?: number;
    pwdId?: string;
    stoken?: string;
  };
}

export interface GetShareInfoParams {
  shareCode: string;
  receiveCode?: string;
}

export interface ShareInfoItem {
  fileId: string;
  fileName: string;
  fileSize?: number;
  fileIdToken?: string;
}
export interface FolderListResponse {
  data: {
    cid: string;
    name: string;
    path: { cid: string; name: string }[];
  }[];
}

export interface SaveFileParams {
  shareCode: string; // 分享code
  receiveCode?: string; // 分享文件的密码
  folderId?: string; // 文件夹id
  fids?: string[]; // 存储文件id
  fidTokens?: string[]; // 存储文件token
}

export interface SaveFileResponse {
  message: string;
  data: unknown;
}

export interface ShareFileInfo {
  shareCode: string;
  receiveCode?: string;
  fileId: string;
  cid?: string;
  fid_list?: string[];
  fid_token_list?: string[];
  to_pdir_fid?: string;
  pwd_id?: string;
  stoken?: string;
  pdir_fid?: string;
  scene?: string;
  [key: string]: any;
}

export interface QuarkShareFileInfo {
  fid_list: string[];
  fid_token_list: string[];
  to_pdir_fid: string;
  pwd_id: string;
  stoken: string;
  pdir_fid: string;
  scene: string;
}

export interface QuarkShareInfo {
  stoken?: string;
  pwdId?: string;
  fileSize?: number;
  list: {
    fid: string;
    file_name: string;
    file_type: number;
    share_fid_token: string;
  }[];
}

export interface QuarkFolderItem {
  fid: string;
  file_name: string;
  file_type: number;
}
