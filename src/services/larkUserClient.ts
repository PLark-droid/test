/**
 * Lark User API Client
 * ユーザー認証（user_access_token）を使用するクライアント
 */

import axios, { AxiosInstance } from 'axios';

export class LarkUserClient {
  private client: AxiosInstance;
  private userAccessToken: string;

  constructor(userAccessToken: string) {
    this.userAccessToken = userAccessToken;
    this.client = axios.create({
      baseURL: 'https://open.larksuite.com/open-apis',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAccessToken}`,
      },
    });
  }

  async request<T>(method: string, url: string, data?: unknown, params?: unknown): Promise<T> {
    const response = await this.client.request({
      method,
      url,
      data,
      params,
    });

    if (response.data.code !== 0) {
      throw new Error(`Lark API error (${response.data.code}): ${response.data.msg}`);
    }

    return response.data.data;
  }

  async get<T>(url: string, params?: unknown): Promise<T> {
    return this.request<T>('GET', url, undefined, params);
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    return this.request<T>('POST', url, data);
  }
}
