import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface GlobalSettingAttributes {
  id: number;
  httpProxyHost: string;
  httpProxyPort: number;
  isProxyEnabled: boolean;
  // OPDS 设置
  opdsEnabled?: boolean;
  opdsServerUrl?: string;
  opdsUsername?: string;
  opdsPassword?: string;
}

interface GlobalSettingCreationAttributes extends Optional<GlobalSettingAttributes, "id"> {}

class GlobalSetting
  extends Model<GlobalSettingAttributes, GlobalSettingCreationAttributes>
  implements GlobalSettingAttributes
{
  public id!: number;
  public httpProxyHost!: string;
  public httpProxyPort!: number;
  public isProxyEnabled!: boolean;
  // OPDS 设置
  public opdsEnabled?: boolean;
  public opdsServerUrl?: string;
  public opdsUsername?: string;
  public opdsPassword?: string;
}

GlobalSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    httpProxyHost: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "127.0.0.1",
    },
    httpProxyPort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 7890,
    },
    isProxyEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    // OPDS 设置
    opdsEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    opdsServerUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    opdsUsername: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    },
    opdsPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "",
    }
  },
  {
    sequelize,
    modelName: "GlobalSetting",
    tableName: "global_settings",
  }
);

export default GlobalSetting;
