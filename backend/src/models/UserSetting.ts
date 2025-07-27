import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface UserSettingAttributes {
  id: number;
  userId: string;
  cloud115Cookie: string;
  quarkCookie: string;
  username?: string;
  email?: string;
}

interface UserSettingCreationAttributes extends Optional<UserSettingAttributes, "id"> {}

class UserSetting extends Model<UserSettingAttributes, UserSettingCreationAttributes> implements UserSettingAttributes {
  public id!: number;
  public userId!: string;
  public cloud115Cookie!: string;
  public quarkCookie!: string;
  public username?: string;
  public email?: string;
}

UserSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'userId'
      }
    },
    cloud115Cookie: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    quarkCookie: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "",
    },
    username: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "UserSetting",
    tableName: "user_settings",
  }
);

export default UserSetting;