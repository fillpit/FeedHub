import request from '@/utils/request';

/**
 * 导出分享配置
 */
const exportShareConfig = () => {
  return request.get<Blob>('/backup/export-share', {
    responseType: 'blob' as any
  });
};

/**
 * 导入分享配置
 */
const importShareConfig = (configData: any) => {
  return request.post('/backup/import-share', configData, {
    showSuccessMessage: true,
    successMessage: '分享配置导入成功！'
  });
};

export const backupApi = {
  /**
   * 导出数据备份
   */
  exportBackup: () => {
    return request.get<Blob>('/api/backup/export', {
      responseType: 'blob' as any // 设置响应类型为blob以处理文件下载
    });
  },

  /**
   * 导入数据备份
   * @param backupData 备份数据
   */
  importBackup: (backupData: any) => {
    return request.post('/api/backup/import', backupData, {
      showSuccessMessage: true,
      successMessage: '数据恢复成功！'
    });
  },
  
  exportShareConfig,
  importShareConfig
};

/**
 * 下载备份文件
 * @param data blob数据
 * @param filename 文件名
 */
export function downloadBackupFile(data: Blob, filename?: string) {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  
  // 如果没有提供文件名，生成一个默认的
  if (!filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    filename = `feedhub-backup-${timestamp}.json`;
  }
  
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 读取上传的备份文件
 * @param file 文件对象
 * @returns Promise<any> 解析后的JSON数据
 */
export function readBackupFile(file: File): Promise<any> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result);
        resolve(data);
      } catch (error) {
        reject(new Error('备份文件格式无效'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file);
  });
}