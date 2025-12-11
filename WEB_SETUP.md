# Larkカレンダー空き時間提案 Webアプリ セットアップガイド

## 🌐 Webアプリケーション版について

このアプリは、Webブラウザから誰でもアクセスして、Larkアカウントで認証することで、自分のカレンダーの空き時間を確認できるアプリケーションです。

---

## 📋 必要な設定（Lark Developer Console）

### ステップ1: アプリの基本設定

「PERMISSIONS.md」の手順に従って、以下を完了してください:

1. ✅ アプリの作成
2. ✅ App IDとApp Secretの取得
3. ✅ 権限の設定（3つのスコープ）
4. ✅ アプリの公開

### ステップ2: **OAuth リダイレクトURIの設定（重要！）**

Webアプリで認証を行うには、リダイレクトURIの設定が必要です。

1. Lark Developer Consoleで、作成したアプリを開く

2. 左メニューから「**安全设置**」（セキュリティ設定）または「**应用凭证**」を選択

3. 「**重定向 URL**」（Redirect URL）セクションを見つける

4. 以下のURLを追加:

   **ローカル開発環境:**
   ```
   http://localhost:3000/auth/callback
   ```

   **本番環境（デプロイ後）:**
   ```
   https://your-domain.com/auth/callback
   ```

5. 「保存」をクリック

---

## 🚀 アプリの起動

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルに以下を設定（既に設定済みの場合はスキップ）:

```env
# Lark API認証情報
LARK_APP_ID=cli_xxxxxxxxxx
LARK_APP_SECRET=xxxxxxxxxxxxx

# セッションシークレット（本番環境では必ず変更）
SESSION_SECRET=your-secret-key-change-in-production

# カレンダー設定
LARK_CALENDAR_ID=primary
WORKING_HOURS_START=09:00
WORKING_HOURS_END=18:00
MEETING_DURATION_MINUTES=60

# サーバー設定（オプション）
PORT=3000
NODE_ENV=development
```

### 3. Webサーバーの起動

```bash
npm run web
```

サーバーが起動したら、以下のメッセージが表示されます:

```
🌸 Larkカレンダー空き時間提案アプリ
🌐 サーバー起動: http://localhost:3000
📚 使い方:
   1. ブラウザで http://localhost:3000 にアクセス
   2. "Larkでログイン" ボタンをクリック
   3. Larkで認証を許可
   4. カレンダーの空き時間を確認
```

### 4. ブラウザでアクセス

ブラウザで http://localhost:3000 を開きます。

---

## 👥 使い方（エンドユーザー向け）

### 初回ログイン

1. **「Larkでログイン」ボタンをクリック**
   - Larkの認証ページにリダイレクトされます

2. **権限を許可**
   - カレンダーへのアクセス権限を許可してください

3. **自動的にアプリにリダイレクト**
   - 認証が完了すると、自動的にアプリに戻ります

### カレンダーの空き時間を確認

1. **検索条件を設定**
   - 検索期間（日数）: デフォルト7日
   - 候補数: デフォルト5個

2. **「空き時間を検索」ボタンをクリック**

3. **結果が表示されます**
   - おすすめの候補日時（優先順）
   - 日別の空き時間一覧

---

## 🔒 セキュリティについて

### セッション管理

- ユーザーのアクセストークンはサーバー側のセッションに保存されます
- セッションは24時間有効です
- ログアウトするとセッションが破棄されます

### 本番環境での注意事項

本番環境にデプロイする場合は、以下を必ず実施してください:

1. **SESSION_SECRETの変更**
   ```env
   SESSION_SECRET=<ランダムで長い文字列に変更>
   ```

2. **HTTPSの使用**
   ```env
   NODE_ENV=production
   ```
   - `NODE_ENV=production`の場合、セッションクッキーは`secure`フラグが有効になります

3. **リダイレクトURIの更新**
   - Lark Developer Consoleで本番環境のURLを設定

---

## 🌍 デプロイ方法

### Vercel / Netlify / Railway など

1. GitHubリポジトリにプッシュ

2. デプロイサービスと連携

3. 環境変数を設定:
   - `LARK_APP_ID`
   - `LARK_APP_SECRET`
   - `SESSION_SECRET`
   - `NODE_ENV=production`

4. Lark Developer ConsoleでリダイレクトURIを本番URLに更新:
   ```
   https://your-domain.com/auth/callback
   ```

---

## 📊 機能

### 実装済み機能

- ✅ Lark OAuth 2.0 認証
- ✅ ユーザーセッション管理
- ✅ カレンダー空き時間の自動検出
- ✅ おすすめ候補日時の提案
- ✅ 日別空き時間一覧の表示
- ✅ レスポンシブデザイン

### 今後追加可能な機能

- 複数人のカレンダー統合
- カレンダーへの予定追加
- メールやチャットへの自動送信
- カスタム稼働時間設定
- カレンダー選択（複数カレンダー対応）

---

## 🐛 トラブルシューティング

### エラー: "Invalid redirect URI"

- Lark Developer Consoleで正しいリダイレクトURIが設定されているか確認
- URLが完全に一致しているか確認（最後の`/`も含めて）

### エラー: "wrong unit for app tenant"

- アプリが公開されているか確認
- 権限が正しく設定されているか確認（PERMISSIONS.md参照）

### エラー: "Authentication required"

- ブラウザのクッキーが有効になっているか確認
- セッションが期限切れの場合は再ログイン

---

## 📚 関連ドキュメント

- [PERMISSIONS.md](./PERMISSIONS.md) - 権限設定の詳細手順
- [README.md](./README.md) - プロジェクト全体の説明
- [Lark Open Platform](https://open.feishu.cn/document/) - 公式ドキュメント

---

🌸 **準備ができたら `npm run web` を実行してアプリを起動してください！**
