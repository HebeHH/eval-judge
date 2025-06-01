# API Interfaces Documentation

This document provides complete interface specifications for the LLM processing APIs. These interfaces are designed to be implementation-agnostic and provide all necessary information for integration.

## Core Data Types

### Message
```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### Test
```typescript
interface Test {
  id: number;
  text: string;
}
```

### TestResult
```typescript
interface TestResult {
  id: number;
  score: number; // Integer between 1-10 inclusive
}
```

## API Endpoints

### POST /api/prompt

**Purpose**: Execute a single LLM prompt with custom system message and conversation history.

**Request Body**:
```typescript
{
  system: string;     // System prompt to guide LLM behavior
  messages: Message[]; // Conversation history (user/assistant messages)
}
```

**Response**:
```typescript
{
  response: string; // LLM generated response
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields (system, messages)
- `500 Internal Server Error`: LLM API failure or processing error

**Example Usage**:
```javascript
const response = await fetch('/api/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    system: "You are a helpful coding assistant.",
    messages: [
      { role: 'user', content: 'How do I create a React component?' }
    ]
  })
});
const data = await response.json();
console.log(data.response); // LLM's answer
```

### POST /api/batchScore

**Purpose**: Evaluate multiple test cases against judging criteria with optional real-time progress tracking.

**Request Body**:
```typescript
{
  judgingMatrix: string; // Evaluation criteria and scoring guidelines
  tests: Test[];         // Array of test cases to evaluate
}
```

**Standard Response** (Content-Type: application/json):
```typescript
{
  results: TestResult[]; // Array of scores for each test
}
```

**Streaming Response** (Accept: text/event-stream):
Server-Sent Events stream with the following message types:

```typescript
// Progress update
{
  type: 'progress';
  current: number;     // Current test being processed (1-indexed)
  total: number;       // Total number of tests
  currentTest: number; // ID of current test being processed
}

// Individual result
{
  type: 'result';
  result: TestResult;  // Score for completed test
}

// Processing complete
{
  type: 'complete';
  results: TestResult[]; // Final array of all results
}

// Error occurred
{
  type: 'error';
  error: string;       // Error message
}
```

**Error Responses**:
- `400 Bad Request`: Missing required fields (judgingMatrix, tests) or invalid tests array
- `500 Internal Server Error`: LLM API failure or processing error

**Example Usage (Standard)**:
```javascript
const response = await fetch('/api/batchScore', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    judgingMatrix: "Rate clarity and accuracy on a scale of 1-10...",
    tests: [
      { id: 1, text: "Sample response to evaluate" },
      { id: 2, text: "Another response to score" }
    ]
  })
});
const data = await response.json();
console.log(data.results); // [{ id: 1, score: 8 }, { id: 2, score: 6 }]
```

**Example Usage (Streaming)**:
```javascript
const response = await fetch('/api/batchScore', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({
    judgingMatrix: "Rate clarity and accuracy...",
    tests: [/* test array */]
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      switch (data.type) {
        case 'progress':
          console.log(`Processing ${data.current}/${data.total}`);
          break;
        case 'result':
          console.log(`Test ${data.result.id}: ${data.result.score}/10`);
          break;
        case 'complete':
          console.log('All tests completed:', data.results);
          break;
        case 'error':
          console.error('Error:', data.error);
          break;
      }
    }
  }
}
```

## Scoring System

### Score Range
All scores are integers between 1 and 10 (inclusive):
- **1-3**: Poor quality, major issues, fails to meet criteria
- **4-6**: Average quality, some issues, partially meets criteria
- **7-8**: Good quality, minor issues, meets most criteria
- **9-10**: Excellent quality, no issues, exceeds criteria

### Judging Matrix Format
The `judgingMatrix` should include:
1. **Evaluation criteria** with specific aspects to assess
2. **Weighting** (optional) for different criteria
3. **Score interpretation** guidelines
4. **Examples** (optional) of what constitutes different score levels

**Example Judging Matrix**:
```
Evaluate responses based on:
1. Accuracy and factual correctness (40%)
2. Clarity and readability (30%)
3. Completeness and thoroughness (20%)
4. Helpfulness and actionability (10%)

Scoring guidelines:
- 1-3: Contains errors, unclear, incomplete
- 4-6: Mostly accurate, somewhat clear, adequate detail
- 7-8: Accurate, clear, comprehensive
- 9-10: Exceptional accuracy, crystal clear, goes above and beyond
```

## Rate Limits and Performance

### Expected Response Times
- `/api/prompt`: 2-10 seconds depending on response complexity
- `/api/batchScore`: 5-15 seconds per test case (processed sequentially)

### Recommended Usage Patterns
- **Single evaluations**: Use `/api/prompt` for one-off LLM interactions
- **Batch processing**: Use `/api/batchScore` for evaluating multiple items
- **Real-time feedback**: Use streaming mode for `/api/batchScore` when processing >3 items
- **Background processing**: Use standard mode for `/api/batchScore` when UI doesn't need progress updates

### Error Handling Best Practices
1. Always check response status codes
2. Implement retry logic for 500 errors with exponential backoff
3. For streaming responses, handle connection drops gracefully
4. Validate input data before sending requests
5. Set appropriate timeouts (recommend 60s for batch operations)

## Security Considerations

### Input Validation
- All text inputs are processed by LLM - avoid sending sensitive data
- Test IDs should be positive integers
- Score values are automatically constrained to 1-10 range

### Authentication
- No authentication required for these endpoints
- Consider implementing rate limiting in production
- Monitor usage patterns for abuse detection

### Data Privacy
- No conversation history is stored server-side
- Each request is processed independently
- Consider data retention policies for logged requests

## Evaluation Prompt Builder Integration

### Overview
The Evaluation Prompt Builder component generates three different evaluation prompts and allows users to select one for use in the evaluation system. This section documents how to integrate with the prompt selection functionality.

### Selection Event Data Structure
When a user clicks "Select This Prompt" on any evaluation prompt card, the following data structure is logged to console and can be captured for integration:

```typescript
interface SelectedEvaluationPrompt {
  title: string;           // e.g., "Precision-Focused Evaluation"
  approach: string;        // Description of the evaluation approach
  content: string;         // The full evaluation prompt text
  criteria: string;        // The original criteria: "WITTY" | "INTELLIGENT" | "KIND"
  index: number;          // 0, 1, or 2 (corresponding to the three prompt types)
}
```

### Integration Points

#### 1. Capturing Selection Events
To capture when a user selects an evaluation prompt, modify the onClick handler in `EvalPromptBuilder.tsx`:

```typescript
// Current implementation (line ~320 in EvalPromptBuilder.tsx)
onClick={() => {
  // TODO: Hook up to evaluation system
  console.log('Selected evaluation prompt:', {
    title: promptInfo.title,
    approach: promptInfo.approach,
    content: finalPrompt.content,
    criteria: selectedCriteria,
    index: promptInfo.index
  });
}}

// Replace with your integration:
onClick={() => {
  const selectedPrompt: SelectedEvaluationPrompt = {
    title: promptInfo.title,
    approach: promptInfo.approach,
    content: finalPrompt.content,
    criteria: selectedCriteria,
    index: promptInfo.index
  };
  
  // Your integration code here:
  handlePromptSelection(selectedPrompt);
}}
```

#### 2. Using Selected Prompts for Evaluation
The selected prompt content can be used directly as a `judgingMatrix` parameter for the `/api/batchScore` endpoint:

```typescript
function handlePromptSelection(selectedPrompt: SelectedEvaluationPrompt) {
  // Store the selected prompt for later use
  const judgingMatrix = selectedPrompt.content;
  
  // Example: Use with batch scoring
  const evaluateTests = async (tests: Test[]) => {
    const response = await fetch('/api/batchScore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        judgingMatrix: judgingMatrix,
        tests: tests
      })
    });
    return response.json();
  };
  
  // Example: Navigate to evaluation interface
  router.push('/evaluate', { 
    state: { 
      selectedPrompt,
      judgingMatrix 
    } 
  });
}
```

#### 3. Prompt Type Mapping
The three prompt types correspond to different evaluation approaches:

```typescript
const PROMPT_TYPES = {
  0: {
    name: 'precision-focused',
    systemPrompt: 'EVAL_GENERATOR_SYSTEM_PROMPT_1',
    focus: 'Clarity, measurability, and practical application'
  },
  1: {
    name: 'holistic',
    systemPrompt: 'EVAL_GENERATOR_SYSTEM_PROMPT_2', 
    focus: 'Multiple dimensions with contextual understanding'
  },
  2: {
    name: 'research-grade',
    systemPrompt: 'EVAL_GENERATOR_SYSTEM_PROMPT_3',
    focus: 'well-rounded, flexible evaluation'
  }
};
```

### Recommended Integration Patterns

#### Pattern 1: Direct Navigation
```typescript
function handlePromptSelection(selectedPrompt: SelectedEvaluationPrompt) {
  // Store in localStorage or state management
  localStorage.setItem('selectedEvaluationPrompt', JSON.stringify(selectedPrompt));
  
  // Navigate to evaluation page
  window.location.href = '/evaluate';
}
```

#### Pattern 2: Modal/Overlay Integration
```typescript
function handlePromptSelection(selectedPrompt: SelectedEvaluationPrompt) {
  // Show confirmation modal
  setSelectedPrompt(selectedPrompt);
  setShowConfirmationModal(true);
}
```

#### Pattern 3: State Management Integration
```typescript
// With Redux/Zustand/Context
function handlePromptSelection(selectedPrompt: SelectedEvaluationPrompt) {
  dispatch(setEvaluationPrompt(selectedPrompt));
  dispatch(setCurrentStep('test-upload'));
}
```

### Testing Integration
To test your integration without going through the full prompt building flow:

```typescript
// Mock data for testing
const mockSelectedPrompt: SelectedEvaluationPrompt = {
  title: "Academic Structure",
  approach: "Emphasizes clarity, measurability, and practical application",
  content: "Evaluate responses based on...", // Your test prompt content
  criteria: "WITTY",
  index: 0
};

handlePromptSelection(mockSelectedPrompt);
```
