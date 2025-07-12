declare global {
  interface Location {
    // 根据你的需求定义 location 的属性和方法
    pathname: string;
    search: string;
    hash: string;
    host: string;
    // 其他属性和方法...
  }
  interface Window {
    location: Location;
  }
}

export {};
