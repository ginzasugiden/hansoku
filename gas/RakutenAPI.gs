/**
 * RakutenAPI.gs — 楽天 RMS ItemAPI 2.0 連携
 * 商品一覧取得・商品詳細取得
 */

const RAKUTEN_API_BASE = 'https://api.rms.rakuten.co.jp/es/2.0';

/**
 * 認証ヘッダーを生成
 * @returns {Object}
 */
function getRakutenAuthHeader_() {
  const credential = Utilities.base64Encode(
    `${CONFIG.RAKUTEN_SERVICE_SECRET}:${CONFIG.RAKUTEN_LICENSE_KEY}`
  );
  return {
    'Authorization': `ESA ${credential}`,
    'Content-Type': 'application/json; charset=utf-8'
  };
}

/**
 * 商品一覧取得
 * @param {Object} params - { keyword, page, hits }
 * @returns {Object} { items: [], totalCount, pageCount }
 */
function getItems(params = {}) {
  const page = params.page || 1;
  const hits = params.hits || 30;
  const offset = (page - 1) * hits;

  const res = fetchJson_(
    `${RAKUTEN_API_BASE}/items/search?offset=${offset}&hits=${hits}`,
    {
      method: 'get',
      headers: getRakutenAuthHeader_()
    }
  );

  const items = (res.results || []).map(r => normalizeItem_(r.item));
  const totalCount = res.numFound || 0;
  return {
    items,
    totalCount,
    pageCount: Math.ceil(totalCount / hits)
  };
}

/**
 * 商品詳細取得
 * @param {string} manageNumber - 商品管理番号
 * @returns {Object} 商品詳細
 */
function getItemDetail(manageNumber) {
  if (!manageNumber) throw new Error('manageNumberが必要です');

  const res = fetchJson_(
    `${RAKUTEN_API_BASE}/items/manage-numbers/${encodeURIComponent(manageNumber)}`,
    {
      method: 'get',
      headers: getRakutenAuthHeader_()
    }
  );

  return normalizeItem_(res);
}

/**
 * 商品データを正規化（必要なフィールドだけ抽出）
 * @param {Object} item
 * @returns {Object}
 */
function normalizeItem_(item) {
  if (!item) return null;
  const imageLocation = item.images?.[0]?.location || '';
  const imageUrl = imageLocation
    ? `https://image.rakuten.co.jp${imageLocation}`
    : '';
  const variants = item.variants || {};
  const firstVariant = Object.values(variants)[0];
  const price = parseInt(String(firstVariant?.standardPrice || '0').replace(/[,\s]/g, '')) || 0;
  return {
    itemCode:    item.manageNumber || item.itemNumber || '',
    name:        item.title || '',
    price:       price,
    imageUrl:    imageUrl,
    itemUrl:     `https://item.rakuten.co.jp/${CONFIG.RAKUTEN_SHOP_URL}/${item.itemNumber || item.manageNumber}/`,
    catchCopy:   item.tagline || '',
    description: item.productDescription?.pc || item.salesDescription || '',
    stock:       0,
    genreId:     item.genreId || ''
  };
}

/**
 * 商品在庫チェック（簡易）
 * @param {string} manageNumber
 * @returns {boolean}
 */
function isInStock(manageNumber) {
  try {
    const item = getItemDetail(manageNumber);
    return (item.stock || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * 動作確認用テスト関数（GASエディタから手動実行）
 */
function testGetItems() {
  const result = getItems({ hits: 5 });
  console.log('totalCount:', result.totalCount);
  console.log('pageCount:', result.pageCount);
  console.log('items:', JSON.stringify(result.items, null, 2));
}

function testGetItemDetail() {
  const result = getItemDetail('10000971');
  console.log('price:', result.price);
  console.log('name:', result.name);
}
