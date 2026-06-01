/**
 * LineMessaging.gs — LINE Messaging API 配信
 * テキスト / リッチメッセージ / カードタイプ（カルーセル）
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot';

/**
 * 共通ヘッダー
 */
function getLineHeaders_() {
  return {
    'Authorization': `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
    'Content-Type':  'application/json'
  };
}

/**
 * LINE API呼び出し共通
 */
function callLineAPI_(endpoint, payload) {
  const res = fetchJson_(`${LINE_API_BASE}${endpoint}`, {
    method: 'post',
    headers: getLineHeaders_(),
    payload: JSON.stringify(payload)
  });
  return res;
}

// ─────────────────────────────────────────────
// 1. テキストメッセージ
// ─────────────────────────────────────────────

/**
 * 特定ユーザーにテキスト送信
 * @param {string} text
 * @param {string} userId
 */
function sendTextMessage(text, userId) {
  const res = callLineAPI_('/message/push', {
    to: userId,
    messages: [{ type: 'text', text }]
  });
  logDelivery_('text', userId, text, 'sent');
  return res;
}

/**
 * 全フォロワーにブロードキャスト
 * @param {string} type - 'text' | 'rich' | 'card'
 * @param {Object} content
 */
function broadcastMessage(type, content) {
  let messages;
  switch (type) {
    case 'text':
      messages = [{ type: 'text', text: content }];
      break;
    case 'rich':
      messages = [buildRichMessage_(content)];
      break;
    case 'card':
      messages = [buildCardMessage_(content)];
      break;
    default:
      throw new Error(`Unknown message type: ${type}`);
  }

  const res = callLineAPI_('/message/broadcast', { messages });
  logDelivery_(type, 'broadcast', JSON.stringify(content), 'sent');
  return res;
}

// ─────────────────────────────────────────────
// 2. リッチメッセージ（画像 + ボタン）
// ─────────────────────────────────────────────

/**
 * リッチメッセージ送信
 * @param {string} imageUrl - 画像URL（1040x1040推奨）
 * @param {string} linkUrl  - タップ先URL
 * @param {string} altText  - 代替テキスト
 * @param {string} text     - ヘッダーテキスト
 */
function sendRichMessage(imageUrl, linkUrl, altText, text = '') {
  const message = buildRichMessage_({ imageUrl, linkUrl, altText, text });
  const res = callLineAPI_('/message/broadcast', { messages: [message] });
  logDelivery_('rich', 'broadcast', altText, 'sent');
  return res;
}

function buildRichMessage_({ imageUrl, linkUrl, altText, text }) {
  return {
    type: 'imagemap',
    baseUrl: imageUrl,
    altText: altText || '販促情報',
    baseSize: { width: 1040, height: 1040 },
    actions: [{
      type: 'uri',
      linkUri: linkUrl,
      area: { x: 0, y: 0, width: 1040, height: 1040 }
    }]
  };
}

// ─────────────────────────────────────────────
// 3. カードタイプメッセージ（カルーセル）
// ─────────────────────────────────────────────

/**
 * カードタイプメッセージ（複数商品カルーセル）
 * @param {Array} products - 商品配列（最大10件）
 * @param {Object} options - { couponUrl }
 */
function sendCardMessage(products, options = {}) {
  const message = buildCardMessage_(products, options);
  const res = callLineAPI_('/message/broadcast', { messages: [message] });
  logDelivery_('card', 'broadcast', `${products.length}商品`, 'sent');
  return res;
}

function buildCardMessage_(products, options = {}) {
  const columns = products.slice(0, 10).map(p => ({
    thumbnailImageUrl: p.imageUrl || 'https://placehold.co/1024x1024/e8f5e9/2e7d32?text=Flower',
    title:    (p.name || '').substring(0, 40),
    text:     `¥${Number(p.price || 0).toLocaleString()}${p.catchCopy ? '\n' + p.catchCopy.substring(0, 60) : ''}`,
    actions: [
      {
        type:  'uri',
        label: '商品を見る',
        uri:   p.itemUrl || 'https://www.rakuten.ne.jp'
      },
      ...(options.couponUrl ? [{
        type:  'uri',
        label: 'クーポンを使う',
        uri:   options.couponUrl
      }] : [])
    ]
  }));

  return {
    type: 'template',
    altText: `${products.length}件の商品をご紹介します`,
    template: {
      type: 'carousel',
      columns
    }
  };
}

// ─────────────────────────────────────────────
// LINE Webhook 署名検証
// ─────────────────────────────────────────────

/**
 * LINE Webhookの署名を検証
 * @param {string} body - リクエストボディ文字列
 * @param {string} signature - X-Line-Signatureヘッダー値
 * @returns {boolean}
 */
function verifyLineSignature_(body, signature) {
  const expected = Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(body, CONFIG.LINE_CHANNEL_SECRET)
  );
  return expected === signature;
}

/**
 * LINE ブロードキャスト送信テスト関数（GASエディタから手動実行）
 */
function testLineBroadcast() {
  try {
    // broadcastは全フォロワーに送信（UserID不要）
    const res = callLineAPI_('/message/broadcast', {
      messages: [{
        type: 'text',
        text: '🗡️ HANSABI テスト配信\n\n販売促進侍からのメッセージです！\n✅ システム正常動作中\n\nこのメッセージが届いたら成功です🌸'
      }]
    });
    console.log('SUCCESS:', JSON.stringify(res));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

/**
 * LINE テキスト送信テスト関数（GASエディタから手動実行）
 */
function testLineText() {
  // まずBot自身のUserIDにテスト送信
  // LINE Developersコンソールで自分のUserIDを確認してください
  const myUserId = 'ここに自分のLINE UserID';

  try {
    const res = sendTextMessage(
      '🗡️ HANSABI テスト配信\n\n販売促進侍からのメッセージです！\n\n✅ システム正常動作中',
      myUserId
    );
    console.log('SUCCESS:', JSON.stringify(res));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
