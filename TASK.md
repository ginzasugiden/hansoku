# 🗡️ HANASABI 販売促進侍 — Claude Code タスク指示書

## プロジェクト概要
楽天商品を選択し、AI（Claude/GPT/Gemini）で販促文言を自動生成、
LINEへテキスト・リッチ・カード形式で自動配信するSaaSツール。

## ディレクトリ構成
```
X:\projects\hanasabi\
├── TASK.md               ← この指示書
├── .env.example          ← 環境変数テンプレート（.envは絶対コミット禁止）
├── .gitignore
├── gas/                  ← GASソース（clasp push対象）
│   ├── appsscript.json
│   ├── Code.gs           ← メインルーター・Web App エントリ
│   ├── Config.gs         ← PropertiesServiceからAPIキー取得
│   ├── RakutenAPI.gs     ← 楽天 ItemAPI 2.0 連携
│   ├── CouponManager.gs  ← 楽天クーポンAPI
│   ├── AIEngine.gs       ← Claude/GPT/Gemini 並列生成
│   ├── LineMessaging.gs  ← LINE Messaging API 3種配信
│   ├── Scheduler.gs      ← Time-based Trigger 自動配信
│   └── Utils.gs          ← 共通ユーティリティ
├── frontend/             ← GitHub Pages（GSDアカウント）
│   ├── index.html        ← ダッシュボード
│   ├── products.html     ← 商品選択UI
│   ├── editor.html       ← AI文言生成・編集・プレビュー
│   ├── scheduler.html    ← 配信スケジュール管理
│   └── assets/
│       ├── style.css
│       └── app.js        ← 共通JS（GAS API呼び出し）
└── docs/
    ├── setup.md          ← セットアップ手順
    ├── security.md       ← セキュリティ設計
    └── api-reference.md  ← 内部API仕様
```

## 実装タスク一覧（順番通りに実行）

### STEP 1: GAS基盤
- [ ] `gas/appsscript.json` 作成
- [ ] `gas/Config.gs` 作成（PropertiesService wrapper）
- [ ] `gas/Utils.gs` 作成（CORS対応doGet/doPost、レスポンス共通化）
- [ ] `gas/Code.gs` 作成（ルーター: action パラメータで振り分け）

### STEP 2: 楽天API連携
- [ ] `gas/RakutenAPI.gs` 作成
  - getItems(searchParams) — 商品一覧取得
  - getItemDetail(itemCode) — 商品詳細取得
- [ ] `gas/CouponManager.gs` 作成
  - createCoupon(itemCode, discountRate, period) — クーポン発行
  - getCoupons() — クーポン一覧

### STEP 3: AI生成エンジン
- [ ] `gas/AIEngine.gs` 作成
  - generateWithClaude(product, context)
  - generateWithGPT(product, context)
  - generateWithGemini(product, context)
  - generateAll(product) — 3並列実行 → {claude, gpt, gemini}

### STEP 4: LINE配信
- [ ] `gas/LineMessaging.gs` 作成
  - sendTextMessage(message, userId)
  - sendRichMessage(imageUrl, linkUrl, altText)
  - sendCardMessage(products[]) — カルーセル（最大10件）
  - broadcastMessage(type, content) — 全ユーザー配信

### STEP 5: スケジューラ
- [ ] `gas/Scheduler.gs` 作成
  - registerSchedule(datetime, payload) — Sheets に登録
  - runScheduledJobs() — Trigger から毎分呼び出し
  - setupTrigger() — 5分間隔Triggerをセット

### STEP 6: フロントエンド
- [ ] `frontend/assets/style.css` — 共通スタイル
- [ ] `frontend/assets/app.js` — GAS WebApp呼び出し共通
- [ ] `frontend/index.html` — ダッシュボード（配信履歴・統計）
- [ ] `frontend/products.html` — 商品選択（チェックボックス複数選択）
- [ ] `frontend/editor.html` — AI文言生成・3案並列表示・編集
- [ ] `frontend/scheduler.html` — 日時指定配信・即時配信

### STEP 7: ドキュメント
- [ ] `docs/setup.md` — clasp設定〜GitHub Pages公開まで
- [ ] `.env.example` と `.gitignore` 作成

## コーディング規約
- GASはES2020以降（const/let/arrow function使用可）
- 全APIキーはPropertiesServiceのみ（コード内に直書き禁止）
- エラーは必ずconsole.error + Sleetに記録
- 全関数にJSDocコメント
- フロントはVanilla JS（フレームワーク不使用）
- CSS変数でテーマ管理

## セキュリティ要件
- GAS WebApp: Bearer Token認証
- CORS: 許可オリジンをfrontendのGitHub Pages URLのみに制限
- LINE: X-Line-Signature 署名検証必須
- APIキー: ScriptProperties に暗号化保管
