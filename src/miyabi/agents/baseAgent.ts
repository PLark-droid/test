/**
 * Miyabi Framework - Base Agent
 * 全エージェントの基底クラス
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentContext, TaskResult, AgentMessage, AgentType } from '../types.js';

export abstract class BaseAgent {
  protected client: Anthropic;
  protected context: AgentContext;
  protected agentType: AgentType;
  protected systemPrompt: string;

  constructor(context: AgentContext, agentType: AgentType, systemPrompt: string) {
    this.context = context;
    this.agentType = agentType;
    this.systemPrompt = systemPrompt;
    this.client = new Anthropic({
      apiKey: context.anthropicApiKey,
    });
  }

  protected async chat(messages: AgentMessage[]): Promise<string> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: this.systemPrompt,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const textContent = response.content.find(c => c.type === 'text');
    return textContent ? textContent.text : '';
  }

  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.agentType.toUpperCase()}] ${message}`);
  }

  abstract execute(): Promise<TaskResult>;
}
