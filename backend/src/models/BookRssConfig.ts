import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  Book as BookInterface,
  BookSourceType,
} from '@feedhub/shared/src/types/bookRss';

// Sequelize 模型创建属性接口
interface BookCreationAttributes
  extends Optional<BookInterface, "id" | "createdAt" | "updatedAt" | "totalChapters" | "lastChapterTitle" | "lastChapterTime"> {}

// 重新导出类型
export { BookInterface as BookAttributes, BookCreationAttributes };

class Book
  extends Model<BookInterface, BookCreationAttributes>
  implements BookInterface
{
  public id!: number;
  public title!: string;
  public author!: string;
  public description!: string;
  public coverUrl!: string;
  public sourceType!: BookSourceType;
  public sourcePath!: string;
  public sourceUrl!: string;
  public opdsConfigId!: number;
  public language!: string;
  public isbn!: string;
  public categories!: string[];
  public fileFormat!: string;
  public fileSize!: number;
  public totalChapters!: number;
  public lastChapterTitle!: string;
  public lastChapterTime!: Date;
  public updateFrequency!: number;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Book.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    author: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    coverUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sourceType: {
      type: DataTypes.ENUM('upload', 'opds', 'url'),
      allowNull: false,
    },
    sourcePath: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    opdsConfigId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    language: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isbn: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categories: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    fileFormat: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    totalChapters: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastChapterTitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastChapterTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updateFrequency: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60, // 默认60分钟检查一次
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  } as any, // 使用类型断言绕过Sequelize类型检查问题
  {
    sequelize,
    modelName: "Book",
    tableName: "books",
    timestamps: true,
  }
);

export default Book;