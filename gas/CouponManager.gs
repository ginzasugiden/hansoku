/**
 * CouponManager.gs — 楽天クーポンAPI連携
 * クーポン発行・一覧取得
 * エンドポイント: POST https://api.rms.rakuten.co.jp/es/1.0/coupon/issue
 * リクエスト形式: XML
 */

/**
 * クーポン発行
 * @param {string} itemCode           - 対象商品コード（空の場合は全商品対象）
 * @param {number} discountType       - 1=定額, 2=定率, 4=送料無料
 * @param {number} discountFactor     - 割引率(%) or 割引額(円)
 * @param {string} startDateStr       - 開始日時 ISO8601形式（例: 2024-06-01T10:00:00+09:00）
 * @param {string} endDateStr         - 終了日時 ISO8601形式
 * @param {number} memberAvailMaxCount - 1ユーザーあたり利用上限（0=無制限）
 * @param {number} combineFlag        - 併用可否（1=可, 0=不可）
 * @returns {Object} { couponCode, couponUrl, discountType, discountFactor, startDate, endDate }
 */
function createCoupon(itemCode, discountType, discountFactor, startDateStr, endDateStr, memberAvailMaxCount, combineFlag) {
  discountType          = parseInt(discountType)          || 2;
  discountFactor        = parseInt(discountFactor)        || 10;
  memberAvailMaxCount   = parseInt(memberAvailMaxCount)   || 0;
  combineFlag           = (parseInt(combineFlag) !== undefined && !isNaN(parseInt(combineFlag))) ? parseInt(combineFlag) : 1;

  const now = new Date();
  const now8 = Utilities.formatDate(now, 'Asia/Tokyo', 'MMddHHmm');
  const couponName = `HANSABI_${discountFactor}${discountType === 2 ? '%' : '円'}OFF_${now8}`;

  // itemType / itemsXml 決定
  let itemType, itemsXml;
  if (discountType === 4) {
    // 送料無料: itemType=5、itemsタグ完全省略
    itemType = 5;
    itemsXml = '';
  } else if (itemCode) {
    // 単一商品: itemType=1、itemsタグあり
    itemType = 1;
    itemsXml = `<items><item><itemUrl>${itemCode}</itemUrl></item></items>`;
  } else {
    // 全商品: itemType=3、itemsタグ完全省略
    itemType = 3;
    itemsXml = '';
  }

  const caption = discountType === 4 ? '送料無料クーポン 銀座東京フラワー'
                : discountType === 2 ? `${discountFactor}%OFFクーポン 銀座東京フラワー`
                : `${discountFactor}円OFFクーポン 銀座東京フラワー`;

  const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <couponIssueRequest>
    <coupon>
      <couponName>${couponName}</couponName>
      <couponCaption>${caption}</couponCaption>
      <couponStartDate>${startDateStr}</couponStartDate>
      <couponEndDate>${endDateStr}</couponEndDate>
      <issueCount>1000</issueCount>
      <itemType>${itemType}</itemType>
      <discountType>${discountType}</discountType>
      <discountFactor>${discountFactor}</discountFactor>
      <memberAvailMaxCount>${memberAvailMaxCount}</memberAvailMaxCount>
      <purchaseHistoryCond><type>0</type></purchaseHistoryCond>
      <multiRankCond><rankCond>0</rankCond></multiRankCond>
      <genderCond>NONE</genderCond>
      <ageRangeCond><lowerBound>0</lowerBound><upperBound>0</upperBound></ageRangeCond>
      <birthmonthCond>0</birthmonthCond>
      <multiPrefectureCond><prefectureCond>NONE</prefectureCond></multiPrefectureCond>
      <combineFlag>${combineFlag}</combineFlag>
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

  if (text.includes('<errors>')) {
    const msgMatch = text.match(/<message>([^<]+)<\/message>/g);
    const errMsg = msgMatch && msgMatch[1]
      ? msgMatch[1].replace(/<\/?message>/g, '')
      : text.substring(0, 200);
    throw new Error(`クーポンAPI: ${errMsg}`);
  }
  if (code >= 400) throw new Error(`クーポンAPI HTTP ${code}`);

  const couponCodeMatch = text.match(/<couponCode>([^<]+)<\/couponCode>/);
  const pcGetUrlMatch   = text.match(/<pcGetUrl>([^<]+)<\/pcGetUrl>/);
  const couponCode = couponCodeMatch ? couponCodeMatch[1] : '';
  const couponUrl  = pcGetUrlMatch
    ? pcGetUrlMatch[1].replace(/&amp;/g, '&')
    : `https://coupon.rakuten.co.jp/detail/${couponCode}`;

  appendToSheet_('クーポン履歴', [
    couponCode, itemCode || '全商品', caption,
    startDateStr, endDateStr, couponUrl
  ]);

  return { couponCode, couponUrl, discountType, discountFactor, startDate: startDateStr, endDate: endDateStr };
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
    const now = new Date();
    const startDate = new Date(now.getTime() + 65 * 60 * 1000);
    if (startDate.getMinutes() > 0) {
      startDate.setHours(startDate.getHours() + 1);
      startDate.setMinutes(0); startDate.setSeconds(0); startDate.setMilliseconds(0);
    }
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 0);

    const result = createCoupon(
      '',                          // itemCode（全商品）
      2,                           // discountType（定率）
      10,                          // discountFactor（10%）
      formatISO8601_(startDate),   // startDate
      formatISO8601_(endDate),     // endDate
      0,                           // memberAvailMaxCount（無制限）
      0                            // combineFlag（不可）
    );
    console.log('SUCCESS:', JSON.stringify(result));
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}
