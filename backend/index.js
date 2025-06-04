import e from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import MarkdownIt from 'markdown-it';
dotenv.config();
const app = e();
const PORT = process.env.PORT || 8000;
const API_KEY = process.env.GEMINI_AI_KEY;

const corsOption = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
  ],
};
app.use(e.json());
app.use(cors(corsOption));

const getData = async (req, res) => {
  const { prompt, history } = req.body;
  res.setHeader('Content-Type', 'application/json');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const md = new MarkdownIt();

    const chat = history.length
      ? model.startChat({ history })
      : model.startChat({
          history: [],
          generationConfig: {
            maxOutputTokens: 1000,
          },
        });

    // Use sendMessage instead of sendMessageStream to get complete response
    const result = await chat.sendMessage(`${prompt}\nRespond in Markdown.`);
    const fullResponse = result.response.text();

    const finalEdited = md.render(fullResponse);

    // Send the complete response as JSON
    res.json({
      success: true,
      text: finalEdited,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating response',
      message: error.message,
    });
  }
};

app.post('/generate', getData);

app.listen(PORT, () => console.log(`Server is running ${PORT}`));
