---
description: Miyabi Agent実行 - Issue自動処理
---

# Miyabi Agent実行

GitHub IssueをMiyabi Autonomous Agentで自動処理します。

**重要**: このコマンドはClaude Code自身がMiyabiフレームワークのワークフローを実行します。
ANTHROPIC_API_KEYの別途設定は不要です。

## 実行方法

Issue番号を指定して実行:

```
/miyabi-agent 3
```

または複数Issue:

```
/miyabi-agent 3,4,5
```

## Miyabiワークフロー

Claude Codeは以下のステップを順次実行します:

### Step 1: Issue分析（IssueAgent相当）
```
Issue情報を取得し、識学理論65ラベル体系で分類:
- type: bug, feature, refactor, docs, test, chore, security
- priority: P0-Critical, P1-High, P2-Medium, P3-Low
- complexity: small, medium, large, xlarge
- category: frontend, backend, infra, dx, security
```

### Step 2: タスク分解（CoordinatorAgent相当）
```
IssueをDAG（Directed Acyclic Graph）に分解:
- サブタスクの特定
- 依存関係の分析
- 並列実行可能なタスクの識別
```

### Step 3: コード生成（CodeGenAgent相当）
```
TypeScript strict modeでコード実装:
- 要件に基づく実装
- テストコードの生成
- セキュリティベストプラクティス準拠
```

### Step 4: 品質チェック（ReviewAgent相当）
```
100点満点で品質スコアリング:
- 正確性: 20点
- セキュリティ: 20点
- パフォーマンス: 20点
- 保守性: 20点
- テスト: 20点

合格基準: 80点以上
```

### Step 5: PR作成（PRAgent相当）
```
Draft Pull Request作成:
- Conventional Commits準拠
- 変更サマリー
- テストプラン
```

## 実行例

ユーザー: `/miyabi-agent 3`

Claude Codeの動作:
1. `gh issue view 3` でIssue情報取得
2. Issue分析を実行、ラベル提案
3. `gh issue edit 3 --add-label "..."` でラベル付与
4. コードベース探索、実装計画作成
5. コード生成・編集
6. テスト実行 (`npm test`)
7. 品質チェック（lint, typecheck）
8. PRまたはコミット作成

## GitHub Issue形式

Miyabiが処理しやすいIssue形式:

```markdown
## 概要
[何を実現したいか]

## 背景
[なぜ必要か]

## 受け入れ条件
- [ ] 条件1
- [ ] 条件2

## 技術的な検討事項
[実装上の注意点があれば]
```

## 成功条件

- Issue分析完了
- コード生成成功
- TypeScriptエラー 0件
- ESLintエラー 0件
- テスト合格
- 品質スコア 80点以上
- PR/コミット作成

---

Miyabiフレームワークは識学理論（Shikigaku Theory）に基づく自律型開発システムです。
