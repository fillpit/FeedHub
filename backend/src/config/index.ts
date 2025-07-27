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

// 验证JWT密钥强度
const validateJwtSecret = (secret: string): void => {
  if (
    config.app.env === "production" &&
    (secret === "your-secret-key" || secret === "your-jwt-secret" || secret.length < 32)
  ) {
    throw new Error("生产环境必须设置强JWT密钥（至少32位字符）");
  }
};

// 生成默认强密钥（仅用于开发环境）
const getDefaultJwtSecret = (): string => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须设置JWT_SECRET环境变量");
  }
  return "dev-jwt-secret-key-for-development-only-32chars";
};

const jwtSecret = process.env.JWT_SECRET || getDefaultJwtSecret();

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
    secret: jwtSecret,
    expiresIn: "2h", // 缩短token有效期
  },
  jwtSecret: jwtSecret,
};

// 验证配置
validateJwtSecret(jwtSecret);
