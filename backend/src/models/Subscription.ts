import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  Subscription as SubscriptionInterface,
} from '@feedhub/shared/src/types/bookRss';
import Book from './Book';

// Sequelize 模型创建属性接口
interface SubscriptionCreationAttributes
  extends Optional<SubscriptionInterface, "id" | "createdAt" | "updatedAt" | "accessCount" | "lastAccessTime"> {}

class Subscription
  extends Model<SubscriptionInterface, SubscriptionCreationAttributes>
  implements SubscriptionInterface
{
  public id!: number;
  public bookId!: number;
  public userId?: number;
  public subscriptionKey!: string;
  public title!: string;
  public description?: string;
  public format!: 'rss' | 'json';
  public includeContent!: boolean;
  public maxItems!: number;
  public isActive!: boolean;
  public lastAccessTime?: Date | string;
  public accessCount!: number;
  public readonly createdAt!: Date | string;
  public readonly updatedAt!: Date | string;
}

Subscription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Book,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    subscriptionKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    format: {
      type: DataTypes.ENUM('rss', 'json'),
      allowNull: false,
      defaultValue: 'rss',
    },
    includeContent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    maxItems: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    lastAccessTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    accessCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: "Subscription",
    tableName: "subscriptions",
    timestamps: true,
  }
);

// 定义关联关系
Subscription.belongsTo(Book, { foreignKey: 'bookId', as: 'book' });
Book.hasMany(Subscription, { foreignKey: 'bookId', as: 'subscriptions' });

export default Subscription;
export { SubscriptionInterface as SubscriptionAttributes, SubscriptionCreationAttributes };