import request from "@/utils/request";

export const userApi = {
  login: (data: { username: string; password: string }) => {
    return request.post<{ token: string }>("/api/user/login", data);
  },
  register: (data: { username: string; password: string; registerCode: string }) => {
    return request.post<{ token: string }>("/api/user/register", data);
  },
  getSponsors: () => {
    return request.get("/api/sponsors?timestamp=" + Date.now());
  },
};
