/**
 * Miyabi Framework - Types
 * 識学理論に基づく自律開発フレームワークの型定義
 */

export interface Issue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  state: 'open' | 'closed';
  url: string;
}

export interface TaskResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface AgentContext {
  issue: Issue;
  repository: string;
  workDir: string;
  githubToken: string;
  anthropicApiKey: string;
}

export interface CodeChange {
  filePath: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
}

export interface AnalysisResult {
  complexity: 'small' | 'medium' | 'large' | 'xlarge';
  suggestedLabels: string[];
  estimatedEffort: string;
  summary: string;
  tasks: string[];
}

export interface GeneratedCode {
  files: CodeChange[];
  explanation: string;
  testFiles?: CodeChange[];
}

export type AgentType =
  | 'coordinator'
  | 'issue'
  | 'codegen'
  | 'review'
  | 'test'
  | 'pr'
  | 'deployment';

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const LABELS = {
  type: ['bug', 'feature', 'refactor', 'docs', 'test', 'chore', 'security'],
  priority: ['P0-Critical', 'P1-High', 'P2-Medium', 'P3-Low'],
  state: ['pending', 'analyzing', 'implementing', 'reviewing', 'testing', 'deploying', 'done'],
  agent: ['codegen', 'review', 'deployment', 'test', 'coordinator', 'issue', 'pr'],
  complexity: ['small', 'medium', 'large', 'xlarge'],
} as const;
