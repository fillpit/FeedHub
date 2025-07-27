import { injectable, inject } from 'inversify';
import { TYPES } from '../core/types';
import { SettingService } from './SettingService';
import { NotificationController } from '../controllers/notification';
import { NotificationSettings } from '../types/notification';
import { logger } from '../utils/logger';

@injectable()
export class NotificationService {
  private notificationController: NotificationController;
  private settingService: SettingService;

  constructor(
    @inject(TYPES.SettingService) settingService: SettingService
  ) {
    this.settingService = settingService;
    this.notificationController = new NotificationController();
  }

  /**
   * 发送订阅更新错误通知
   */
  async sendFeedUpdateErrorNotification(userId: string, feedTitle: string, error: string): Promise<void> {
    try {
      // 获取用户的通知设置
      const settings = await this.settingService.getSettings(userId, undefined);
      const notificationSettings = settings.data.notificationSettings;
      
      if (!notificationSettings) {
        logger.info(`用户 ${userId} 未配置通知设置`);
        return;
      }
      
      // 检查是否启用了订阅更新错误通知
      if (!notificationSettings.triggers.feedUpdateErrors) {
        logger.info(`用户 ${userId} 未启用订阅更新错误通知`);
        return;
      }

      // 构建通知内容
      const title = 'FeedHub 订阅更新失败';
      const content = `订阅源「${feedTitle}」更新失败\n\n错误信息：${error}\n\n时间：${new Date().toLocaleString('zh-CN')}`;

      // 获取启用的通知服务
      const enabledServices = this.getEnabledServices(notificationSettings);
      
      if (enabledServices.length === 0) {
        logger.info(`用户 ${userId} 未配置任何通知服务`);
        return;
      }

      // 发送通知
      await this.sendNotification(title, content, enabledServices);
      
      logger.info(`已向用户 ${userId} 发送订阅更新错误通知`);
    } catch (error: any) {
      logger.error(`发送订阅更新错误通知失败: ${error.message}`);
    }
  }

  /**
   * 发送新订阅内容通知
   */
  async sendNewFeedItemsNotification(userId: string, feedTitle: string, newItemsCount: number): Promise<void> {
    try {
      // 获取用户的通知设置
      const settings = await this.settingService.getSettings(userId, undefined);
      const notificationSettings = settings.data.notificationSettings;
      
      if (!notificationSettings) {
        return;
      }
      
      // 检查是否启用了新订阅内容通知
      if (!notificationSettings.triggers.newFeedItems) {
        return;
      }

      // 构建通知内容
      const title = 'FeedHub 新内容提醒';
      const content = `订阅源「${feedTitle}」有 ${newItemsCount} 条新内容\n\n时间：${new Date().toLocaleString('zh-CN')}`;

      // 获取启用的通知服务
      const enabledServices = this.getEnabledServices(notificationSettings);
      
      if (enabledServices.length === 0) {
        return;
      }

      // 发送通知
      await this.sendNotification(title, content, enabledServices);
      
      logger.info(`已向用户 ${userId} 发送新订阅内容通知`);
    } catch (error: any) {
      logger.error(`发送新订阅内容通知失败: ${error.message}`);
    }
  }

  /**
   * 发送系统警报通知
   */
  async sendSystemAlertNotification(userId: string, alertTitle: string, alertContent: string): Promise<void> {
    try {
      // 获取用户的通知设置
      const settings = await this.settingService.getSettings(userId, undefined);
      const notificationSettings = settings.data.notificationSettings;
      
      if (!notificationSettings) {
        return;
      }
      
      // 检查是否启用了系统警报通知
      if (!notificationSettings.triggers.systemAlerts) {
        return;
      }

      // 构建通知内容
      const title = `FeedHub 系统警报 - ${alertTitle}`;
      const content = `${alertContent}\n\n时间：${new Date().toLocaleString('zh-CN')}`;

      // 获取启用的通知服务
      const enabledServices = this.getEnabledServices(notificationSettings);
      
      if (enabledServices.length === 0) {
        return;
      }

      // 发送通知
      await this.sendNotification(title, content, enabledServices);
      
      logger.info(`已向用户 ${userId} 发送系统警报通知`);
    } catch (error: any) {
      logger.error(`发送系统警报通知失败: ${error.message}`);
    }
  }

  /**
   * 发送动态路由错误通知
   */
  async sendDynamicRouteErrorNotification(userId: string, routePath: string, error: string): Promise<void> {
    try {
      // 获取用户的通知设置
      const settings = await this.settingService.getSettings(userId, undefined);
      const notificationSettings = settings.data.notificationSettings;
      
      if (!notificationSettings) {
        logger.info(`用户 ${userId} 未配置通知设置`);
        return;
      }
      
      // 检查是否启用了系统警报通知（动态路由错误归类为系统警报）
      if (!notificationSettings.triggers.systemAlerts) {
        logger.info(`用户 ${userId} 未启用系统警报通知`);
        return;
      }

      // 构建通知内容
      const title = 'FeedHub 动态路由执行失败';
      const content = `动态路由「${routePath}」执行失败\n\n错误信息：${error}\n\n时间：${new Date().toLocaleString('zh-CN')}`;

      // 获取启用的通知服务
      const enabledServices = this.getEnabledServices(notificationSettings);
      
      if (enabledServices.length === 0) {
        logger.info(`用户 ${userId} 未配置任何通知服务`);
        return;
      }

      // 发送通知
      await this.sendNotification(title, content, enabledServices);
      
      logger.info(`已向用户 ${userId} 发送动态路由错误通知`);
    } catch (error: any) {
      logger.error(`发送动态路由错误通知失败: ${error.message}`);
    }
  }

  /**
   * 获取启用的通知服务
   */
  private getEnabledServices(settings: NotificationSettings): any[] {
    const services: any[] = [];

    if (settings.bark.enabled && settings.bark.deviceKey) {
      services.push({
        type: 'bark',
        config: settings.bark
      });
    }

    if (settings.email.enabled && settings.email.smtpHost && settings.email.username) {
      services.push({
        type: 'email',
        config: settings.email
      });
    }

    if (settings.gotify.enabled && settings.gotify.serverUrl && settings.gotify.appToken) {
      services.push({
        type: 'gotify',
        config: settings.gotify
      });
    }

    if (settings.wechatWork.enabled && settings.wechatWork.webhookUrl) {
      services.push({
        type: 'wechatWork',
        config: settings.wechatWork
      });
    }

    if (settings.dingtalk.enabled && settings.dingtalk.webhookUrl) {
      services.push({
        type: 'dingtalk',
        config: settings.dingtalk
      });
    }

    if (settings.feishu.enabled && settings.feishu.webhookUrl) {
      services.push({
        type: 'feishu',
        config: settings.feishu
      });
    }

    return services;
  }

  /**
   * 发送通知
   */
  private async sendNotification(title: string, content: string, services: any[]): Promise<void> {
    // 模拟请求对象
    const mockReq = {
      body: {
        title,
        content,
        services
      }
    } as any;

    // 模拟响应对象
    const mockRes = {
      status: () => mockRes,
      json: () => mockRes
    } as any;

    // 调用通知控制器发送通知
    await this.notificationController.send(mockReq, mockRes);
  }
}