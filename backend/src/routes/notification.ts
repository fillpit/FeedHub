import { Router } from 'express';
import { container } from '../inversify.config';
import { NotificationController } from '../controllers/notification';
import { TYPES } from '../core/types';

const router = Router();
const notificationController = container.get<NotificationController>(TYPES.NotificationController);

// 测试通知
router.post('/test', (req, res) => notificationController.test(req, res));

// 发送通知
router.post('/send', (req, res) => notificationController.send(req, res));

// 获取通知历史
router.get('/history', (req, res) => notificationController.getHistory(req, res));

export default router;