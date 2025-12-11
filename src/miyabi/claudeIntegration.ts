/**
 * Miyabi Framework - Claude Code Integration
 * Claude Codeから直接Miyabi Agentを実行するためのモジュール
 *
 * このモジュールにより、ANTHROPIC_API_KEYを別途設定せずとも
 * Claude Codeの実行コンテキストでMiyabiフレームワークを使用可能
 */

import { Issue, AgentContext, TaskResult, AgentType } from './types.js';
import { GitHubClient } from './github.js';

/**
 * Miyabi Issue処理のプロンプト生成
 */
export function generateIssueAnalysisPrompt(issue: Issue): string {
  return `
# Issue分析タスク

以下のGitHub Issueを分析し、Miyabiフレームワークの識学理論に基づいてラベル付けと実装計画を作成してください。

## Issue情報
- 番号: #${issue.number}
- タイトル: ${issue.title}
- 本文: ${issue.body}
- 現在のラベル: ${issue.labels.join(', ') || 'なし'}

## 分析項目

### 1. ラベル分類（識学理論65ラベル体系）
以下のカテゴリから適切なラベルを選択:
- type: bug, feature, refactor, docs, test, chore, security
- priority: P0-Critical, P1-High, P2-Medium, P3-Low
- complexity: small, medium, large, xlarge
- category: frontend, backend, infra, dx, security
- effort: 1h, 4h, 1d, 3d, 1w, 2w

### 2. タスク分解
このIssueを実装するためのサブタスクをリストアップ

### 3. 依存関係
- 先行タスク（このIssueの前に完了すべきもの）
- 後続タスク（このIssueの後に実行可能になるもの）

### 4. リスク評価
- 技術的リスク
- ビジネスリスク
- 見積もりの不確実性

## 出力形式
JSON形式で出力してください:
\`\`\`json
{
  "labels": ["type:...", "priority:...", ...],
  "tasks": [
    { "title": "...", "description": "...", "effort": "..." }
  ],
  "dependencies": {
    "blocking": [],
    "blocked_by": []
  },
  "risks": {
    "technical": "...",
    "business": "...",
    "uncertainty": "low|medium|high"
  },
  "summary": "1-2文の要約"
}
\`\`\`
`;
}

/**
 * コード生成プロンプト
 */
export function generateCodeGenPrompt(issue: Issue, analysis: string): string {
  return `
# コード生成タスク

以下のIssueに対するコードを生成してください。

## Issue情報
- 番号: #${issue.number}
- タイトル: ${issue.title}
- 本文: ${issue.body}

## 分析結果
${analysis}

## コーディングガイドライン
- TypeScript strict mode
- ESLint準拠
- セキュリティベストプラクティス（OWASP Top 10対策）
- テストコードも含める

## 出力形式
変更が必要なファイルごとに以下の形式で出力:

### ファイル: path/to/file.ts
\`\`\`typescript
// コード内容
\`\`\`

### テスト: path/to/file.test.ts
\`\`\`typescript
// テストコード
\`\`\`
`;
}

/**
 * レビュープロンプト
 */
export function generateReviewPrompt(code: string): string {
  return `
# コードレビュータスク

以下のコードをレビューし、品質スコアを算出してください。

## レビュー対象コード
${code}

## レビュー項目（各20点満点、合計100点）

### 1. 正確性（20点）
- 要件を満たしているか
- バグがないか
- エッジケースが考慮されているか

### 2. セキュリティ（20点）
- インジェクション脆弱性
- 認証・認可の適切さ
- 機密情報の扱い

### 3. パフォーマンス（20点）
- 効率的なアルゴリズム
- メモリ使用量
- 不要な処理がないか

### 4. 保守性（20点）
- コードの読みやすさ
- 適切な抽象化
- コメントの適切さ

### 5. テスト（20点）
- テストカバレッジ
- テストの品質
- エッジケースのテスト

## 出力形式
\`\`\`json
{
  "score": 85,
  "breakdown": {
    "correctness": 18,
    "security": 17,
    "performance": 16,
    "maintainability": 18,
    "testing": 16
  },
  "issues": [
    { "severity": "high|medium|low", "description": "...", "suggestion": "..." }
  ],
  "passed": true,
  "summary": "レビュー結果の要約"
}
\`\`\`

注意: スコアが80点以上で passed: true
`;
}

/**
 * Miyabiワークフローステップ定義
 */
export interface MiyabiWorkflowStep {
  agent: AgentType;
  prompt: string;
  dependsOn?: AgentType[];
}

/**
 * Issueに対するMiyabiワークフローを生成
 */
export function createMiyabiWorkflow(issue: Issue): MiyabiWorkflowStep[] {
  return [
    {
      agent: 'issue',
      prompt: generateIssueAnalysisPrompt(issue),
    },
    {
      agent: 'codegen',
      prompt: '', // 動的に生成（issue分析結果に依存）
      dependsOn: ['issue'],
    },
    {
      agent: 'review',
      prompt: '', // 動的に生成（codegen結果に依存）
      dependsOn: ['codegen'],
    },
    {
      agent: 'pr',
      prompt: '', // 動的に生成（全結果に依存）
      dependsOn: ['review'],
    },
  ];
}

/**
 * Claude Code用のMiyabi実行サマリー生成
 */
export function formatMiyabiSummary(results: Map<AgentType, TaskResult>): string {
  const lines: string[] = [
    '🌸 **Miyabi Framework 実行結果**',
    '',
  ];

  for (const [agent, result] of results) {
    const icon = result.success ? '✅' : '❌';
    lines.push(`### ${icon} ${agent.toUpperCase()} Agent`);
    lines.push(result.message);
    lines.push('');
  }

  return lines.join('\n');
}
