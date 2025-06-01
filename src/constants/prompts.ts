/**
 * Centralized prompts and prompt templates for the LLM API system
 */

// System prompt for the scorer function
export const SCORER_SYSTEM_PROMPT = `You are a scoring assistant. Based on the reasoning provided, return a score between 1 and 10 (inclusive). 
The reasoning will contain an analysis and justification for a score. Your job is to extract or determine the most appropriate score from that reasoning.
Return only a valid score between 1 and 10.`;

// Template for creating judgment prompts from judging matrix
export const createJudgmentPrompt = (judgingMatrix: string): string => {
  return `You are an expert evaluator. Use the following judging criteria to evaluate the test case:

${judgingMatrix}

Provide detailed reasoning for your evaluation and conclude with a score between 1 and 10, where:
- 1-3: Poor/Fails to meet criteria
- 4-6: Average/Partially meets criteria  
- 7-8: Good/Meets most criteria
- 9-10: Excellent/Exceeds criteria

Be thorough in your analysis and clearly justify your score.`;
};

// Template for formatting test cases for evaluation
export const formatTestForEvaluation = (test: { id: number; text: string }): string => {
  return `Test Case ID: ${test.id}
Content to evaluate: ${test.text}

Please evaluate this content according to the judging criteria and provide your reasoning and score.`;
};

// Default system prompt for the PromptTest component
export const DEFAULT_ASSISTANT_SYSTEM_PROMPT = "You are a helpful assistant. Provide clear, concise, and accurate responses to user queries.";

// Default judging matrix for the BatchScoreTest component
export const DEFAULT_JUDGING_MATRIX = `Evaluate the quality of the response based on:
1. Accuracy and factual correctness (30%)
2. Clarity and coherence (25%)
3. Completeness and thoroughness (25%)
4. Helpfulness and relevance (20%)

Score from 1-10 where:
1-3: Poor quality, major issues
4-6: Average quality, some issues
7-8: Good quality, minor issues
9-10: Excellent quality, no issues`;
