import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  OpdsConfig as OpdsConfigInterface,
} from '@feedhub/shared/src/types/bookRss';

// Sequelize 模型创建属性接口
interface OpdsConfigCreationAttributes
  extends Optional<OpdsConfigInterface, "id" | "createdAt" | "updatedAt"> {}

class OpdsConfig
  extends Model<OpdsConfigInterface, OpdsConfigCreationAttributes>
  implements OpdsConfigInterface
{
  public id!: number;
  public name!: string;
  public url!: string;
  public username?: string;
  public password?: string;
  public authType!: 'none' | 'basic' | 'bearer';
  public bearerToken?: string;
  public enabled!: boolean;
  public readonly createdAt!: Date | string;
  public readonly updatedAt!: Date | string;
}

OpdsConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    authType: {
      type: DataTypes.ENUM('none', 'basic', 'bearer'),
      allowNull: false,
      defaultValue: 'none',
    },
    bearerToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "OpdsConfig",
    tableName: "opds_configs",
    timestamps: true,
  }
);

export default OpdsConfig;
export { OpdsConfigInterface as OpdsConfigAttributes, OpdsConfigCreationAttributes };