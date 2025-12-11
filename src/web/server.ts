/**
 * Larkカレンダー空き時間提案 Webサーバー
 */

import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { authRouter } from './routes/auth.js';
import { calendarRouter } from './routes/calendar.js';
import { webhookRouter } from './routes/webhook.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// セッション設定を拡張
declare module 'express-session' {
  interface SessionData {
    userAccessToken?: string;
    refreshToken?: string;
    userId?: string;
    userName?: string;
    oauthState?: string;
  }
}

// ミドルウェア設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24時間
  },
}));

// 静的ファイル
app.use(express.static(path.join(__dirname, 'public')));

// ルーティング
app.use('/auth', authRouter);
app.use('/api/calendar', calendarRouter);
app.use('/webhook', webhookRouter);

// ルートページ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`\n🌸 Larkカレンダー空き時間提案アプリ`);
  console.log(`🌐 サーバー起動: http://localhost:${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`\n📚 Bot使い方:`);
  console.log(`   1. LarkでBotをグループに追加`);
  console.log(`   2. "@Bot名 空き時間教えて" と送信`);
  console.log(`   3. 他の人との共通空き時間: "@Bot名 @田中さん 空き時間教えて"\n`);
});

export default app;
