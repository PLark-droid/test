/**
 * Token Storage Service
 * ユーザーのOAuthトークンをファイルベースで保存・取得する
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UserToken {
  openId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userName?: string;
}

interface TokenStore {
  [openId: string]: UserToken;
}

const TOKEN_FILE = path.join(__dirname, '../../.tokens.json');

class TokenStorage {
  private tokens: TokenStore = {};

  constructor() {
    this.load();
  }

  /**
   * ファイルからトークンを読み込み
   */
  private load(): void {
    try {
      if (fs.existsSync(TOKEN_FILE)) {
        const data = fs.readFileSync(TOKEN_FILE, 'utf-8');
        this.tokens = JSON.parse(data);
        console.log(`📦 Loaded ${Object.keys(this.tokens).length} user tokens from storage`);
      }
    } catch (error) {
      console.error('Failed to load tokens:', error);
      this.tokens = {};
    }
  }

  /**
   * ファイルにトークンを保存
   */
  private save(): void {
    try {
      fs.writeFileSync(TOKEN_FILE, JSON.stringify(this.tokens, null, 2));
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  /**
   * ユーザートークンを保存
   */
  saveToken(openId: string, accessToken: string, refreshToken: string, expiresIn: number, userName?: string): void {
    this.tokens[openId] = {
      openId,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      userName,
    };
    this.save();
    console.log(`💾 Saved token for user: ${userName || openId}`);
  }

  /**
   * ユーザートークンを取得
   */
  getToken(openId: string): UserToken | null {
    const token = this.tokens[openId];
    if (!token) {
      return null;
    }

    // 期限切れチェック（10分のマージン）
    if (token.expiresAt < Date.now() + 10 * 60 * 1000) {
      console.log(`⚠️ Token for ${openId} is expired or expiring soon`);
      // refresh_tokenを使った更新はLarkOAuthServiceで行う
      return token; // 期限切れでも返す（呼び出し側でリフレッシュ判断）
    }

    return token;
  }

  /**
   * トークンを更新
   */
  updateToken(openId: string, accessToken: string, refreshToken: string, expiresIn: number): void {
    const existing = this.tokens[openId];
    this.tokens[openId] = {
      openId,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
      userName: existing?.userName,
    };
    this.save();
    console.log(`🔄 Updated token for user: ${openId}`);
  }

  /**
   * 登録済みユーザー一覧を取得
   */
  getRegisteredUsers(): Array<{ openId: string; userName?: string }> {
    return Object.values(this.tokens).map(t => ({
      openId: t.openId,
      userName: t.userName,
    }));
  }

  /**
   * トークンを削除
   */
  removeToken(openId: string): void {
    delete this.tokens[openId];
    this.save();
  }
}

// シングルトンインスタンス
export const tokenStorage = new TokenStorage();
