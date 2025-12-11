# Larkアプリ権限設定ガイド（スコープ識別子版）

## 🎯 このアプリに必要な権限スコープ（3つ）

このアプリが動作するために必要なAPIスコープを設定します。

**Lark Developer Console の「権限管理」(Permissions) ページで設定してください。**

---

## 📋 必要なスコープ一覧

### 1. カレンダー読み取り権限

**スコープ識別子:**
```
calendar:calendar:readonly
```

**説明:**
- アプリの身分でカレンダー情報を読み取る
- カレンダーイベント一覧の取得
- 空き時間の検出に必要

**Developer Consoleでの設定:**
- カテゴリ: `Calendar` / `日历`
- 探すキーワード: "calendar" で検索
- 選択する項目: アプリ身分でのカレンダー読み取り権限

---

### 2. メッセージ送受信権限

**スコープ識別子:**
```
im:message
```

**説明:**
- チャットメッセージの送受信
- プライベートチャットとグループチャット両方
- 結果をチャットに送信するために必要

**Developer Consoleでの設定:**
- カテゴリ: `Messaging` / `消息与群组`
- 探すキーワード: "message" で検索
- 選択する項目: メッセージ取得・送信権限

---

### 3. Bot送信権限

**スコープ識別子:**
```
im:message:send_as_bot
```

**説明:**
- アプリ名義でメッセージを送信
- Botとしてのメッセージ送信に必要
- チャットへの自動送信機能に使用

**Developer Consoleでの設定:**
- カテゴリ: `Messaging` / `消息与群组`
- 探すキーワード: "send as bot" または "send_as_bot" で検索
- 選択する項目: アプリとしてのメッセージ送信権限

---

## 🔧 Developer Consoleでの設定手順

### ステップ1: 権限管理ページを開く

1. [Lark Developer Console](https://open.feishu.cn/app) にアクセス
2. 作成したアプリをクリック
3. 左メニューから「权限管理」(Permissions) を選択

### ステップ2: スコープを検索して追加

権限ページ上部の検索ボックスを使用:

**方法A: カテゴリから探す**
1. `Calendar` セクションを展開
2. カレンダー読み取り権限を探してチェック
3. `Messaging` セクションを展開
4. メッセージ関連の2つの権限をチェック

**方法B: 検索機能を使う**
1. 検索ボックスに "calendar" と入力
2. 該当する権限を見つけてチェック
3. 検索ボックスに "message" と入力
4. 該当する権限を見つけてチェック
5. 検索ボックスに "send as bot" と入力
6. 該当する権限を見つけてチェック

### ステップ3: 保存

1. ページ右上の「保存」(Save) ボタンをクリック
2. ページをリロードして3つの権限にチェックが入っていることを確認

---

## 🔍 スコープ識別子とは？

スコープ識別子は、Lark APIで使用される権限の正式な識別子です:

- **形式:** `カテゴリ:リソース:アクション`
- **例:** `calendar:calendar:readonly`
  - `calendar` = カテゴリ
  - `calendar` = リソース
  - `readonly` = アクション（読み取り専用）

Developer ConsoleのUIは言語設定によって表示が変わりますが、スコープ識別子は常に同じです。

---

## 📊 権限の対応表

| スコープ識別子 | 英語UI表示例 | 中国語UI表示例 | 用途 |
|---------------|-------------|---------------|------|
| `calendar:calendar:readonly` | Access calendar and schedule information as the app | 以应用身份读取日历信息 | カレンダー読み取り |
| `im:message` | Obtain and send messages in private and group chats | 获取与发送单聊、群组消息 | メッセージ送受信 |
| `im:message:send_as_bot` | Send messages as the app | 以应用的身份发送消息 | Bot送信 |

**注:** UI表示は言語設定やLarkのバージョンによって変わる可能性があります。

---

## ⚠️ よくある問題

### Q1: スコープが見つからない

**A:** Developer Consoleの検索機能を使ってください:
- "calendar" で検索 → カレンダー関連の権限が表示される
- "message" で検索 → メッセージ関連の権限が表示される
- "bot" で検索 → Bot関連の権限が表示される

### Q2: 保存したのに権限が反映されない

**A:** 以下を確認:
1. ページをリロードしてチェックが入っているか確認
2. アプリのバージョンを作成して公開する必要がある場合があります
3. 「版本管理与发布」から新バージョンを作成

### Q3: APIコール時に "insufficient permissions" エラー

**A:** 以下を確認:
1. 必要な3つのスコープすべてにチェックが入っているか
2. アプリが公開されているか
3. `.env` ファイルの `LARK_APP_ID` と `LARK_APP_SECRET` が正しいか

---

## 🎓 追加のスコープ（オプション）

将来的に機能を拡張する場合、以下のスコープも有用です:

### 複数人のカレンダー対応
```
calendar:calendar.event:readonly
```
- カレンダーイベントの詳細情報読み取り
- 他のユーザーのカレンダー確認（権限があれば）

### グループチャット対応
```
im:message.group_at_msg:readonly
```
- グループでメンションされたメッセージの受信
- メンション通知への応答

### 画像・ファイル送信
```
im:resource
```
- 画像やファイルのアップロード・取得
- リッチなメッセージカード送信

---

## ✅ 設定完了チェックリスト

- [ ] `calendar:calendar:readonly` を設定
- [ ] `im:message` を設定
- [ ] `im:message:send_as_bot` を設定
- [ ] 「保存」ボタンをクリック
- [ ] ページリロードで3つともチェック済み確認
- [ ] `.env` に App ID と Secret を設定
- [ ] `npm run dev` でアプリが動作することを確認

---

## 📚 参考リンク

- [Lark API スコープリスト (英語)](https://open.larksuite.com/document/ukTMukTMukTM/uYTM5UjL2ETO14iNxkTN/scope-list)
- [Feishu API スコープリスト (中国語)](https://open.feishu.cn/document/server-docs/application-scope/scope-list)
- [Lark Calendar API ドキュメント](https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/calendar-v4)
- [Lark Messaging API ドキュメント](https://open.larksuite.com/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1)

---

全て完了したら `npm run dev` を実行してアプリを起動してください！
