/**
 * Config.gs — APIキー・設定値管理
 * 全てのAPIキーはScriptPropertiesから取得する（コード内直書き禁止）
 *
 * 初回セットアップ: setupProperties() を手動実行してください
 */

const CONFIG = {
  /** ScriptPropertiesからキーを取得 */
  get(key) {
    const val = PropertiesService.getScriptProperties().getProperty(key);
    if (!val) throw new Error(`[Config] PropertiesServiceに "${key}" が設定されていません`);
    return val;
  },

  // ── 楽天 ──────────────────────────────
  get RAKUTEN_SERVICE_SECRET() { return this.get('RAKUTEN_SERVICE_SECRET'); },
  get RAKUTEN_LICENSE_KEY()    { return this.get('RAKUTEN_LICENSE_KEY'); },
  get RAKUTEN_SHOP_URL()       { return this.get('RAKUTEN_SHOP_URL'); },

  // ── AI ────────────────────────────────
  get CLAUDE_API_KEY()  { return this.get('CLAUDE_API_KEY'); },
  get OPENAI_API_KEY()  { return this.get('OPENAI_API_KEY'); },
  get GEMINI_API_KEY()  { return this.get('GEMINI_API_KEY'); },

  // ── LINE ──────────────────────────────
  get LINE_CHANNEL_SECRET()       { return this.get('LINE_CHANNEL_SECRET'); },
  get LINE_CHANNEL_ACCESS_TOKEN() { return this.get('LINE_CHANNEL_ACCESS_TOKEN'); },

  // ── 内部認証 ──────────────────────────
  get APP_BEARER_TOKEN() { return this.get('APP_BEARER_TOKEN'); },

  // ── スプレッドシート ──────────────────
  get SHEET_ID() { return this.get('SHEET_ID'); },

  // ── GitHub Pages URL（CORS許可） ──────
  get FRONTEND_ORIGIN() {
    try { return this.get('FRONTEND_ORIGIN'); }
    catch { return '*'; } // 開発中は全許可
  }
};

/**
 * 初回セットアップ: GASエディタから手動実行
 * 実際のキー値をここに入力してから実行し、その後この関数の値を消してください
 */
function setupProperties() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    // ★ 以下を実際の値に書き換えて実行 ★
    'RAKUTEN_SERVICE_SECRET': 'ここにサービスシークレット',
    'RAKUTEN_LICENSE_KEY':    'ここにライセンスキー',
    'RAKUTEN_SHOP_URL':       'ここにショップURL（例: normal.shop.com）',
    'CLAUDE_API_KEY':         'sk-ant-...',
    'OPENAI_API_KEY':         'sk-...',
    'GEMINI_API_KEY':         'AIza...',
    'LINE_CHANNEL_SECRET':    'ここにChannelSecret',
    'LINE_CHANNEL_ACCESS_TOKEN': 'ここにAccessToken',
    'APP_BEARER_TOKEN':       generateBearerToken_(),
    'SHEET_ID':               'ここにスプレッドシートID',
    'FRONTEND_ORIGIN':        'https://ginzasugiden.github.io'
  });
  console.log('✅ PropertiesService設定完了');
  console.log('APP_BEARER_TOKEN:', props.getProperty('APP_BEARER_TOKEN'));
}

/** ランダムBearerToken生成 */
function generateBearerToken_() {
  return Utilities.base64Encode(
    Utilities.computeHmacSha256Signature(
      new Date().toISOString(),
      Math.random().toString()
    )
  ).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}
