import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { localStorage as typedLocalStorage } from "@/utils/storage";

// 用户信息接口
interface UserInfo {
  id: number;
  userId: string;
  username: string;
  role: number;
  avatar?: string; // 用户头像URL
}

export const useAuthStore = defineStore("auth", () => {
  // 状态
  const token = ref<string | null>(typedLocalStorage.getToken() || null);
  const user = ref<UserInfo | null>(null);

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.role === 1);
  const userAvatar = computed(() => {
    // 如果用户有自定义头像，使用自定义头像
    if (user.value?.avatar) {
      return user.value.avatar;
    }
    // 否则生成默认头像（基于用户名的首字母）
    if (user.value?.username) {
      return generateDefaultAvatar(user.value.username);
    }
    return null;
  });

  // 生成默认头像
  function generateDefaultAvatar(username: string): string {
    const firstChar = username.charAt(0).toUpperCase();
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const colorIndex = username.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];
    
    // 返回SVG格式的头像
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="20" fill="${bgColor}"/>
        <text x="20" y="28" font-family="Arial, sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="white">
          ${firstChar}
        </text>
      </svg>
    `)}`;
  }

  // 设置认证信息
  function setAuth(authToken: string, userInfo: UserInfo) {
    token.value = authToken;
    user.value = userInfo;
    
    // 保存到本地存储
    typedLocalStorage.setToken(authToken);
    typedLocalStorage.setUserInfo(userInfo);
  }

  // 清除认证信息
  function clearAuth() {
    token.value = null;
    user.value = null;
    
    // 清除本地存储
    typedLocalStorage.clearToken();
    typedLocalStorage.clearUserInfo();
  }

  // 从token解析用户信息
  function parseTokenUser(authToken: string): UserInfo | null {
    try {
      // 注意：这里只是解析token中的基本信息，实际项目中应该调用API获取完整用户信息
      const decoded: any = JSON.parse(atob(authToken.split('.')[1]));
      if (decoded && decoded.userId) {
        return {
          id: 0, // 临时ID，应该从API获取
          userId: decoded.userId,
          username: decoded.username || 'User', // 如果token中没有用户名，使用默认值
          role: decoded.role || 0,
        };
      }
      return null;
    } catch (error) {
      console.error('解析token失败:', error);
      return null;
    }
  }

  // 初始化认证状态
  function initAuth() {
    const savedToken = typedLocalStorage.getToken();
    const savedUser = typedLocalStorage.getUserInfo();
    
    if (savedToken && savedUser) {
      token.value = savedToken;
      user.value = savedUser as UserInfo;
    } else if (savedToken) {
      // 如果只有token没有用户信息，尝试从token解析
      const parsedUser = parseTokenUser(savedToken);
      if (parsedUser) {
        user.value = parsedUser;
        typedLocalStorage.setUserInfo(parsedUser);
      } else {
        // token无效，清除
        clearAuth();
      }
    }
  }

  // 更新用户信息
  function updateUser(userInfo: Partial<UserInfo>) {
    if (user.value) {
      user.value = { ...user.value, ...userInfo };
      typedLocalStorage.setUserInfo(user.value);
    }
  }

  // 登出
  function logout() {
    clearAuth();
    // 跳转到登录页
    window.location.href = '/login';
  }

  return {
    // 状态
    token,
    user,
    
    // 计算属性
    isLoggedIn,
    isAdmin,
    userAvatar,
    
    // 方法
    setAuth,
    clearAuth,
    initAuth,
    updateUser,
    logout,
  };
});