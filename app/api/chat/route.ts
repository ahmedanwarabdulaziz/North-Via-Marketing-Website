import { NextResponse } from 'next/server';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/chatbot-instructions';
import { groqFetch } from '@/lib/ai-usage';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Add a system prompt at the beginning
    const systemMessage = {
      role: 'system',
      content: CHATBOT_SYSTEM_PROMPT
    };
    
    const apiMessages = [systemMessage, ...messages];

    // Recorded in the bot's AI usage screen; gpt-oss-20b is Groq's fast model on this account.
    const model = process.env.GROQ_CHAT_MODEL || 'openai/gpt-oss-20b';
    const data = await groqFetch<{ choices: Array<{ message: { role: string; content: string } }> }>(
      'chat/completions',
      { model, messages: apiMessages, temperature: 0.7, max_tokens: 1024, reasoning_effort: 'low' },
      { model, feature: 'chat', timeoutMs: 30_000 }
    ).catch((error) => {
      console.error('Groq API error:', error instanceof Error ? error.message : error);
      return null;
    });
    if (!data?.choices?.[0]?.message) {
      return NextResponse.json({ error: 'Failed to communicate with AI provider' }, { status: 502 });
    }

    const { role, content } = data.choices[0].message;
    return NextResponse.json({ message: { role, content } });
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
