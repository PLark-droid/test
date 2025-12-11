/**
 * Miyabi Framework - GitHub API Client
 * GitHub APIとの連携
 */

import { Issue } from './types.js';

export class GitHubClient {
  private token: string;
  private repository: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string, repository: string) {
    this.token = token;
    this.repository = repository;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `token ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GitHub API error (${response.status}): ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async getIssue(issueNumber: number): Promise<Issue> {
    interface GitHubIssue {
      number: number;
      title: string;
      body: string | null;
      labels: { name: string }[];
      state: string;
      html_url: string;
    }

    const data = await this.request<GitHubIssue>(
      'GET',
      `/repos/${this.repository}/issues/${issueNumber}`
    );

    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      labels: data.labels.map(l => l.name),
      state: data.state as 'open' | 'closed',
      url: data.html_url,
    };
  }

  async addLabels(issueNumber: number, labels: string[]): Promise<void> {
    await this.request(
      'POST',
      `/repos/${this.repository}/issues/${issueNumber}/labels`,
      { labels }
    );
  }

  async addComment(issueNumber: number, body: string): Promise<void> {
    await this.request(
      'POST',
      `/repos/${this.repository}/issues/${issueNumber}/comments`,
      { body }
    );
  }

  async listOpenIssues(): Promise<Issue[]> {
    interface GitHubIssue {
      number: number;
      title: string;
      body: string | null;
      labels: { name: string }[];
      state: string;
      html_url: string;
      pull_request?: unknown;
    }

    const data = await this.request<GitHubIssue[]>(
      'GET',
      `/repos/${this.repository}/issues?state=open`
    );

    return data
      .filter(issue => !issue.pull_request) // PRを除外
      .map(issue => ({
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        labels: issue.labels.map(l => l.name),
        state: issue.state as 'open' | 'closed',
        url: issue.html_url,
      }));
  }
}
