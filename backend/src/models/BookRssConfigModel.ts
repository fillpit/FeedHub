import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../config/database";
import {
  BookRssConfig as BookRssConfigInterface,
  BookFilter,
} from '@feedhub/shared/src/types/bookRss';
import Book from './Book';

// Sequelize 模型创建属性接口
interface BookRssConfigCreationAttributes
  extends Optional<BookRssConfigInterface, "id" | "createdAt" | "updatedAt" | "key" | "lastUpdateTime" | "lastBooks"> {}

// 重新导出类型
export { BookRssConfigInterface as BookRssConfigAttributes, BookRssConfigCreationAttributes };

class BookRssConfig
  extends Model<BookRssConfigInterface, BookRssConfigCreationAttributes>
  implements BookRssConfigInterface
{
  public id!: number;
  public key?: string;
  public title!: string;
  public description!: string;
  public opdsConfig!: any; // 这里将改为引用全局设置
  public bookFilter!: BookFilter;
  public maxBooks!: number;
  public updateInterval!: number;
  public favicon?: string;
  public lastUpdateTime?: string;
  public lastBooks?: any[];
  // 新增章节订阅相关字段
  public bookId?: number;
  public includeContent?: boolean;
  public maxChapters?: number;
  // 章节解析状态字段
  public parseStatus?: 'pending' | 'parsing' | 'completed' | 'failed';
  public parseError?: string;
  public lastParseTime?: Date | string;
  public readonly createdAt!: Date | string;
  public readonly updatedAt!: Date | string;
}

BookRssConfig.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    opdsConfig: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: '已弃用：现在使用全局设置中的OPDS配置',
    },
    bookFilter: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: {
        title: '',
        author: '',
        categories: [],
        language: '',
        fileFormats: []
      },
    },
    maxBooks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
    },
    updateInterval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60, // 默认60分钟
    },
    favicon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastUpdateTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastBooks: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    // 新增章节订阅相关字段
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '订阅的书籍ID',
    },
    includeContent: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
      comment: '是否在RSS中包含章节内容',
    },
    maxChapters: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 50,
      comment: '最大章节数',
    },
    parseStatus: {
      type: DataTypes.ENUM('pending', 'parsing', 'completed', 'failed'),
      allowNull: true,
      defaultValue: 'pending',
      comment: '章节解析状态',
    },
    parseError: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '解析错误信息',
    },
    lastParseTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '最后解析时间',
    },
  },
  {
    sequelize,
    modelName: "BookRssConfig",
    tableName: "book_rss_configs",
    timestamps: true,
  }
);

// 定义关联关系
BookRssConfig.belongsTo(Book, {
  foreignKey: 'bookId',
  as: 'book'
});

export default BookRssConfig;