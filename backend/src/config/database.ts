// backend/src/config/database.ts
import { Sequelize } from "sequelize";

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./data/database.sqlite",
  logging: console.log,
});

export default sequelize;
