import { NextRequest, NextResponse } from 'next/server';
import { promptGeneric, scorer, formJudgementPrompt, formatTest } from '@/lib/llm';

export interface Test {
  id: number;
  text: string;
}

export interface UserTestJudgement {
  testAid: number;
  testBid: number;
  judgement: number;
}

interface BatchScoreRequest {
  judgingMatrix: string;
  tests: Test[];
}

interface BatchScoreResult {
  id: number;
  score: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchScoreRequest = await request.json();
    const { judgingMatrix, tests } = body;

    if (!judgingMatrix || !tests || !Array.isArray(tests)) {
      return NextResponse.json(
        { error: 'Missing required fields: judgingMatrix and tests array' },
        { status: 400 }
      );
    }

    // Check if this is a request for streaming progress
    const acceptHeader = request.headers.get('accept');
    const wantsStream = acceptHeader?.includes('text/event-stream');

    if (wantsStream) {
      // Return streaming response with progress updates
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const results: BatchScoreResult[] = [];
            const judgementPrompt = formJudgementPrompt(judgingMatrix);

            for (let i = 0; i < tests.length; i++) {
              const test = tests[i];
              
              // Send progress update
              const progressData = {
                type: 'progress',
                current: i + 1,
                total: tests.length,
                currentTest: test.id
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(progressData)}\n\n`));

              // Process the test
              const testPrompt = formatTest(test);
              const reasoning = await promptGeneric(judgementPrompt, [
                { role: 'user', content: testPrompt }
              ]);
              const score = await scorer(reasoning);

              results.push({
                id: test.id,
                score: score
              });

              // Send result update
              const resultData = {
                type: 'result',
                result: { id: test.id, score: score }
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(resultData)}\n\n`));
            }

            // Send completion
            const completeData = {
              type: 'complete',
              results: results
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(completeData)}\n\n`));
            controller.close();
          } catch (error) {
            console.error('Error in streaming batchScore:', error);
            const errorData = {
              type: 'error',
              error: 'Internal server error'
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Regular non-streaming response
      const results: BatchScoreResult[] = [];
      const judgementPrompt = formJudgementPrompt(judgingMatrix);

      for (const test of tests) {
        const testPrompt = formatTest(test);
        const reasoning = await promptGeneric(judgementPrompt, [
          { role: 'user', content: testPrompt }
        ]);
        const score = await scorer(reasoning);

        results.push({
          id: test.id,
          score: score
        });
      }

      return NextResponse.json({ results });
    }
  } catch (error) {
    console.error('Error in /api/batchScore:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 