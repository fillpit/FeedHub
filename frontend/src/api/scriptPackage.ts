import request from '@/utils/request';

// 预览脚本包内容
export const previewPackage = (filePath: string) => {
  return request.get(`/api/script-package/preview?file=${encodeURIComponent(filePath)}`);
};

// 验证脚本包结构
export const validatePackage = (filePath: string) => {
  return request.get(`/api/script-package/validate?file=${encodeURIComponent(filePath)}`);
};

// 获取脚本包模板列表
export const getTemplates = () => {
  return request.get('/api/script-package/templates');
};

// 下载脚本包模板
export const downloadTemplate = (templateId: string) => {
  return request.get(`/api/script-package/templates/${templateId}/download`);
};

// 在线编辑功能
// 创建编辑会话
export const createEditSession = (filePath: string) => {
  return request.post('/api/script-package/edit-session', null, {
    params: { file: filePath }
  });
};

// 获取编辑会话文件列表
export const getEditSessionFiles = (sessionId: string) => {
  return request.get(`/api/script-package/edit-session/${sessionId}/files`);
};

// 获取编辑会话文件内容
export const getEditSessionFileContent = (sessionId: string, filePath: string) => {
  return request.get(`/api/script-package/edit-session/${sessionId}/file?filePath=${encodeURIComponent(filePath)}`);
};

// 保存编辑会话文件内容
export const saveEditSessionFileContent = (sessionId: string, filePath: string, content: string) => {
  return request.put(`/api/script-package/edit-session/${sessionId}/file`, {
    filePath,
    content
  });
};

// 关闭编辑会话
export const closeEditSession = (sessionId: string) => {
  return request.delete(`/api/script-package/edit-session/${sessionId}`);
};

// 导出编辑会话为脚本包
export const exportEditSession = (sessionId: string) => {
  return request.get(`/api/script-package/edit-session/${sessionId}/export`, {
    responseType: 'blob'
  });
};