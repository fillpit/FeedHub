import { Request, Response } from "express";
import { injectable } from "inversify";
import { DatabaseService } from "../services/DatabaseService";
import { container } from "../inversify.config";
import { TYPES } from "../core/types";

@injectable()
export class BackupController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = container.get<DatabaseService>(TYPES.DatabaseService);
  }

  /**
   * 导出数据备份
   */
  async exportBackup(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "未授权访问" });
        return;
      }

      // 获取用户的所有数据
      const userData = await this.getUserData(userId);
      
      // 创建备份文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `feedhub-backup-${timestamp}.json`;
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${backupFileName}"`);
      
      // 发送备份数据
      res.json({
        version: "1.0",
        timestamp: new Date().toISOString(),
        userId: userId,
        data: userData
      });
    } catch (error) {
      console.error('导出备份失败:', error);
      res.status(500).json({ success: false, message: "导出备份失败" });
    }
  }

  /**
   * 导出分享配置（不包含敏感信息）
   */
  async exportShareConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "未授权访问" });
        return;
      }

      // 获取可分享的配置数据
      const shareData = await this.getShareableData(userId);
      
      // 创建分享文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const shareFileName = `feedhub-share-config-${timestamp}.json`;
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${shareFileName}"`);
      
      // 发送分享配置数据
      res.json({
        version: "1.0",
        type: "share_config",
        timestamp: new Date().toISOString(),
        description: "FeedHub 分享配置文件 - 包含动态路由和网站RSS配置",
        data: shareData
      });
    } catch (error) {
      console.error('导出分享配置失败:', error);
      res.status(500).json({ success: false, message: "导出分享配置失败" });
    }
  }

  /**
   * 导入分享配置
   */
  async importShareConfig(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "未授权访问" });
        return;
      }

      const shareData = req.body;
      
      // 验证分享配置数据格式
      if (!shareData || !shareData.data || !shareData.version || shareData.type !== "share_config") {
        res.status(400).json({ success: false, message: "分享配置文件格式无效" });
        return;
      }

      // 开始事务
      const sequelize = this.databaseService.getSequelize();
      const transaction = await sequelize.transaction();

      try {
        // 导入分享配置数据
        await this.importShareableData(userId, shareData.data, transaction);
        
        // 提交事务
        await transaction.commit();
        
        res.json({ success: true, message: "分享配置导入成功" });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('导入分享配置失败:', error);
      res.status(500).json({ success: false, message: "导入分享配置失败" });
    }
  }

  /**
   * 导入数据备份
   */
  async importBackup(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, message: "未授权访问" });
        return;
      }

      const backupData = req.body;
      
      // 验证备份数据格式
      if (!backupData || !backupData.data || !backupData.version) {
        res.status(400).json({ success: false, message: "备份文件格式无效" });
        return;
      }

      // 开始事务
      const sequelize = this.databaseService.getSequelize();
      const transaction = await sequelize.transaction();

      try {
        // 恢复用户数据
        await this.restoreUserData(userId, backupData.data, transaction);
        
        // 提交事务
        await transaction.commit();
        
        res.json({ success: true, message: "数据恢复成功" });
      } catch (error) {
        // 回滚事务
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('导入备份失败:', error);
      res.status(500).json({ success: false, message: "导入备份失败" });
    }
  }

  /**
   * 获取用户的所有数据
   */
  private async getUserData(userId: string): Promise<any> {
    const sequelize = this.databaseService.getSequelize();
    
    // 获取用户基本信息
    const user = await sequelize.models.User.findByPk(userId, {
      attributes: ['username', 'email', 'createdAt']
    });

    // 获取用户设置
    const userSettings = await sequelize.models.UserSetting.findOne({
      where: { userId },
      attributes: ['cloud115Cookie', 'quarkCookie']
    });

    // 获取通知设置
    const notificationSettings = await sequelize.models.NotificationSetting.findOne({
      where: { userId },
      attributes: {
        exclude: ['id', 'userId', 'createdAt', 'updatedAt']
      }
    });

    // 获取网站RSS订阅
    const websiteRss = await sequelize.models.WebsiteRss.findAll({
      where: { userId },
      attributes: {
        exclude: ['id', 'userId', 'createdAt', 'updatedAt']
      }
    });

    // 获取自定义路由
    const dynamicRoutes = await sequelize.models.DynamicRoute.findAll({
      where: { userId },
      attributes: {
        exclude: ['id', 'userId', 'createdAt', 'updatedAt']
      }
    });

    // 获取授权凭据
    const authCredentials = await sequelize.models.AuthCredential.findAll({
      where: { userId },
      attributes: {
        exclude: ['id', 'userId', 'createdAt', 'updatedAt']
      }
    });

    return {
      user,
      userSettings,
      notificationSettings,
      websiteRss,
      dynamicRoutes,
      authCredentials
    };
  }

  /**
   * 获取可分享的配置数据（排除敏感信息）
   */
  private async getShareableData(userId: string): Promise<any> {
    const sequelize = this.databaseService.getSequelize();
    
    // 获取网站RSS订阅（排除敏感字段）
    const websiteRss = await sequelize.models.WebsiteRss.findAll({
      where: { userId },
      attributes: {
        exclude: ['id', 'userId', 'authCredentialId', 'createdAt', 'updatedAt']
      }
    });

    // 获取自定义路由（排除敏感字段）
    const dynamicRoutes = await sequelize.models.DynamicRoute.findAll({
      where: { userId },
      attributes: {
        exclude: ['id', 'userId', 'authCredentialId', 'createdAt', 'updatedAt']
      }
    });

    return {
      websiteRss,
      dynamicRoutes
    };
  }

  /**
   * 导入分享的配置数据
   */
  private async importShareableData(userId: string, data: any, transaction: any): Promise<void> {
    const sequelize = this.databaseService.getSequelize();

    // 导入网站RSS订阅
    if (data.websiteRss && Array.isArray(data.websiteRss)) {
      for (const rss of data.websiteRss) {
        // 排除authCredentialId，避免ID冲突
        const { authCredentialId, ...rssData } = rss;
        await sequelize.models.WebsiteRss.create({
          userId,
          ...rssData,
          authCredentialId: null // 分享的配置不包含授权信息
        }, { transaction });
      }
    }

    // 导入自定义路由
    if (data.dynamicRoutes && Array.isArray(data.dynamicRoutes)) {
      for (const route of data.dynamicRoutes) {
        // 排除authCredentialId，避免ID冲突
        const { authCredentialId, ...routeData } = route;
        await sequelize.models.DynamicRoute.create({
          userId,
          ...routeData,
          authCredentialId: null // 分享的配置不包含授权信息
        }, { transaction });
      }
    }
  }

  /**
   * 恢复用户数据
   */
  private async restoreUserData(userId: string, data: any, transaction: any): Promise<void> {
    const sequelize = this.databaseService.getSequelize();

    // 恢复用户设置
    if (data.userSettings) {
      await sequelize.models.UserSetting.upsert({
        userId,
        ...data.userSettings
      }, { transaction });
    }

    // 恢复通知设置
    if (data.notificationSettings) {
      await sequelize.models.NotificationSetting.upsert({
        userId,
        ...data.notificationSettings
      }, { transaction });
    }

    // 恢复网站RSS订阅（先删除现有的，再插入新的）
    if (data.websiteRss && Array.isArray(data.websiteRss)) {
      await sequelize.models.WebsiteRss.destroy({
        where: { userId },
        transaction
      });
      
      for (const rss of data.websiteRss) {
        await sequelize.models.WebsiteRss.create({
          userId,
          ...rss
        }, { transaction });
      }
    }

    // 恢复自定义路由（先删除现有的，再插入新的）
    if (data.dynamicRoutes && Array.isArray(data.dynamicRoutes)) {
      await sequelize.models.DynamicRoute.destroy({
        where: { userId },
        transaction
      });
      
      for (const route of data.dynamicRoutes) {
        await sequelize.models.DynamicRoute.create({
          userId,
          ...route
        }, { transaction });
      }
    }

    // 恢复授权凭据（先删除现有的，再插入新的）
    if (data.authCredentials && Array.isArray(data.authCredentials)) {
      await sequelize.models.AuthCredential.destroy({
        where: { userId },
        transaction
      });
      
      for (const credential of data.authCredentials) {
        await sequelize.models.AuthCredential.create({
          userId,
          ...credential
        }, { transaction });
      }
    }
  }
}