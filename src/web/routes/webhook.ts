/**
 * Lark Webhook ルート
 * Botイベントを受信して処理する
 */

import { Router } from 'express';
import { BotService } from '../../services/botService.js';

const router = Router();
const botService = new BotService();

/**
 * Lark Event Webhook
 */
router.post('/', async (req, res) => {
  const body = req.body;

  console.log('📥 Webhook received:', JSON.stringify(body, null, 2).substring(0, 500));

  // URL検証チャレンジ
  if (body.type === 'url_verification') {
    const response = botService.handleChallenge(body);
    return res.json(response);
  }

  // イベント処理
  if (body.schema === '2.0' && body.header) {
    // すぐに200を返す（Larkは3秒以内のレスポンスを期待）
    res.status(200).send('ok');

    // 非同期でイベントを処理
    try {
      await botService.handleEvent(body);
    } catch (error) {
      console.error('❌ Webhook event processing error:', error);
    }
    return;
  }

  // 不明なリクエスト
  console.warn('⚠️ Unknown webhook format:', body);
  res.status(200).send('ok');
});

export { router as webhookRouter };
