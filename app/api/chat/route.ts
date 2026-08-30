import { NextResponse } from 'next/server';
import { CHATBOT_SYSTEM_PROMPT } from '@/lib/chatbot-instructions';

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

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to communicate with AI provider' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      message: data.choices[0].message,
    });
  } catch (error) {
    console.error('Error in chat API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
