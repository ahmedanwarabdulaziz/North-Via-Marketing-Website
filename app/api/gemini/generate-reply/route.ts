import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reviewText, starRating, businessName, reviewerName } = body;

    if (!reviewText || !starRating || !businessName) {
      return NextResponse.json(
        { error: 'reviewText, starRating, and businessName are required' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a professional business review reply writer for "${businessName}". 
Write a professional, warm, and helpful reply to the following Google review.

Review Details:
- Reviewer: ${reviewerName || 'Customer'}
- Star Rating: ${starRating}/5
- Review Text: "${reviewText}"

Guidelines:
- Be professional, friendly, and genuine
- Thank the customer for their feedback
- If the review is positive (4-5 stars), express gratitude and invite them back
- If the review is negative (1-2 stars), apologize sincerely, show empathy, and offer to resolve the issue
- If the review is neutral (3 stars), acknowledge both positives and areas for improvement
- Keep the reply concise (2-4 sentences)
- Do NOT use generic/template language
- Do NOT start with "Dear" — start with a natural greeting like "Thank you" or the reviewer's name
- Sign off with the business name

Reply:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const replyText = response.text();

    return NextResponse.json({
      reply: replyText.trim(),
    });
  } catch (error) {
    console.error('Error generating reply:', error);
    return NextResponse.json({ error: 'Failed to generate reply' }, { status: 500 });
  }
}
