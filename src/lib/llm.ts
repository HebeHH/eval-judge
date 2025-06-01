import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { 
  SCORER_SYSTEM_PROMPT, 
  createJudgmentPrompt, 
  formatTestForEvaluation 
} from '@/constants/prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function promptGeneric(
  system: string,
  messages: Message[]
): Promise<string> {
  const allMessages: Message[] = [
    { role: 'system', content: system },
    ...messages
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: allMessages,
  });

  return completion.choices[0]?.message?.content || '';
}

const ScoreSchema = z.object({
  score: z.number().min(1).max(10)
});

export async function scorer(reasoning: string): Promise<number> {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SCORER_SYSTEM_PROMPT },
      { role: 'user', content: reasoning }
    ],
    response_format: zodResponseFormat(ScoreSchema, 'score'),
  });

  const result = JSON.parse(completion.choices[0]?.message?.content || '{"score": 5}');
  return result.score;
}

export function formJudgementPrompt(judgingMatrix: string): string {
  return createJudgmentPrompt(judgingMatrix);
}

export function formatTest(test: { id: number; text: string }): string {
  return formatTestForEvaluation(test);
} 