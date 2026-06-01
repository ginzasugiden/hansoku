/**
 * AIEngine.gs — AI文言生成エンジン
 * Claude / ChatGPT / Gemini を並列実行して販促文言を3案生成
 */

/**
 * 3つのAIで並列生成（メイン関数）
 * @param {Object} product - 商品情報
 * @param {Object} context - { tone, target, couponCode }
 * @returns {Object} { claude, gpt, gemini }
 */
function generateAll(product, context = {}) {
  console.log(`[AIEngine] 生成開始: ${product.name}`);

  // GASは並列処理不可のため順次実行（各タイムアウト30秒）
  const results = {};
  const errors  = {};

  try { results.claude = generateWithClaude(product, context); }
  catch (e) { errors.claude = e.message; results.claude = null; }

  try { results.gpt = generateWithGPT(product, context); }
  catch (e) { errors.gpt = e.message; results.gpt = null; }

  try { results.gemini = generateWithGemini(product, context); }
  catch (e) { errors.gemini = e.message; results.gemini = null; }

  // Sheetsに生成履歴を記録
  appendToSheet_('AI生成履歴', [
    product.itemCode,
    product.name,
    results.claude?.catchCopy || '',
    results.gpt?.catchCopy || '',
    results.gemini?.catchCopy || '',
    JSON.stringify(errors)
  ]);

  return { results, errors };
}

/**
 * プロンプト共通テンプレート
 */
function buildPrompt_(product, context) {
  const tone   = context.tone   || 'やわらかく親しみやすい';
  const target = context.target || '30〜50代の女性';
  const coupon = context.couponCode
    ? `※クーポンコード「${context.couponCode}」で割引あり。` : '';

  return `
あなたは花屋「銀座東京フラワー」の販売促進の専門家です。
以下の商品情報をもとに、LINEで配信する販促メッセージを作成してください。

【商品情報】
- 商品名: ${product.name}
- 価格: ¥${Number(product.price).toLocaleString()}
- キャッチコピー（既存）: ${product.catchCopy || 'なし'}
- 商品説明: ${product.description?.substring(0, 200) || 'なし'}
- 商品URL: ${product.itemUrl}
${coupon}

【条件】
- トーン: ${tone}
- ターゲット: ${target}
- 文字数: LINEメッセージ全体で300字以内

【出力形式（JSONのみ）】
{
  "catchCopy": "キャッチコピー（20字以内）",
  "mainText": "本文メッセージ（200字以内）",
  "cta": "行動喚起テキスト（例: 今すぐチェック！）",
  "hashtags": ["ハッシュタグ1", "ハッシュタグ2", "ハッシュタグ3"],
  "lineMessage": "LINEに送る完成テキスト全文"
}

JSONのみを返してください。説明文・マークダウン不要。
`.trim();
}

/**
 * JSONレスポンスをパース（フェールセーフ）
 */
function parseAIResponse_(text) {
  try {
    // コードブロック除去
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    // パース失敗時はテキストをそのまま返す
    return { catchCopy: '', mainText: text, cta: '', hashtags: [], lineMessage: text };
  }
}

/**
 * Claude API で生成
 * @param {Object} product
 * @param {Object} context
 * @returns {Object}
 */
function generateWithClaude(product, context) {
  const res = fetchJson_('https://api.anthropic.com/v1/messages', {
    method: 'post',
    headers: {
      'x-api-key':         CONFIG.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json'
    },
    payload: JSON.stringify({
      model:      'claude-opus-4-5',
      max_tokens: 800,
      messages: [{ role: 'user', content: buildPrompt_(product, context) }]
    })
  });

  const text = res.content?.[0]?.text || '';
  return { ...parseAIResponse_(text), model: 'Claude', rawText: text };
}

/**
 * ChatGPT API で生成
 */
function generateWithGPT(product, context) {
  const res = fetchJson_('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: {
      'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
      'Content-Type':  'application/json'
    },
    payload: JSON.stringify({
      model:      'gpt-4o',
      max_tokens: 800,
      messages: [{ role: 'user', content: buildPrompt_(product, context) }]
    })
  });

  const text = res.choices?.[0]?.message?.content || '';
  return { ...parseAIResponse_(text), model: 'ChatGPT', rawText: text };
}

/**
 * Gemini API で生成
 */
function generateWithGemini(product, context) {
  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  let lastError = '';
  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
      const res = fetchJson_(url, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt_(product, context) }] }],
          generationConfig: { maxOutputTokens: 800 }
        })
      });
      const text = res.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (text) return { ...parseAIResponse_(text), model: `Gemini(${model})`, rawText: text };
    } catch (e) {
      lastError = e.message;
      console.error(`Gemini ${model} failed: ${e.message}`);
    }
  }
  throw new Error(`全Geminiモデル失敗: ${lastError}`);
}
