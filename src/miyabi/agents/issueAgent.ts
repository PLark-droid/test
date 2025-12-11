/**
 * Miyabi Framework - Issue Agent
 * Issue分析・ラベル管理エージェント
 *
 * 責任: Issueの内容を分析し、適切なラベルを付与
 */

import { BaseAgent } from './baseAgent.js';
import { AgentContext, TaskResult, AnalysisResult, LABELS } from '../types.js';

const SYSTEM_PROMPT = `あなたはIssue分析エージェントです。
GitHubのIssueを分析し、以下を判断してください：

1. **複雑度 (complexity)**: small, medium, large, xlarge
   - small: 1ファイル以内、30分以内で完了
   - medium: 2-5ファイル、1-4時間
   - large: 5-10ファイル、1-3日
   - xlarge: 10+ファイル、1週間以上

2. **タイプ (type)**: ${LABELS.type.join(', ')}

3. **優先度 (priority)**: ${LABELS.priority.join(', ')}

4. **必要なタスク**: 実装に必要なステップを列挙

JSON形式で回答してください:
{
  "complexity": "small|medium|large|xlarge",
  "type": "bug|feature|...",
  "priority": "P0-Critical|P1-High|...",
  "summary": "Issueの要約（1-2文）",
  "tasks": ["タスク1", "タスク2", ...]
}`;

export class IssueAgent extends BaseAgent {
  constructor(context: AgentContext) {
    super(context, 'issue', SYSTEM_PROMPT);
  }

  async execute(): Promise<TaskResult> {
    this.log(`Issue #${this.context.issue.number} を分析中...`);

    try {
      const analysis = await this.analyzeIssue();
      this.log(`分析完了: 複雑度=${analysis.complexity}, タスク数=${analysis.tasks.length}`);

      // ラベルを提案
      const suggestedLabels = this.generateLabels(analysis);
      this.log(`提案ラベル: ${suggestedLabels.join(', ')}`);

      return {
        success: true,
        message: `Issue #${this.context.issue.number} の分析が完了しました`,
        data: {
          analysis,
          suggestedLabels,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`エラー: ${errorMessage}`);
      return {
        success: false,
        message: 'Issue分析に失敗しました',
        error: errorMessage,
      };
    }
  }

  private async analyzeIssue(): Promise<AnalysisResult> {
    const prompt = `以下のIssueを分析してください：

タイトル: ${this.context.issue.title}

本文:
${this.context.issue.body || '(本文なし)'}

現在のラベル: ${this.context.issue.labels.join(', ') || '(なし)'}`;

    const response = await this.chat([
      { role: 'user', content: prompt },
    ]);

    // JSONを抽出
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('分析結果のパースに失敗しました');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      complexity: parsed.complexity || 'medium',
      suggestedLabels: [],
      estimatedEffort: this.complexityToEffort(parsed.complexity),
      summary: parsed.summary || '',
      tasks: parsed.tasks || [],
    };
  }

  private generateLabels(analysis: AnalysisResult): string[] {
    const labels: string[] = [];

    // 複雑度ラベル
    labels.push(`complexity:${analysis.complexity}`);

    // 状態ラベル
    labels.push('state:analyzing');

    // エージェントラベル
    labels.push('agent:issue');

    return labels;
  }

  private complexityToEffort(complexity: string): string {
    const mapping: Record<string, string> = {
      small: '1h',
      medium: '4h',
      large: '1d',
      xlarge: '1w',
    };
    return mapping[complexity] || '4h';
  }
}
