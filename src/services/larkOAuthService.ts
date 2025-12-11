/**
 * Lark OAuth 2.0 認証サービス
 */

import axios from 'axios';
import { getLarkConfig } from '../config/lark.js';

export interface LarkOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface LarkUserInfo {
  user_id: string;
  open_id: string;
  name: string;
  en_name?: string;
  avatar_url?: string;
  email?: string;
}

export class LarkOAuthService {
  private config = getLarkConfig();
  private baseURL = 'https://open.larksuite.com/open-apis';
  private appAccessToken: string | null = null;

  /**
   * App Access Tokenを取得
   */
  private async getAppAccessToken(): Promise<string> {
    if (this.appAccessToken) {
      return this.appAccessToken;
    }

    const response = await axios.post(`${this.baseURL}/auth/v3/app_access_token/internal`, {
      app_id: this.config.appId,
      app_secret: this.config.appSecret,
    });

    if (response.data.code !== 0) {
      throw new Error(`Failed to get app access token: ${response.data.msg}`);
    }

    this.appAccessToken = response.data.app_access_token;
    return this.appAccessToken!;
  }

  /**
   * OAuth認証URLを生成
   */
  generateAuthUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      app_id: this.config.appId,
      redirect_uri: redirectUri,
      scope: 'calendar:calendar:readonly im:message im:message:send_as_bot',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://open.larksuite.com/open-apis/authen/v1/authorize?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async getAccessToken(code: string): Promise<LarkOAuthTokens> {
    console.log('Getting access token with code:', code.substring(0, 10) + '...');

    // まずApp Access Tokenを取得
    const appToken = await this.getAppAccessToken();
    console.log('Got app access token');

    const response = await axios.post(`${this.baseURL}/authen/v1/oidc/access_token`, {
      grant_type: 'authorization_code',
      code,
    }, {
      headers: {
        'Authorization': `Bearer ${appToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Token response:', JSON.stringify(response.data, null, 2));

    if (response.data.code !== 0) {
      throw new Error(`Failed to get access token: ${response.data.msg} (code: ${response.data.code})`);
    }

    return response.data.data;
  }

  /**
   * リフレッシュトークンから新しいアクセストークンを取得
   */
  async refreshAccessToken(refreshToken: string): Promise<LarkOAuthTokens> {
    const appToken = await this.getAppAccessToken();

    const response = await axios.post(`${this.baseURL}/authen/v1/oidc/refresh_access_token`, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }, {
      headers: {
        'Authorization': `Bearer ${appToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.data.code !== 0) {
      throw new Error(`Failed to refresh access token: ${response.data.msg}`);
    }

    return response.data.data;
  }

  /**
   * アクセストークンからユーザー情報を取得
   */
  async getUserInfo(accessToken: string): Promise<LarkUserInfo> {
    const response = await axios.get(`${this.baseURL}/authen/v1/user_info`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.data.code !== 0) {
      throw new Error(`Failed to get user info: ${response.data.msg}`);
    }

    return response.data.data;
  }
}
