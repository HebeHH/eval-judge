import { NextRequest, NextResponse } from 'next/server';
import { promptGeneric, Message } from '@/lib/llm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { system, messages }: { system: string; messages: Message[] } = body;

    if (!system || !messages) {
      return NextResponse.json(
        { error: 'Missing required fields: system and messages' },
        { status: 400 }
      );
    }

    const response = await promptGeneric(system, messages);

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in /api/prompt:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 