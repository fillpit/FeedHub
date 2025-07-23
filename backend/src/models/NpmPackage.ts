import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface NpmPackageAttributes {
  id: number;
  name: string; // 包名
  version: string; // 版本号
  description?: string; // 包描述
  status: 'installing' | 'installed' | 'failed' | 'uninstalling'; // 安装状态
  installPath?: string; // 安装路径
  size?: number; // 包大小（字节）
  dependencies?: string; // 依赖包列表（JSON字符串）
  installTime?: Date; // 安装时间
  lastUsed?: Date; // 最后使用时间
  usageCount: number; // 使用次数
  isWhitelisted: boolean; // 是否在白名单中
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NpmPackageCreationAttributes extends Optional<NpmPackageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class NpmPackage extends Model<NpmPackageAttributes, NpmPackageCreationAttributes> implements NpmPackageAttributes {
  public id!: number;
  public name!: string;
  public version!: string;
  public description?: string;
  public status!: 'installing' | 'installed' | 'failed' | 'uninstalling';
  public installPath?: string;
  public size?: number;
  public dependencies?: string;
  public installTime?: Date;
  public lastUsed?: Date;
  public usageCount!: number;
  public isWhitelisted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

NpmPackage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        // 验证npm包名格式
        is: /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
      }
    },
    version: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        // 验证语义化版本格式
        is: /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('installing', 'installed', 'failed', 'uninstalling'),
      allowNull: false,
      defaultValue: 'installing',
    },
    installPath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    dependencies: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string of package dependencies'
    },
    installTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastUsed: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    isWhitelisted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the package is in the security whitelist'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: "npm_packages",
    timestamps: true,
    indexes: [
      {
        fields: ['name']
      },
      {
        fields: ['status']
      },
      {
        fields: ['isWhitelisted']
      }
    ]
  }
);

export default NpmPackage;