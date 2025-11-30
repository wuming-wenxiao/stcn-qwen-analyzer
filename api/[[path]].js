// api/[[path]].js
export default async function (request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 只响应 /api/analyze 路径
  if (path !== '/api/analyze') {
    return new Response('Not Found', { status: 404 });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { news } = await request.json();
    if (!news || typeof news !== 'string' || news.length < 20) {
      return new Response(JSON.stringify({ error: '快讯内容无效' }), { status: 400 });
    }

    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key missing' }), { status: 500 });
    }

    const prompt = `你是一位资深A股分析师。请根据以下快讯，分析最直接受益的1-3只A股上市公司（必须给出股票名称和6位股票代码），并简要说明逻辑。快讯内容：\n\n【${news}】`;

    const dashRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: { messages: [{ role: 'user', content: prompt }] },
        parameters: { temperature: 0.3, top_p: 0.9, max_tokens: 500 }
      })
    });

    const result = await dashRes.json();
    if (result.output?.text) {
      return new Response(JSON.stringify({
        success: true,
        analysis: result.output.text.trim()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('DashScope Error:', result);
      return new Response(JSON.stringify({ error: 'AI 分析失败' }), { status: 500 });
    }
  } catch (e) {
    console.error('Function Error:', e);
    return new Response(JSON.stringify({ error: '服务器错误' }), { status: 500 });
  }
}
