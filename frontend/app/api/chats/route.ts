import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import MarkdownIt from 'markdown-it';

const API_KEY = process.env.GEMINI_AI_KEY;

export async function POST(req: NextRequest) {
  const { prompt, history } = await req.json();

  try {
    const genAI = new GoogleGenerativeAI(API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const md = new MarkdownIt();

    const chat =
      history && history.length
        ? model.startChat({ history })
        : model.startChat({
            history: [],
            generationConfig: { maxOutputTokens: 1000 },
          });

    const result = await chat.sendMessage(`${prompt}\nRespond in Markdown.`);
    const fullResponse = result.response.text();
    const finalEdited = md.render(fullResponse);

    return NextResponse.json({
      success: true,
      text: finalEdited,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Placeholder: return an empty array or mock chat history
  return NextResponse.json([]);
}
