import request from "@/utils/request";

// 用户信息接口
interface UserInfo {
  id: number;
  userId: string;
  username: string;
  role: number;
}

// 登录响应接口
interface LoginResponse {
  token: string;
  user: UserInfo;
}

export const userApi = {
  login: (data: { username: string; password: string }) => {
    return request.post<LoginResponse>("/api/user/login", data, {
      showSuccessMessage: true,
      successMessage: "登录成功！",
    });
  },
  register: (data: { username: string; password: string; registerCode: string }) => {
    return request.post<{ token: string }>("/api/user/register", data, {
      showSuccessMessage: true,
      successMessage: "注册成功！",
    });
  },
  getSponsors: () => {
    return request.get("/api/sponsors?timestamp=" + Date.now());
  },
  changePassword: (data: { currentPassword: string; newPassword: string }) => {
    return request.post("/api/user/change-password", data, {
      showSuccessMessage: true,
      successMessage: "密码修改成功",
    });
  },
};
