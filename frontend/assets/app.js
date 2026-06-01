/**
 * HANASABI フロントエンド共通JS
 * GAS WebApp との通信・状態管理
 */

// ─── 設定（GitHub Pagesにデプロイ前に書き換え） ───────────
const HANASABI_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzKdIcR7ys61ZYk5oZHxbX3KGoc4LjFHjcb0DQRt_7MKaS5ORBXo-XxXFRobYISyd2f/exec',
  TOKEN:   'RJV2bKtCHtpJjJlRoFoTwbObSmuzUtfr'
};
// ──────────────────────────────────────────────────────────

/** 選択された商品を一時保存（sessionStorage） */
const store = {
  get products()  { return JSON.parse(sessionStorage.getItem('hana_products') || '[]'); },
  set products(v) { sessionStorage.setItem('hana_products', JSON.stringify(v)); },
  get aiResults() { return JSON.parse(sessionStorage.getItem('hana_ai') || 'null'); },
  set aiResults(v){ sessionStorage.setItem('hana_ai', JSON.stringify(v)); },
  get coupon()    { return JSON.parse(sessionStorage.getItem('hana_coupon') || 'null'); },
  set coupon(v)   { sessionStorage.setItem('hana_coupon', JSON.stringify(v)); }
};

// ─── API呼び出し ────────────────────────────────────────────

/** GAS GET呼び出し */
async function gasGet(action, params = {}) {
  const qs = new URLSearchParams({
    action,
    token: HANASABI_CONFIG.TOKEN,
    ...params
  });
  const res = await fetch(
    `${HANASABI_CONFIG.GAS_URL}?${qs}`,
    { redirect: 'follow' }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'API Error');
  return data.data;
}

/** GAS POST呼び出し */
async function gasPost(action, body = {}) {
  const res = await fetch(HANASABI_CONFIG.GAS_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, token: HANASABI_CONFIG.TOKEN, ...body })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'API Error');
  return data.data;
}

// ─── UI ユーティリティ ────────────────────────────────────

/** トースト通知 */
function toast(msg, type = 'success') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `show ${type}`;
  setTimeout(() => { el.className = ''; }, 3000);
}

/** ローディング表示 */
function showLoading(containerId, msg = '処理中...') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <div>${msg}</div>
    </div>`;
}

/** 価格フォーマット */
function fmtPrice(n) {
  return `¥${Number(n || 0).toLocaleString()}`;
}

/** 日時フォーマット */
function fmtDate(d) {
  return new Date(d).toLocaleString('ja-JP', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}

// ─── ナビゲーションのアクティブ状態 ──────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  document.querySelectorAll('.site-header nav a').forEach(a => {
    if (path.endsWith(a.getAttribute('href') || '')) a.classList.add('active');
  });

  // config未設定警告
  if (HANASABI_CONFIG.GAS_URL.includes('YOUR_DEPLOYMENT_ID')) {
    toast('⚠️ GAS_URL未設定: assets/app.js を編集してください', 'error');
  }
});
