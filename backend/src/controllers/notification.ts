import { Request, Response } from 'express';
import { injectable } from 'inversify';
import { BaseController } from './BaseController';
import axios from 'axios';
import * as nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { ApiResponse } from '../core/ApiResponse';

@injectable()
export class NotificationController extends BaseController {
  
  /**
   * 测试通知服务
   */
  async test(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { service, config } = req.body;
      
      if (!service || !config) {
        return ApiResponse.error('缺少必要参数');
      }
      
      let result: { success: boolean; message: string };
      
      switch (service) {
        case 'bark':
          result = await this.testBark(config);
          break;
        case 'email':
          result = await this.testEmail(config);
          break;
        case 'gotify':
          result = await this.testGotify(config);
          break;
        case 'wechatWork':
          result = await this.testWechatWork(config);
          break;
        case 'dingtalk':
          result = await this.testDingtalk(config);
          break;
        case 'feishu':
          result = await this.testFeishu(config);
          break;
        default:
          return ApiResponse.error('不支持的通知服务');
      }
      
      return ApiResponse.success(result);
    });
  }
  
  /**
   * 测试 Bark 推送
   */
  private async testBark(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const { serverUrl, deviceKey, sound, icon, group } = config;
      
      if (!deviceKey) {
        return { success: false, message: '请填写设备密钥' };
      }
      
      const url = `${serverUrl}/${deviceKey}`;
      const data: any = {
        title: 'FeedHub 测试通知',
        body: '这是一条来自 FeedHub 的测试通知',
        category: 'FeedHub'
      };
      
      if (sound) data.sound = sound;
      if (icon) data.icon = icon;
      if (group) data.group = group;
      
      const response = await axios.post(url, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.code === 200) {
        return { success: true, message: 'Bark 推送测试成功' };
      } else {
        return { success: false, message: response.data.message || 'Bark 推送失败' };
      }
    } catch (error: any) {
      return { success: false, message: `Bark 推送失败: ${error.message}` };
    }
  }
  
  /**
   * 测试邮件通知
   */
  private async testEmail(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const { smtpHost, smtpPort, smtpSecure, username, password, fromEmail, toEmail } = config;
      
      if (!smtpHost || !username || !password || !fromEmail || !toEmail) {
        return { success: false, message: '请填写完整的邮件配置信息' };
      }
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: username,
          pass: password
        }
      });
      
      const mailOptions = {
        from: fromEmail,
        to: toEmail,
        subject: 'FeedHub 测试通知',
        text: '这是一条来自 FeedHub 的测试邮件通知',
        html: '<h3>FeedHub 测试通知</h3><p>这是一条来自 FeedHub 的测试邮件通知</p>'
      };
      
      await transporter.sendMail(mailOptions);
      return { success: true, message: '邮件发送测试成功' };
    } catch (error: any) {
      return { success: false, message: `邮件发送失败: ${error.message}` };
    }
  }
  
  /**
   * 测试 Gotify 推送
   */
  private async testGotify(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const { serverUrl, appToken, priority } = config;
      
      if (!serverUrl || !appToken) {
        return { success: false, message: '请填写服务器地址和应用令牌' };
      }
      
      const url = `${serverUrl}/message`;
      const data = {
        title: 'FeedHub 测试通知',
        message: '这是一条来自 FeedHub 的测试通知',
        priority: priority || 5
      };
      
      const response = await axios.post(url, data, {
        timeout: 10000,
        headers: {
          'X-Gotify-Key': appToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        return { success: true, message: 'Gotify 推送测试成功' };
      } else {
        return { success: false, message: 'Gotify 推送失败' };
      }
    } catch (error: any) {
      return { success: false, message: `Gotify 推送失败: ${error.message}` };
    }
  }
  
  /**
   * 测试企业微信推送
   */
  private async testWechatWork(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const { webhookUrl } = config;
      
      if (!webhookUrl) {
        return { success: false, message: '请填写 Webhook 地址' };
      }
      
      const data = {
        msgtype: 'text',
        text: {
          content: 'FeedHub 测试通知\n这是一条来自 FeedHub 的测试通知'
        }
      };
      
      const response = await axios.post(webhookUrl, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.errcode === 0) {
        return { success: true, message: '企业微信推送测试成功' };
      } else {
        return { success: false, message: response.data.errmsg || '企业微信推送失败' };
      }
    } catch (error: any) {
      return { success: false, message: `企业微信推送失败: ${error.message}` };
    }
  }
  
  /**
   * 测试钉钉推送
   */
  private async testDingtalk(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const { webhookUrl, secret, isAtAll } = config;
      
      if (!webhookUrl) {
        return { success: false, message: '请填写 Webhook 地址' };
      }
      
      let url = webhookUrl;
      
      // 如果有签名密钥，生成签名
      if (secret) {
        const timestamp = Date.now();
        const stringToSign = `${timestamp}\n${secret}`;
        const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
        url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
      }
      
      const data = {
        msgtype: 'text',
        text: {
          content: 'FeedHub 测试通知\n这是一条来自 FeedHub 的测试通知'
        },
        at: {
          isAtAll: isAtAll || false
        }
      };
      
      const response = await axios.post(url, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.errcode === 0) {
        return { success: true, message: '钉钉推送测试成功' };
      } else {
        return { success: false, message: response.data.errmsg || '钉钉推送失败' };
      }
    } catch (error: any) {
      return { success: false, message: `钉钉推送失败: ${error.message}` };
    }
  }
  
  /**
   * 测试飞书推送
   */
  private async testFeishu(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const { webhookUrl, secret, atAll } = config;
      
      if (!webhookUrl) {
        return { success: false, message: '请填写 Webhook 地址' };
      }
      
      let url = webhookUrl;
      
      // 如果有签名密钥，生成签名
      if (secret) {
        const timestamp = Math.floor(Date.now() / 1000);
        const stringToSign = `${timestamp}\n${secret}`;
        const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
        url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
      }
      
      const data = {
        msg_type: 'text',
        content: {
          text: 'FeedHub 测试通知\n这是一条来自 FeedHub 的测试通知'
        },
        at: {
          isAtAll: atAll || false
        }
      };
      
      const response = await axios.post(url, data, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200 && response.data.StatusCode === 0) {
        return { success: true, message: '飞书推送测试成功' };
      } else {
        return { success: false, message: response.data.StatusMessage || '飞书推送失败' };
      }
    } catch (error: any) {
      return { success: false, message: `飞书推送失败: ${error.message}` };
    }
  }
  
  /**
   * 发送通知
   */
  async send(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      const { title, content, services } = req.body;
      
      if (!title || !content) {
        return ApiResponse.error('缺少标题或内容');
      }
      
      const results: any[] = [];
      
      // 发送到各个启用的服务
      for (const service of services || []) {
        try {
          let result: { success: boolean; message: string };
          
          switch (service.type) {
            case 'bark':
              result = await this.sendBark(service.config, title, content);
              break;
            case 'email':
              result = await this.sendEmail(service.config, title, content);
              break;
            case 'gotify':
              result = await this.sendGotify(service.config, title, content);
              break;
            case 'wechatWork':
              result = await this.sendWechatWork(service.config, title, content);
              break;
            case 'dingtalk':
              result = await this.sendDingtalk(service.config, title, content);
              break;
            case 'feishu':
              result = await this.sendFeishu(service.config, title, content);
              break;
            default:
              result = { success: false, message: '不支持的通知服务' };
          }
          
          results.push({ service: service.type, ...result });
        } catch (error: any) {
          results.push({ 
            service: service.type, 
            success: false, 
            message: `发送失败: ${error.message}` 
          });
        }
      }
      
      return ApiResponse.success({ results });
    });
  }
  
  /**
   * 获取通知历史
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    await this.handleRequest(req, res, async () => {
      // TODO: 实现获取通知历史逻辑
      return ApiResponse.success({ data: [], total: 0 });
    });
  }

  /**
   * 发送 Bark 通知
   */
  private async sendBark(config: any, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const { serverUrl, deviceKey, sound, icon, group } = config;
    
    if (!deviceKey) {
      return { success: false, message: '请填写设备密钥' };
    }
    
    const url = `${serverUrl}/${deviceKey}`;
    const data: any = {
      title,
      body: content,
      category: 'FeedHub'
    };
    
    if (sound) data.sound = sound;
    if (icon) data.icon = icon;
    if (group) data.group = group;
    
    const response = await axios.post(url, data, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.code === 200) {
      return { success: true, message: 'Bark 推送成功' };
    } else {
      return { success: false, message: response.data.message || 'Bark 推送失败' };
    }
  }

  /**
   * 发送邮件通知
   */
  private async sendEmail(config: any, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const { smtpHost, smtpPort, smtpSecure, username, password, fromEmail, toEmail } = config;
    
    if (!smtpHost || !username || !password || !fromEmail || !toEmail) {
      return { success: false, message: '请填写完整的邮件配置' };
    }
    
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: username,
        pass: password
      }
    });
    
    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      subject: title,
      text: content,
      html: content.replace(/\n/g, '<br>')
    };
    
    await transporter.sendMail(mailOptions);
    return { success: true, message: '邮件发送成功' };
  }

  /**
   * 发送 Gotify 通知
   */
  private async sendGotify(config: any, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const { serverUrl, appToken, priority } = config;
    
    if (!serverUrl || !appToken) {
      return { success: false, message: '请填写服务器地址和应用令牌' };
    }
    
    const url = `${serverUrl}/message`;
    const data = {
      title,
      message: content,
      priority: priority || 5
    };
    
    const response = await axios.post(url, data, {
      timeout: 10000,
      headers: {
        'X-Gotify-Key': appToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200) {
      return { success: true, message: 'Gotify 推送成功' };
    } else {
      return { success: false, message: 'Gotify 推送失败' };
    }
  }

  /**
   * 发送企业微信通知
   */
  private async sendWechatWork(config: any, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const { webhookUrl } = config;
    
    if (!webhookUrl) {
      return { success: false, message: '请填写 Webhook 地址' };
    }
    
    const data = {
      msgtype: 'text',
      text: {
        content: `${title}\n${content}`
      }
    };
    
    const response = await axios.post(webhookUrl, data, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.errcode === 0) {
      return { success: true, message: '企业微信推送成功' };
    } else {
      return { success: false, message: response.data.errmsg || '企业微信推送失败' };
    }
  }

  /**
   * 发送钉钉通知
   */
  private async sendDingtalk(config: any, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const { webhookUrl, secret, isAtAll } = config;
    
    if (!webhookUrl) {
      return { success: false, message: '请填写 Webhook 地址' };
    }
    
    let url = webhookUrl;
    
    // 如果有签名密钥，生成签名
    if (secret) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${secret}`;
      const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
      url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }
    
    const data = {
      msgtype: 'text',
      text: {
        content: `${title}\n${content}`
      },
      at: {
        isAtAll: isAtAll || false
      }
    };
    
    const response = await axios.post(url, data, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.errcode === 0) {
      return { success: true, message: '钉钉推送成功' };
    } else {
      return { success: false, message: response.data.errmsg || '钉钉推送失败' };
    }
  }

  /**
   * 发送飞书通知
   */
  private async sendFeishu(config: any, title: string, content: string): Promise<{ success: boolean; message: string }> {
    const { webhookUrl, secret, atAll } = config;
    
    if (!webhookUrl) {
      return { success: false, message: '请填写 Webhook 地址' };
    }
    
    let url = webhookUrl;
    
    // 如果有签名密钥，生成签名
    if (secret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const stringToSign = `${timestamp}\n${secret}`;
      const sign = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
      url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
    }
    
    const data = {
      msg_type: 'text',
      content: {
        text: `${title}\n${content}`
      },
      at: {
        isAtAll: atAll || false
      }
    };
    
    const response = await axios.post(url, data, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.StatusCode === 0) {
      return { success: true, message: '飞书推送成功' };
    } else {
      return { success: false, message: response.data.StatusMessage || '飞书推送失败' };
    }
  }
}