import axios, { AxiosInstance } from 'axios';
import { getLarkConfig } from '../config/lark.js';

export class LarkClient {
  private client: AxiosInstance;
  private config = getLarkConfig();
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://open.larksuite.com/open-apis',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    if (this.config.tenantAccessToken) {
      this.accessToken = this.config.tenantAccessToken;
      return this.accessToken;
    }

    const response = await this.client.post('/auth/v3/tenant_access_token/internal', {
      app_id: this.config.appId,
      app_secret: this.config.appSecret,
    });

    if (response.data.code !== 0) {
      throw new Error(`Failed to get access token: ${response.data.msg}`);
    }

    const token = response.data.tenant_access_token;
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid access token received from Lark API');
    }

    this.accessToken = token;
    return this.accessToken;
  }

  async request<T>(method: string, url: string, data?: unknown): Promise<T> {
    const token = await this.getAccessToken();

    const response = await this.client.request({
      method,
      url,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.code !== 0) {
      throw new Error(`Lark API error: ${response.data.msg}`);
    }

    return response.data.data;
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();

    const response = await this.client.request({
      method: 'GET',
      url,
      params,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.code !== 0) {
      throw new Error(`Lark API error: ${response.data.msg}`);
    }

    return response.data.data;
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    return this.request<T>('POST', url, data);
  }

  /**
   * グループチャットを作成
   */
  async createGroupChat(name: string, description?: string): Promise<{ chat_id: string }> {
    return this.post<{ chat_id: string }>('/im/v1/chats', {
      name,
      description: description || `${name} - カレンダー空き時間Bot`,
      chat_mode: 'group',
      chat_type: 'private',
    });
  }

  /**
   * Botをグループに追加
   */
  async addBotToChat(chatId: string): Promise<void> {
    await this.post('/im/v1/chats/' + chatId + '/members', {
      member_id_type: 'app_id',
      id_list: [this.config.appId],
    });
  }

  /**
   * ユーザーをグループに追加
   */
  async addUserToChat(chatId: string, userId: string): Promise<void> {
    await this.post('/im/v1/chats/' + chatId + '/members', {
      member_id_type: 'user_id',
      id_list: [userId],
    });
  }

  /**
   * チャットにメッセージを送信
   */
  async sendMessage(chatId: string, content: string): Promise<{ message_id: string }> {
    return this.post<{ message_id: string }>('/im/v1/messages?receive_id_type=chat_id', {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: content }),
    });
  }

  /**
   * カードメッセージを送信
   */
  async sendCardMessage(chatId: string, card: object): Promise<{ message_id: string }> {
    return this.post<{ message_id: string }>('/im/v1/messages?receive_id_type=chat_id', {
      receive_id: chatId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    });
  }

  /**
   * Bot情報を取得
   */
  async getBotInfo(): Promise<{ app_name: string; open_id: string }> {
    return this.get<{ app_name: string; open_id: string }>('/bot/v3/info');
  }
}
