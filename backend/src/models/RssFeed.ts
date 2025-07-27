import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";

export interface RssFeedAttributes {
  id: number;
  key: string;
  title: string;
  url: string;
  rssUrl: string;
  favicon: string;
  content: string;
}

interface RssFeedCreationAttributes extends Optional<RssFeedAttributes, "id"> {}

class RssFeed
  extends Model<RssFeedAttributes, RssFeedCreationAttributes>
  implements RssFeedAttributes
{
  public id!: number;
  public key!: string;
  public title!: string;
  public url!: string;
  public rssUrl!: string;
  public favicon!: string;
  public content!: string;
}

RssFeed.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rssUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    favicon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "RssFeed",
    tableName: "rss_feeds",
  }
);

export default RssFeed;
