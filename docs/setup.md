# 🗡️ HANASABI セットアップ手順

## 所要時間: 約30分

---

## STEP 1: Google スプレッドシート作成

1. [Google Sheets](https://sheets.google.com) で新規スプレッドシート作成
2. タイトルを「HANASABI管理シート」に変更
3. URLから`/d/`以降の部分（シートID）をメモ
   ```
   https://docs.google.com/spreadsheets/d/【ここがSHEET_ID】/edit
   ```

---

## STEP 2: GASプロジェクト作成 + clasp設定

```bash
# 1. clasp インストール（未インストールの場合）
npm install -g @google/clasp

# 2. Googleアカウントでログイン
clasp login

# 3. GASプロジェクト作成
cd X:\projects\hanasabi\gas
clasp create --title "HANASABI販売促進侍" --type webapp

# 4. .clasp.json が生成されたことを確認
#    scriptId が含まれているのでコミットOK（APIキーは含まれない）

# 5. GASにプッシュ
clasp push
```

---

## STEP 3: PropertiesService にAPIキーを設定

1. `clasp open` でGASエディタを開く
2. `Config.gs` の `setupProperties()` 関数を見つける
3. **各値を実際のキーに書き換える**（コメント「★」の箇所）
4. エディタ上部の「実行」ボタンから `setupProperties` を実行
5. **実行後、書き換えた値を元のプレースホルダーに戻す**（セキュリティのため）
6. 再度 `clasp push`

### 確認方法
GASエディタ → プロジェクトの設定 → スクリプト プロパティ で確認できます。

---

## STEP 4: GAS Web App デプロイ

1. GASエディタ右上「デプロイ」→「新しいデプロイ」
2. 種類: ウェブアプリ
3. 設定:
   - 説明: `HANASABI v1.0`
   - 次のユーザーとして実行: **自分**
   - アクセスできるユーザー: **全員**
4. 「デプロイ」クリック
5. **ウェブアプリのURL**をメモ（`https://script.google.com/macros/s/XXXXX/exec`）

---

## STEP 5: フロントエンド設定

`frontend/assets/app.js` を編集:

```javascript
const HANASABI_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/【STEP4のURL】/exec',
  TOKEN:   '【APP_BEARER_TOKEN】'  // GASコンソールで確認
};
```

`APP_BEARER_TOKEN` の確認方法:
- GASエディタ → プロジェクトの設定 → スクリプト プロパティ → `APP_BEARER_TOKEN` の値

---

## STEP 6: GitHub Pages 公開

```bash
# GSDアカウントのリポジトリに frontend/ をプッシュ
cd X:\projects\hanasabi

git init
git remote add origin https://github.com/ginzasugiden/hanasabi.git
git add .
git commit -m "🗡️ HANASABI 初回リリース"
git push -u origin main
```

GitHubリポジトリ設定:
- Settings → Pages → Source: `main` ブランチ / `frontend` フォルダ
- 公開URL: `https://ginzasugiden.github.io/hanasabi/`

公開後、GASの `FRONTEND_ORIGIN` を更新:
- PropertiesService → `FRONTEND_ORIGIN` = `https://ginzasugiden.github.io`

---

## STEP 7: スケジューラ起動

GASエディタから `setupTrigger()` を手動実行:
- これにより5分ごとに `runScheduledJobs` が自動実行されます

---

## STEP 8: 動作テスト

1. ダッシュボード（`index.html`）を開く
2. 「LINEテスト送信」ボタンで自分のUserIDにテスト送信
3. 商品選択 → AI生成 → 配信の一連の流れをテスト

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| `401 Unauthorized` | `APP_BEARER_TOKEN` が `app.js` と一致しているか確認 |
| 楽天API `403` | `RAKUTEN_SERVICE_SECRET` / `LICENSE_KEY` を確認 |
| LINE送信失敗 | `LINE_CHANNEL_ACCESS_TOKEN` の有効期限を確認 |
| AI生成タイムアウト | GASの実行時間上限（6分）を超えている。単品ずつ試す |
| CORSエラー | `FRONTEND_ORIGIN` をGitHub PagesのURLに更新してデプロイし直す |

---

## Sheets シート構成（自動作成）

| シート名 | 用途 |
|---------|------|
| `配信履歴` | 全配信ログ |
| `スケジュール` | 配信予約一覧 |
| `クーポン履歴` | 発行クーポン一覧 |
| `AI生成履歴` | 生成した文言の記録 |
