import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import User from "./User";

interface UserSettingAttributes {
  id: number;
  userId: string;
  cloud115UserId?: string;
  cloud115Cookie: string;
  quarkCookie: string;
}

interface UserSettingCreationAttributes extends Optional<UserSettingAttributes, "id"> {}

class UserSetting
  extends Model<UserSettingAttributes, UserSettingCreationAttributes>
  implements UserSettingAttributes
{
  public id!: number;
  public userId!: string;
  public cloud115UserId?: string;
  public cloud115Cookie!: string;
  public quarkCookie!: string;
}

UserSetting.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: User,
        key: "userId",
      },
      onDelete: "CASCADE",
    },
    cloud115UserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cloud115Cookie: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    quarkCookie: {
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

User.hasOne(UserSetting, {
  foreignKey: "userId",
  as: "settings",
});
UserSetting.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

export default UserSetting;
