import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { ElMessage } from "element-plus";
import { RequestResult } from "../types/response";
import { STORAGE_KEYS } from "@/constants/storage";

const errorMessage = (message: string) => {
  ElMessage.error(message);
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  timeout: 16000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

function isLoginAndRedirect(url: string) {
  return url.includes("/api/user/login") || url.includes("/api/user/register");
}

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (!isLoginAndRedirect(config.url || "")) {
      errorMessage("请先登录");
      window.location.href = "/login";
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data;
    
    if (!res.success) {
      errorMessage(res.message);
      return Promise.reject(new Error(res.message));
    }
    return res;
  },
  (error) => {
    if (error.response.status === 401) {
      errorMessage("登录过期，请重新登录");
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = "/login";
      return Promise.reject(new Error("登录过期，请重新登录"));
    }
    errorMessage(error.response.statusText);
    return Promise.reject(new Error(error.response.statusText));
  }
);

const request = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<RequestResult<T>> => {
    return axiosInstance.get(url, { ...config });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T, D = any>(
    url: string,
    data: D,
    config?: AxiosRequestConfig
  ): Promise<RequestResult<T>> => {
    return axiosInstance.post(url, data, { ...config });
  },
  put: <T, D = any>(
    url: string,
    data: D,
    config?: AxiosRequestConfig
  ): Promise<RequestResult<T>> => {
    return axiosInstance.put(url, data, { ...config });
  },
  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<RequestResult<T>> => {
    return axiosInstance.delete(url, { ...config });
  },
};

export default request;
