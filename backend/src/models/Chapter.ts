import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import { Chapter as ChapterInterface } from "@feedhub/shared/src/types/bookRss";
import Book from "./Book";

// Sequelize 模型创建属性接口
interface ChapterCreationAttributes
  extends Optional<ChapterInterface, "id" | "createdAt" | "updatedAt" | "isNew"> {}

class Chapter
  extends Model<ChapterInterface, ChapterCreationAttributes>
  implements ChapterInterface
{
  public id!: number;
  public bookId!: number;
  public chapterNumber!: number;
  public title!: string;
  public content?: string;
  public wordCount?: number;
  public publishTime?: Date | string;
  public isNew!: boolean;
  public readonly createdAt!: Date | string;
  public readonly updatedAt!: Date | string;
}

Chapter.init(
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
        key: "id",
      },
      onDelete: "CASCADE",
    },
    chapterNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    wordCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    publishTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isNew: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    modelName: "Chapter",
    tableName: "chapters",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["bookId", "chapterNumber"],
      },
    ],
  }
);

// 定义关联关系
Chapter.belongsTo(Book, { foreignKey: "bookId", as: "book" });
Book.hasMany(Chapter, { foreignKey: "bookId", as: "chapters" });

export default Chapter;
export { ChapterInterface as ChapterAttributes, ChapterCreationAttributes };
