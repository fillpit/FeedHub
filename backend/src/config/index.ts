import dotenv from "dotenv";

// 加载.env文件
dotenv.config();

interface Channel {
  id: string;
  name: string;
}


interface Config {
  jwtSecret: string;
  app: {
    port: number;
    env: string;
  };
  database: {
    type: string;
    path: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

// 从环境变量读取频道配置
const getTeleChannels = (): Channel[] => {
  try {
    const channelsStr = process.env.TELE_CHANNELS;
    if (channelsStr) {
      return JSON.parse(channelsStr);
    }
  } catch (error) {
    console.warn("无法解析 TELE_CHANNELS 环境变量，使用默认配置");
  }

  // 默认配置
  return [];
};

export const config: Config = {
  app: {
    port: parseInt(process.env.PORT || "8009"),
    env: process.env.NODE_ENV || "development",
  },
  database: {
    type: "sqlite",
    path: "./data/database.sqlite",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "your-secret-key",
    expiresIn: "6h",
  },
  jwtSecret: process.env.JWT_SECRET || "your-jwt-secret",
};
