import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();
app.use('*', cors());

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

app.post('/api/analyze', async (c) => {
  try {
    const { news } = await c.req.json();
    if (!news || typeof news !== 'string' || news.length < 20) {
      return c.json({ error: '快讯内容无效' }, 400);
    }

    const prompt = `你是一位资深A股分析师。请根据以下快讯，分析最直接受益的1-3只A股上市公司（必须给出股票名称和6位股票代码），并简要说明逻辑。快讯内容：\n\n【${news}】`;

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { temperature: 0.3, top_p: 0.9, max_tokens: 500 }
      })
    });

    const result = await response.json();
    if (result.output?.text) {
      return c.json({ success: true, analysis: result.output.text.trim() });
    } else {
      console.error('Qwen Error:', result);
      return c.json({ error: 'AI 分析失败' }, 500);
    }
  } catch (error) {
    console.error('Function Error:', error);
    return c.json({ error: '服务器错误' }, 500);
  }
});

export default app;
