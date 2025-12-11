/**
 * Miyabi Framework - Coordinator Agent
 * タスク統括・並列実行制御エージェント
 *
 * 責任: 全体のワークフローを統括し、各エージェントを協調させる
 */

import { BaseAgent } from './baseAgent.js';
import { AgentContext, TaskResult, AnalysisResult } from '../types.js';
import { IssueAgent } from './issueAgent.js';
import { CodeGenAgent } from './codeGenAgent.js';

const SYSTEM_PROMPT = `あなたはCoordinatorエージェントです。
Issue処理の全体フローを統括し、各エージェントの実行を制御します。

ワークフロー:
1. IssueAgent → Issue分析・ラベル付与
2. CodeGenAgent → コード生成
3. (将来) ReviewAgent → コードレビュー
4. (将来) TestAgent → テスト実行
5. (将来) PRAgent → PR作成

各ステップの結果を確認し、次のステップに進むか判断します。`;

export class CoordinatorAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context, 'coordinator', SYSTEM_PROMPT);
  }

  async execute(): Promise<TaskResult> {
    this.log(`=== Miyabi Coordinator 開始 ===`);
    this.log(`Issue #${this.context.issue.number}: ${this.context.issue.title}`);

    const results: { step: string; result: TaskResult }[] = [];

    try {
      // Step 1: Issue分析
      this.log('\n--- Step 1: Issue分析 ---');
      const issueAgent = new IssueAgent(this.context);
      const issueResult = await issueAgent.execute();
      results.push({ step: 'issue-analysis', result: issueResult });

      if (!issueResult.success) {
        return this.createFinalResult(results, false, 'Issue分析に失敗しました');
      }

      const analysis = (issueResult.data as { analysis: AnalysisResult })?.analysis;
      this.log(`分析結果: 複雑度=${analysis?.complexity}, タスク数=${analysis?.tasks?.length || 0}`);

      // Step 2: コード生成
      this.log('\n--- Step 2: コード生成 ---');
      const codeGenAgent = new CodeGenAgent(this.context, analysis);
      const codeGenResult = await codeGenAgent.execute();
      results.push({ step: 'code-generation', result: codeGenResult });

      if (!codeGenResult.success) {
        return this.createFinalResult(results, false, 'コード生成に失敗しました');
      }

      // Step 3: 結果のサマリー
      this.log('\n--- 完了 ---');
      return this.createFinalResult(results, true, 'Issue処理が完了しました');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`エラー: ${errorMessage}`);
      return this.createFinalResult(results, false, errorMessage);
    }
  }

  private createFinalResult(
    results: { step: string; result: TaskResult }[],
    success: boolean,
    message: string
  ): TaskResult {
    const summary = results.map(r => `- ${r.step}: ${r.result.success ? '✓' : '✗'}`).join('\n');

    this.log('\n=== 実行サマリー ===');
    this.log(summary);
    this.log(`\n最終結果: ${success ? '成功' : '失敗'}`);

    return {
      success,
      message,
      data: {
        steps: results,
        summary,
      },
    };
  }
}
