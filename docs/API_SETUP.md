# LLM API Setup and Usage

This Next.js application provides API endpoints for LLM processing using OpenAI's GPT-4o-mini model.

## Environment Setup

Create a `.env.local` file in the root directory with:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## API Endpoints

### `/api/prompt`

**Purpose**: Direct interface to OpenAI API for general prompting

**Input**:
```json
{
  "system": "string - system prompt",
  "messages": [
    {
      "role": "user|assistant|system",
      "content": "string - message content"
    }
  ]
}
```

**Output**:
```json
{
  "response": "string - LLM response"
}
```

### `/api/batchScore`

**Purpose**: Batch scoring of multiple test cases with progress tracking

**Input**:
```json
{
  "judgingMatrix": "string - evaluation criteria",
  "tests": [
    {
      "id": "number - test identifier",
      "text": "string - content to evaluate"
    }
  ]
}
```

**Output** (regular):
```json
{
  "results": [
    {
      "id": "number - test identifier",
      "score": "number - score 1-10"
    }
  ]
}
```

**Streaming Output** (when Accept: text/event-stream):
Server-Sent Events with:
- Progress updates: `{"type": "progress", "current": 1, "total": 3, "currentTest": 1}`
- Individual results: `{"type": "result", "result": {"id": 1, "score": 8}}`
- Completion: `{"type": "complete", "results": [...]}`
- Errors: `{"type": "error", "error": "error message"}`

## Core Functions

### `promptGeneric(system, messages)`
- Calls OpenAI API with provided system prompt and message history
- Returns the LLM response as a string

### `scorer(reasoning)`
- Takes reasoning text and extracts/validates a score 1-10
- Uses structured outputs with Zod schema validation
- Returns a number between 1-10

## Testing Interface

The application includes two test components:

1. **PromptTest**: Test the `/api/prompt` endpoint with a simple chat interface
2. **BatchScoreTest**: Test the `/api/batchScore` endpoint with progress tracking

## Usage Examples

### Testing Prompt API
1. Navigate to the home page
2. Enter a message in the "Test /prompt API" section
3. Click "Send Message" to see the response

### Testing Batch Score API
1. Modify the judging matrix criteria as needed
2. Review the 3 dummy test cases
3. Click "Start Batch Scoring" to see real-time progress
4. View individual scores and average when complete

## Technical Details

- Uses OpenAI package v5.0.1 with latest structured outputs
- Implements Server-Sent Events for real-time progress tracking
- Built with Next.js 15, TypeScript, and Tailwind CSS
- Zod schema validation for structured outputs
- Error handling and loading states throughout 