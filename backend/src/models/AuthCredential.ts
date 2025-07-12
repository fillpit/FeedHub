import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface AuthCredentialAttributes {
  id: number;
  name: string;
  authType: "cookie" | "bearer" | "basic" | "custom";
  cookie?: string;
  bearerToken?: string;
  username?: string;
  password?: string;
  customHeaders?: object;
  remark?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthCredentialCreationAttributes extends Optional<AuthCredentialAttributes, "id" | "createdAt" | "updatedAt"> {}

class AuthCredential extends Model<AuthCredentialAttributes, AuthCredentialCreationAttributes> implements AuthCredentialAttributes {
  public id!: number;
  public name!: string;
  public authType!: "cookie" | "bearer" | "basic" | "custom";
  public cookie?: string;
  public bearerToken?: string;
  public username?: string;
  public password?: string;
  public customHeaders?: object;
  public remark?: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

AuthCredential.init(
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
    authType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cookie: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bearerToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customHeaders: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    remark: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "AuthCredential",
    tableName: "auth_credentials",
  }
);

export default AuthCredential; 