import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { DynamicRouteConfigAttributes, RouteParam, CustomRouteScript } from "@feedhub/shared";

// 重新导出共享类型以保持向后兼容
export {
  DynamicRouteConfigAttributes,
  RouteParam,
  CustomRouteScript,
  ScriptSourceType,
} from "@feedhub/shared";

interface DynamicRouteConfigCreationAttributes
  extends Optional<DynamicRouteConfigAttributes, "id" | "createdAt" | "updatedAt"> {}

class DynamicRouteConfig
  extends Model<DynamicRouteConfigAttributes, DynamicRouteConfigCreationAttributes>
  implements DynamicRouteConfigAttributes
{
  public id!: number;
  public name!: string;
  public path!: string;
  public method!: "GET" | "POST";
  public params!: RouteParam[];
  public script!: CustomRouteScript;
  public description!: string;
  public refreshInterval!: number;
  public authCredentialId?: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

DynamicRouteConfig.init(
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
    path: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    method: {
      type: DataTypes.ENUM("GET", "POST"),
      allowNull: false,
      defaultValue: "GET",
    },
    params: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    script: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refreshInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60, // 默认60分钟
    },
    authCredentialId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "auth_credentials",
        key: "id",
      },
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
    tableName: "custom_route_configs",
    timestamps: true,
  }
);

export default DynamicRouteConfig;
