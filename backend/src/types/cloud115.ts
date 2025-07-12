export interface ShareInfo {
  fileId: string;
  fileName: string;
  fileSize: number;
}

export interface ShareInfoResponse {
  data?: ShareInfo[];
  message?: string;
}
