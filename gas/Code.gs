/**
 * Code.gs — HANASABI メインルーター
 * GAS Web App エントリポイント
 * 全リクエストはここを通る
 */

/**
 * GET リクエストハンドラ
 * ?action=xxx でルーティング
 */
function doGet(e) {
  const params = e.parameter || {};
  const action = params.action || '';

  // Bearer認証（CORS preflight用にOPTIONS相当は通過させる）
  const auth = params.token || (e.headers && e.headers['Authorization']) || '';
  if (!verifyBearerToken_(auth.replace ? auth : `Bearer ${auth}`)) {
    // tokenパラメータでの簡易認証も許可（フロントからのGET用）
    if (params.token !== CONFIG.APP_BEARER_TOKEN) {
      return errorResponse('Unauthorized', 401);
    }
  }

  try {
    switch (action) {
      case 'getItems':       return successResponse(getItems(params));
      case 'getItemDetail':  return successResponse(getItemDetail(params.itemCode));
      case 'getCoupons':     return successResponse(getCoupons());
      case 'getSchedules':   return successResponse(getSchedules_());
      case 'getHistory':     return successResponse(getSheetData_('配信履歴'));
      default:               return successResponse({ message: '🗡️ HANASABI API v1.0', actions: [
        'getItems', 'getItemDetail', 'getCoupons', 'getSchedules', 'getHistory'
      ]});
    }
  } catch (err) {
    return errorResponse(err.message);
  }
}

/**
 * POST リクエストハンドラ
 * body.action でルーティング
 */
function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch {
    return errorResponse('Invalid JSON body');
  }

  // Bearer認証
  const auth = (e.headers && e.headers['Authorization']) || body.token || '';
  const token = auth.startsWith('Bearer ') ? auth.replace('Bearer ', '') : auth;
  if (token !== CONFIG.APP_BEARER_TOKEN) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    switch (body.action) {
      case 'generateAI':
        return successResponse(generateAll(body.product, body.context));

      case 'createCoupon':
        return successResponse(createCoupon(
          body.itemCode,
          body.discountType,
          body.discountFactor,
          body.startDate,
          body.endDate,
          body.memberAvailMaxCount,
          body.combineFlag,
          body.issueCount
        ));

      case 'sendLine':
        return successResponse(dispatchLineMessage_(body));

      case 'scheduleDelivery':
        return successResponse(registerSchedule(body.datetime, body.payload));

      case 'cancelSchedule':
        return successResponse(cancelSchedule_(body.scheduleId));

      case 'testLine':
        return successResponse(sendTextMessage('🗡️ HANASABI テスト配信です！', body.userId));

      default:
        return errorResponse(`Unknown action: ${body.action}`);
    }
  } catch (err) {
    return errorResponse(err.message);
  }
}

/**
 * doGet 動作確認用テスト関数（GASエディタから手動実行）
 */
function testDoGet() {
  const e = {
    parameter: {
      action: 'getItems',
      token: PropertiesService.getScriptProperties().getProperty('APP_BEARER_TOKEN'),
      hits: '5'
    },
    headers: {}
  };
  const result = doGet(e);
  console.log(result.getContent());
}

/**
 * LINE配信種別のディスパッチ
 */
function dispatchLineMessage_(body) {
  const { type, content, userId } = body;
  switch (type) {
    case 'text':
      return broadcastMessage('text', content);
    case 'rich':
      return sendRichMessage(content.imageUrl, content.linkUrl, content.altText, content.text);
    case 'card':
      return sendCardMessage(content.products);
    case 'flex':
      return sendFlexMessage(body.product, body.content, body.coupon);
    default:
      throw new Error(`Unknown LINE message type: ${type}`);
  }
}
