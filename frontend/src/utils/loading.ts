import { ElLoading } from 'element-plus';
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading';

// 加载状态管理类
class LoadingManager {
  private loadingInstance: LoadingInstance | null = null;
  private loadingCount = 0;
  private loadingStates = new Map<string, boolean>();

  // 显示全局加载
  showGlobal(text: string = '加载中...', background: string = 'rgba(0, 0, 0, 0.7)') {
    if (this.loadingInstance) {
      return;
    }

    this.loadingInstance = ElLoading.service({
      lock: true,
      text,
      background,
      spinner: 'el-icon-loading',
      customClass: 'global-loading'
    });
  }

  // 隐藏全局加载
  hideGlobal() {
    if (this.loadingInstance) {
      this.loadingInstance.close();
      this.loadingInstance = null;
    }
  }

  // 增加加载计数
  increment() {
    this.loadingCount++;
    if (this.loadingCount === 1) {
      this.showGlobal();
    }
  }

  // 减少加载计数
  decrement() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
    if (this.loadingCount === 0) {
      this.hideGlobal();
    }
  }

  // 设置特定组件的加载状态
  setComponentLoading(componentId: string, loading: boolean) {
    this.loadingStates.set(componentId, loading);
  }

  // 获取特定组件的加载状态
  getComponentLoading(componentId: string): boolean {
    return this.loadingStates.get(componentId) || false;
  }

  // 清除所有加载状态
  clear() {
    this.hideGlobal();
    this.loadingCount = 0;
    this.loadingStates.clear();
  }

  // 获取当前是否有任何加载状态
  get isLoading(): boolean {
    return this.loadingCount > 0 || Array.from(this.loadingStates.values()).some(Boolean);
  }
}

// 创建全局实例
const loadingManager = new LoadingManager();

// 加载装饰器函数
export const withLoading = async <T>(
  asyncFn: () => Promise<T>,
  options?: {
    showGlobal?: boolean;
    text?: string;
    componentId?: string;
  }
): Promise<T> => {
  const { showGlobal = true, text = '加载中...', componentId } = options || {};

  try {
    if (showGlobal) {
      loadingManager.increment();
    }
    
    if (componentId) {
      loadingManager.setComponentLoading(componentId, true);
    }

    const result = await asyncFn();
    return result;
  } finally {
    if (showGlobal) {
      loadingManager.decrement();
    }
    
    if (componentId) {
      loadingManager.setComponentLoading(componentId, false);
    }
  }
};

// 骨架屏配置
export interface SkeletonConfig {
  rows?: number;
  animated?: boolean;
  avatar?: boolean;
  avatarSize?: 'large' | 'default' | 'small';
  title?: boolean;
  loading?: boolean;
}

// 默认骨架屏配置
export const defaultSkeletonConfig: SkeletonConfig = {
  rows: 3,
  animated: true,
  avatar: false,
  title: true,
  loading: true
};

// 预定义的骨架屏配置
export const skeletonPresets = {
  // 列表项骨架屏
  listItem: {
    rows: 2,
    animated: true,
    avatar: true,
    avatarSize: 'default' as const,
    title: true
  },
  // 卡片骨架屏
  card: {
    rows: 4,
    animated: true,
    avatar: false,
    title: true
  },
  // 表格骨架屏
  table: {
    rows: 5,
    animated: true,
    avatar: false,
    title: false
  },
  // 表单骨架屏
  form: {
    rows: 6,
    animated: true,
    avatar: false,
    title: true
  }
};

// 延迟加载工具
export const delayedLoading = {
  // 延迟显示加载状态（避免闪烁）
  show: (delay: number = 200): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        loadingManager.increment();
        resolve();
      }, delay);
    });
  },
  
  // 最小显示时间（确保用户能看到加载状态）
  withMinDuration: async <T>(
    asyncFn: () => Promise<T>,
    minDuration: number = 500
  ): Promise<T> => {
    const startTime = Date.now();
    loadingManager.increment();
    
    try {
      const result = await asyncFn();
      const elapsed = Date.now() - startTime;
      
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }
      
      return result;
    } finally {
      loadingManager.decrement();
    }
  }
};

// 导出加载管理器和工具函数
export { loadingManager };
export default loadingManager;

// Vue 3 Composition API 支持
import { ref, computed } from 'vue';

export const useLoading = (componentId?: string) => {
  const localLoading = ref(false);
  
  const isLoading = computed(() => {
    if (componentId) {
      return loadingManager.getComponentLoading(componentId) || localLoading.value;
    }
    return localLoading.value;
  });
  
  const setLoading = (loading: boolean) => {
    if (componentId) {
      loadingManager.setComponentLoading(componentId, loading);
    } else {
      localLoading.value = loading;
    }
  };
  
  const withLocalLoading = async <T>(asyncFn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await asyncFn();
    } finally {
      setLoading(false);
    }
  };
  
  return {
    isLoading,
    setLoading,
    withLoading: withLocalLoading
  };
};

// 全局加载状态的响应式引用
export const useGlobalLoading = () => {
  const isGlobalLoading = computed(() => loadingManager.isLoading);
  
  return {
    isGlobalLoading,
    showGlobalLoading: (text?: string) => loadingManager.showGlobal(text),
    hideGlobalLoading: () => loadingManager.hideGlobal(),
    withGlobalLoading: (asyncFn: () => Promise<any>) => withLoading(asyncFn)
  };
};