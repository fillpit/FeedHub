import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

// 脚本来源类型
export type ScriptSourceType = "inline" | "url" | "file";

// 脚本配置接口
export interface CustomRouteScript {
  sourceType: ScriptSourceType; // 脚本来源类型：inline(内联代码), url(远程URL), file(上传文件)
  content: string; // 脚本内容或URL
  timeout?: number; // 脚本执行超时时间（毫秒）
}

// 路由参数配置
export interface RouteParam {
  name: string; // 参数名称
  type: "string" | "number" | "boolean"; // 参数类型
  required: boolean; // 是否必须
  default?: string | number | boolean; // 默认值
  description?: string; // 参数描述
}

export interface CustomRouteConfigAttributes {
  id: number;
  name: string; // 路由名称
  path: string; // 路由路径，例如 /custom/my-route
  method: "GET" | "POST"; // HTTP方法
  params: RouteParam[]; // 路由参数配置
  script: CustomRouteScript; // 脚本配置
  description: string; // 路由描述
  createdAt: Date;
  updatedAt: Date;
}

interface CustomRouteConfigCreationAttributes extends Optional<CustomRouteConfigAttributes, "id" | "createdAt" | "updatedAt"> {}

class CustomRouteConfig
  extends Model<CustomRouteConfigAttributes, CustomRouteConfigCreationAttributes>
  implements CustomRouteConfigAttributes
{
  public id!: number;
  public name!: string;
  public path!: string;
  public method!: "GET" | "POST";
  public params!: RouteParam[];
  public script!: CustomRouteScript;
  public description!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CustomRouteConfig.init(
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

export default CustomRouteConfig;