import request from "@/utils/request";

export const userApi = {
  login: (data: { username: string; password: string }) => {
    return request.post<{ token: string }>("/api/user/login", data, { showSuccessMessage: true, successMessage: '登录成功！' });
  },
  register: (data: { username: string; password: string; registerCode: string }) => {
    return request.post<{ token: string }>("/api/user/register", data, { showSuccessMessage: true, successMessage: '注册成功！' });
  },
  getSponsors: () => {
    return request.get("/api/sponsors?timestamp=" + Date.now());
  },
};
