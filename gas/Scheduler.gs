/**
 * Scheduler.gs — 自動配信スケジューラ
 * Sheetsにスケジュールを登録し、Time-based Triggerで自動実行
 */

const SCHEDULE_SHEET = 'スケジュール';

/**
 * スケジュール登録
 * @param {string} datetime - 'YYYY-MM-DD HH:mm' 形式
 * @param {Object} payload  - { type, content, products[], couponCode }
 * @returns {Object} { scheduleId }
 */
function registerSchedule(datetime, payload) {
  const sheet = getOrCreateSheet_(SCHEDULE_SHEET);

  // ヘッダー行がなければ作成
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['スケジュールID', '配信日時', 'タイプ', 'ペイロード', 'ステータス', '作成日時']);
  }

  const scheduleId = `SCH_${Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHHmmss')}`;
  sheet.appendRow([
    scheduleId,
    datetime,
    payload.type || 'text',
    JSON.stringify(payload),
    'pending',
    new Date()
  ]);

  console.log(`[Scheduler] 登録: ${scheduleId} → ${datetime}`);
  return { scheduleId, datetime, status: 'pending' };
}

/**
 * スケジュール一覧取得
 */
function getSchedules_() {
  return getSheetData_(SCHEDULE_SHEET).filter(r => r['ステータス'] === 'pending');
}

/**
 * スケジュールキャンセル
 */
function cancelSchedule_(scheduleId) {
  const sheet = getOrCreateSheet_(SCHEDULE_SHEET);
  const data   = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === scheduleId) {
      sheet.getRange(i + 1, 5).setValue('cancelled');
      return { scheduleId, status: 'cancelled' };
    }
  }
  throw new Error(`スケジュールが見つかりません: ${scheduleId}`);
}

/**
 * スケジュール実行チェック（Triggerから毎5分呼び出し）
 * pending かつ 配信日時 ≤ 現在時刻のものを実行
 */
function runScheduledJobs() {
  const sheet = getOrCreateSheet_(SCHEDULE_SHEET);
  const data   = sheet.getDataRange().getValues();
  const now    = new Date();

  for (let i = 1; i < data.length; i++) {
    const [scheduleId, datetimeStr, type, payloadStr, status] = data[i];
    if (status !== 'pending') continue;

    const scheduledTime = new Date(datetimeStr);
    if (scheduledTime > now) continue;

    console.log(`[Scheduler] 実行: ${scheduleId}`);
    let execStatus = 'done';

    try {
      const payload = JSON.parse(payloadStr);
      dispatchScheduledMessage_(payload);
    } catch (e) {
      console.error(`[Scheduler] 失敗: ${scheduleId}: ${e.message}`);
      execStatus = `error: ${e.message}`;
    }

    // ステータス更新
    sheet.getRange(i + 1, 5).setValue(execStatus);
    sheet.getRange(i + 1, 6).setValue(new Date());
  }
}

/**
 * スケジュールされたメッセージを配信
 */
function dispatchScheduledMessage_(payload) {
  const { type, content, products, couponCode } = payload;

  switch (type) {
    case 'text':
      broadcastMessage('text', content);
      break;
    case 'rich':
      broadcastMessage('rich', content);
      break;
    case 'card':
      sendCardMessage(products, couponCode ? { couponUrl: `https://coupon.rakuten.co.jp/${couponCode}` } : {});
      break;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

/**
 * Time-based Trigger をセット（5分間隔）
 * 初回のみ手動実行
 */
function setupTrigger() {
  // 既存のrunScheduledJobsトリガーを削除してから再登録
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runScheduledJobs')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('runScheduledJobs')
    .timeBased()
    .everyMinutes(5)
    .create();

  console.log('✅ Trigger設定完了: runScheduledJobs を5分ごとに実行');
}
