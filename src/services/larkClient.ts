import axios, { AxiosInstance } from 'axios';
import { getLarkConfig } from '../config/lark.js';

export class LarkClient {
  private client: AxiosInstance;
  private config = getLarkConfig();
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://open.feishu.cn/open-apis',
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

  async get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    return this.request<T>('POST', url, data);
  }
}
