/**
 * Utils.gs — 共通ユーティリティ
 * CORS対応レスポンス、Bearer認証、Sheets操作など
 */

/**
 * 成功レスポンスを返す
 */
function successResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * エラーレスポンスを返す
 */
function errorResponse(message, code = 400) {
  console.error(`[Error ${code}] ${message}`);
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message, code }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Bearer Token認証チェック
 * @param {string} authHeader - リクエストのAuthorizationヘッダー値
 * @returns {boolean}
 */
function verifyBearerToken_(authHeader) {
  if (!authHeader) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  return token === CONFIG.APP_BEARER_TOKEN;
}

/**
 * Google Sheetsのシートを名前で取得（なければ作成）
 * @param {string} sheetName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrCreateSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  return ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
}

/**
 * Sheetsに行を追加
 * @param {string} sheetName
 * @param {Array} rowData
 */
function appendToSheet_(sheetName, rowData) {
  const sheet = getOrCreateSheet_(sheetName);
  sheet.appendRow([new Date(), ...rowData]);
}

/**
 * Sheetsから全データを取得（ヘッダー除く）
 * @param {string} sheetName
 * @returns {Array<Object>}
 */
function getSheetData_(sheetName) {
  const sheet = getOrCreateSheet_(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row =>
    headers.reduce((obj, h, i) => { obj[h] = row[i]; return obj; }, {})
  );
}

/**
 * 外部APIへのfetch（エラーハンドリング付き）
 * @param {string} url
 * @param {Object} options
 * @returns {Object} parsed JSON
 */
function fetchJson_(url, options = {}) {
  try {
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      ...options
    });
    const code = res.getResponseCode();
    const text = res.getContentText();
    if (code >= 400) throw new Error(`HTTP ${code}: ${text.substring(0, 200)}`);
    return JSON.parse(text);
  } catch (e) {
    console.error(`[fetchJson_] ${url}: ${e.message}`);
    throw e;
  }
}

/**
 * 配信履歴をSheetsに記録
 */
function logDelivery_(type, target, content, status) {
  appendToSheet_('配信履歴', [type, target, content.substring(0, 100), status]);
}
