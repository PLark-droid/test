/**
 * Miyabi Framework - Code Generation Agent
 * AI駆動コード生成エージェント
 *
 * 責任: Issueの要件に基づいてコードを生成
 */

import { BaseAgent } from './baseAgent.js';
import { AgentContext, TaskResult, GeneratedCode, CodeChange, AnalysisResult } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

const SYSTEM_PROMPT = `あなたはコード生成エージェントです。
与えられた要件とコンテキストに基づいて、高品質なTypeScriptコードを生成してください。

ガイドライン:
1. TypeScript strict modeに準拠
2. ESM (import/export) を使用
3. 適切なエラーハンドリング
4. 必要最小限の変更
5. 既存のコードスタイルに準拠

出力形式（JSON）:
{
  "files": [
    {
      "filePath": "相対パス",
      "content": "ファイル内容",
      "action": "create|modify"
    }
  ],
  "explanation": "変更内容の説明"
}`;

export class CodeGenAgent extends BaseAgent {
  private analysis: AnalysisResult | null = null;

  constructor(context: AgentContext, analysis?: AnalysisResult) {
    super(context, 'codegen', SYSTEM_PROMPT);
    this.analysis = analysis || null;
  }

  async execute(): Promise<TaskResult> {
    this.log(`Issue #${this.context.issue.number} のコード生成を開始...`);

    try {
      // 関連ファイルを読み込む
      const relevantFiles = await this.findRelevantFiles();
      this.log(`関連ファイル: ${relevantFiles.length}件`);

      // コードを生成
      const generatedCode = await this.generateCode(relevantFiles);
      this.log(`生成ファイル: ${generatedCode.files.length}件`);

      // ファイルを書き込む
      await this.writeFiles(generatedCode.files);
      this.log('ファイル書き込み完了');

      return {
        success: true,
        message: `${generatedCode.files.length}件のファイルを生成/更新しました`,
        data: generatedCode,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`エラー: ${errorMessage}`);
      return {
        success: false,
        message: 'コード生成に失敗しました',
        error: errorMessage,
      };
    }
  }

  private async findRelevantFiles(): Promise<{ path: string; content: string }[]> {
    const files: { path: string; content: string }[] = [];
    const srcDir = path.join(this.context.workDir, 'src');

    // Issueのタイトルと本文からキーワードを抽出
    const keywords = this.extractKeywords();
    this.log(`キーワード: ${keywords.join(', ')}`);

    // srcディレクトリのファイルを検索
    if (fs.existsSync(srcDir)) {
      const allFiles = this.getAllFiles(srcDir);

      for (const filePath of allFiles) {
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const relativePath = path.relative(this.context.workDir, filePath);

        // キーワードマッチング
        const isRelevant = keywords.some(keyword =>
          content.toLowerCase().includes(keyword.toLowerCase()) ||
          relativePath.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isRelevant) {
          files.push({ path: relativePath, content });
        }
      }
    }

    // 最大10ファイルに制限
    return files.slice(0, 10);
  }

  private extractKeywords(): string[] {
    const text = `${this.context.issue.title} ${this.context.issue.body || ''}`;
    const keywords: string[] = [];

    // よく使われるプログラミング関連の単語を抽出
    const matches = text.match(/[A-Z][a-z]+|[a-z]+|カレンダー|イベント|API|認証|取得/g);
    if (matches) {
      keywords.push(...new Set(matches.filter(m => m.length > 2)));
    }

    return keywords.slice(0, 10);
  }

  private getAllFiles(dir: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        files.push(...this.getAllFiles(fullPath));
      } else if (stat.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private async generateCode(relevantFiles: { path: string; content: string }[]): Promise<GeneratedCode> {
    // コンテキストを構築
    let context = `## Issue情報
タイトル: ${this.context.issue.title}
本文: ${this.context.issue.body || '(なし)'}

`;

    if (this.analysis) {
      context += `## 分析結果
複雑度: ${this.analysis.complexity}
要約: ${this.analysis.summary}
タスク:
${this.analysis.tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

`;
    }

    context += `## 関連ファイル\n`;
    for (const file of relevantFiles) {
      context += `\n### ${file.path}\n\`\`\`typescript\n${file.content}\n\`\`\`\n`;
    }

    const prompt = `${context}

上記の情報に基づいて、必要なコード変更を生成してください。
既存ファイルの修正が必要な場合は、ファイル全体の内容を出力してください。`;

    const response = await this.chat([
      { role: 'user', content: prompt },
    ]);

    // JSONを抽出
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // JSONが見つからない場合は説明のみ返す
      return {
        files: [],
        explanation: response,
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        files: parsed.files || [],
        explanation: parsed.explanation || '',
      };
    } catch {
      return {
        files: [],
        explanation: response,
      };
    }
  }

  private async writeFiles(files: CodeChange[]): Promise<void> {
    for (const file of files) {
      const fullPath = path.join(this.context.workDir, file.filePath);
      const dir = path.dirname(fullPath);

      // ディレクトリを作成
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (file.action === 'delete') {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          this.log(`削除: ${file.filePath}`);
        }
      } else {
        fs.writeFileSync(fullPath, file.content, 'utf-8');
        this.log(`${file.action === 'create' ? '作成' : '更新'}: ${file.filePath}`);
      }
    }
  }
}
