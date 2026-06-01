/**
 * CouponManager.gs — 楽天クーポンAPI連携
 * クーポン発行・一覧取得
 * エンドポイント: POST https://api.rms.rakuten.co.jp/es/1.0/coupon/issue
 * リクエスト形式: XML
 */

/**
 * クーポン発行
 * @param {string} itemCode - 対象商品コード（空の場合は全商品対象）
 * @param {number} discountRate - 割引率（1〜99）
 * @param {Object} period - { days: 有効日数（最大90日）}
 * @returns {Object} { couponCode, couponUrl, discountRate, startDate, endDate }
 */
function createCoupon(itemCode, discountRate, period) {
  if (!discountRate || discountRate < 1 || discountRate > 99) {
    throw new Error('割引率は1〜99の間で指定してください');
  }

  const now = new Date();
  // 開始: 現在+65分（60分制限に余裕）
  const startDate = new Date(now.getTime() + 65 * 60 * 1000);
  // 終了: 指定日数（最大90日）
  const days = Math.min(period?.days || 7, 90);
  const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
  endDate.setHours(23, 59, 59, 0);

  const startStr = Utilities.formatDate(startDate, 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'+09:00'");
  const endStr   = Utilities.formatDate(endDate,   'Asia/Tokyo', "yyyy-MM-dd'T'23:59:59'+09:00'");
  const now8     = Utilities.formatDate(now, 'Asia/Tokyo', 'MMddHHmm');
  const couponName = `HANSABI_${discountRate}OFF_${now8}`;

  // 対象商品設定
  // itemCode あり → itemType=3, items指定
  // itemCode なし → itemType=4(受注=全商品), items空タグ
  const itemType = itemCode ? 3 : 4;
  const itemsXml = itemCode
    ? `<items><item><itemUrl>${itemCode}</itemUrl></item></items>`
    : `<items/>`;

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <couponIssueRequest>
    <coupon>
      <couponName>${couponName}</couponName>
      <couponCaption>${discountRate}%OFFクーポン 銀座東京フラワー</couponCaption>
      <couponStartDate>${startStr}</couponStartDate>
      <couponEndDate>${endStr}</couponEndDate>
      <issueCount>1000</issueCount>
      <itemType>${itemType}</itemType>
      <discountType>2</discountType>
      <discountFactor>${discountRate}</discountFactor>
      <memberAvailMaxCount>1</memberAvailMaxCount>
      <purchaseHistoryCond><type>0</type></purchaseHistoryCond>
      <multiRankCond><rankCond>0</rankCond></multiRankCond>
      <genderCond>NONE</genderCond>
      <ageRangeCond><lowerBound>0</lowerBound><upperBound>0</upperBound></ageRangeCond>
      <birthmonthCond>0</birthmonthCond>
      <multiPrefectureCond><prefectureCond>NONE</prefectureCond></multiPrefectureCond>
      <combineFlag>1</combineFlag>
      <displayFlag>1</displayFlag>
      ${itemsXml}
      <otherConditions/>
    </coupon>
  </couponIssueRequest>
</request>`;

  const res = UrlFetchApp.fetch('https://api.rms.rakuten.co.jp/es/1.0/coupon/issue', {
    method: 'post',
    contentType: 'text/xml',
    payload: xmlBody,
    headers: { 'Authorization': getRakutenAuthHeader_()['Authorization'] },
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const text = res.getContentText();
  console.log('Coupon API response:', text);

  // XmlServiceでパース
  try {
    const xml = XmlService.parse(text);
    const root = xml.getRootElement();
    const errors = root.getChild('errors');
    if (errors) {
      const msg = errors.getChild('error')?.getChild('message')?.getText() || 'unknown error';
      throw new Error(`クーポンAPI: ${msg}`);
    }
  } catch (e) {
    if (e.message.startsWith('クーポンAPI:')) throw e;
    // XMLパースエラーは無視（errorsなし=成功とみなす）
  }

  if (code >= 400) throw new Error(`クーポンAPI HTTP ${code}`);

  const couponCodeMatch = text.match(/<couponCode>([^<]+)<\/couponCode>/);
  const pcGetUrlMatch   = text.match(/<pcGetUrl>([^<]+)<\/pcGetUrl>/);
  const couponCode = couponCodeMatch ? couponCodeMatch[1] : '';
  const couponUrl  = pcGetUrlMatch
    ? pcGetUrlMatch[1].replace(/&amp;/g, '&')
    : `https://coupon.rakuten.co.jp/detail/${couponCode}`;

  appendToSheet_('クーポン履歴', [
    couponCode, itemCode || '全商品', `${discountRate}%OFF`,
    startStr, endStr, couponUrl
  ]);

  return { couponCode, couponUrl, discountRate, startDate: startStr, endDate: endStr };
}

/**
 * ISO8601形式にフォーマット（JST）
 * @param {Date} date
 * @returns {string}
 */
function formatISO8601_(date) {
  return Utilities.formatDate(date, 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'+09:00'");
}

/**
 * クーポン一覧取得（シート履歴から返す）
 * @returns {Array}
 */
function getCoupons() {
  return getSheetData_('クーポン履歴');
}

/**
 * クーポン発行デバッグ用テスト関数（GASエディタから手動実行）
 */
function testCreateCoupon() {
  try {
    const result = createCoupon('', 10, { days: 7 });
    console.log('SUCCESS:', JSON.stringify(result));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
