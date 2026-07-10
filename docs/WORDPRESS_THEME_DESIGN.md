# WordPress 独自テーマ実装 設計・方針書

> **このドキュメントの目的**: Claude Code がこの1ファイルを読むだけで、モックサイトを WordPress 独自テーマとして実装できるようにする。
> **読者**: モックサイトのソースコードを持つ別環境の Claude Code（および人間の開発者）。
>
> **実装時の進め方**: このドキュメントの「実装フェーズ」を上から順に実行すること。各フェーズ末尾の「完了条件」をすべて満たしてから次へ進む。

---

## 1. ゴールと絶対要件

### 1.1 ゴール

Claude Code で作成したモックサイト（HTML/CSS/JS）を、Xserver 上の WordPress に **完全独自テーマ（オリジナルテーマ）** として実装する。

### 1.2 絶対要件（優先度順・変更不可）

| # | 要件 | 実現手段（概要） |
|---|------|------------------|
| R1 | **テーマ更新・WordPress 本体更新・他テーマの影響を絶対に受けない** | 親テーマなしのフルスクラッチ独自テーマ。`Update URI:` ヘッダーで自動更新を遮断。外部テーマ・ページビルダーへの依存ゼロ |
| R2 | **モックサイトのデザインをピクセル単位で再現する** | モックの HTML/CSS/JS をそのままテーマのテンプレート・アセットに変換。Gutenberg のフロント側 CSS に依存しない |
| R3 | **管理画面からブログを投稿すると、サイトのブログ一覧・詳細に自動反映される** | WordPress 標準の投稿（post）＋ WP Loop を使用。プラグイン・外部 API 連携は不要（サーバーサイドで完結） |
| R4 | **管理画面からの誤操作でテーマが壊れない** | `DISALLOW_FILE_EDIT` でテーマエディタを無効化。デプロイは Git 管理のコードから一方向に行う |

### 1.3 やらないこと（アンチゴール）

- ❌ 既存テーマ（Twenty Twenty-*, Cocoon 等）の子テーマ化 → 親テーマ更新の影響を受けるため **禁止**
- ❌ Elementor / ページビルダー系プラグインの使用 → プラグイン更新の影響を受けるため **禁止**
- ❌ ブロックテーマ（Full Site Editing / theme.json 主体）→ WordPress 本体のエディタ仕様変更の影響を受けやすいため採用しない。**クラシックテーマ（PHP テンプレート）で実装する**
- ❌ 固定ページの本文をエディタで管理 → デザイン崩れの原因。固定コンテンツはすべてテンプレート PHP 内にハードコード（ブログ記事本文のみエディタ管理）

---

## 2. アーキテクチャ概要

```
┌─────────────────────────────────────────────────────┐
│ Xserver 上の WordPress                                │
│                                                      │
│  wp-content/themes/{THEME_SLUG}/   ← 独自テーマ       │
│  ├─ 固定ページ系テンプレート（モックを完全再現）          │
│  │   front-page.php, page-*.php                      │
│  │   → コンテンツはテンプレート内にハードコード          │
│  │   → WordPress 更新の影響を受けない                  │
│  │                                                   │
│  └─ ブログ系テンプレート（WP Loop で動的表示）           │
│      home.php（一覧）, single.php（詳細）              │
│      → 管理画面の「投稿」がそのまま反映される ← R3       │
└─────────────────────────────────────────────────────┘
        ▲ デプロイ（rsync/scp, 一方向）
┌─────────────────────────────────────────────────────┐
│ ローカル（このリポジトリ / Claude Code 環境）            │
│  Git 管理されたテーマソース ＋ デプロイスクリプト         │
└─────────────────────────────────────────────────────┘
```

**設計の核心**:
- **見た目（デザイン）はすべてコード（テーマ）側**で管理し、Git で追跡する。
- **ブログ記事のコンテンツだけを WordPress（DB）側**で管理する。
- この分離により「運用者は記事だけ書く／デザインはコードでしか変わらない」が保証される。

### 2.1 ブログ連携の仕組み（R3 の実現方法）

WordPress のテーマはサーバーサイドで動くため、**特別な API 連携は不要**。テーマに `home.php`（記事一覧）と `single.php`（記事詳細）を用意し、WP Loop（`WP_Query` / `the_post()`）で投稿を出力するだけで、管理画面から「投稿 → 公開」した記事が即座にサイトへ反映される。

```
管理画面で記事を公開
  → wp_posts テーブルに保存
  → home.php / single.php が WP Loop で自動的に取得・表示   ← 追加実装なしで反映
```

---

## 3. テーマ設計

### 3.1 テーマ命名規則（重要: R1 に直結）

WordPress は「wordpress.org に同名スラッグのテーマが存在すると更新通知を出し、承認すると独自テーマを**上書きしてしまう**」挙動がある。これを構造的に防ぐ:

1. **スラッグは衝突しない固有名にする**: `{プロジェクト固有名}-theme` のような一般名を避けた名前にする。例: `mysite-original-2026`
2. **`style.css` のテーマヘッダーに `Update URI:` を必ず入れる**（WordPress 5.8+ の公式機構。これがあると wordpress.org からの更新チェック対象外になる）

```css
/*
Theme Name: {サイト名} Original Theme
Theme URI: https://example.com/
Author: {あなたの名前}
Description: モックサイトを再現した完全独自テーマ。外部テーマ・プラグインに依存しない。
Version: 1.0.0
Requires at least: 6.0
Requires PHP: 8.0
License: proprietary
Text Domain: {THEME_SLUG}
Update URI: false
*/
```

> `Update URI: false` により、いかなる更新チェックからも除外される。**これが「テーマ更新の影響を絶対に受けない」ための必須設定**。

### 3.2 ディレクトリ構成

このリポジトリ内では `wordpress/theme/{THEME_SLUG}/` に配置する（デプロイ時に `wp-content/themes/{THEME_SLUG}/` へ転送）。

```
wordpress/
├── theme/
│   └── {THEME_SLUG}/
│       ├── style.css              # テーマヘッダーのみ（実CSSは assets/ に置く）
│       ├── functions.php          # テーマ設定・アセット読込・不要機能の無効化
│       ├── index.php              # フォールバック（最低限のループ）
│       ├── front-page.php         # トップページ（モックの index.html を変換）
│       ├── page-{slug}.php        # 各固定ページ（モックの下層ページを変換）
│       ├── home.php               # ブログ記事一覧（WP Loop）
│       ├── single.php             # ブログ記事詳細（WP Loop）
│       ├── 404.php                # 404ページ
│       ├── header.php             # <head> + サイト共通ヘッダー
│       ├── footer.php             # サイト共通フッター + wp_footer()
│       ├── parts/                 # 再利用パーツ（get_template_part で読込）
│       │   ├── blog-card.php      # 記事カード（一覧・トップの新着共通）
│       │   └── pagination.php
│       ├── assets/
│       │   ├── css/               # モックの CSS をそのまま移植
│       │   ├── js/                # モックの JS をそのまま移植
│       │   └── img/               # モックの画像
│       └── screenshot.png         # 管理画面用サムネイル（1200x900）
├── scripts/
│   ├── deploy.sh                  # rsync による Xserver へのデプロイ
│   └── setup-remote.sh            # 初回のみ: WP-CLI 導入・テーマ有効化・初期設定
└── .deploy.env.example            # デプロイ先情報のテンプレート（実値は .gitignore）
```

### 3.3 テンプレートの役割分担

| テンプレート | 対応 URL | コンテンツ管理 |
|--------------|----------|----------------|
| `front-page.php` | `/` | **PHP にハードコード**（モック再現） |
| `page-{slug}.php` | `/{slug}/` | **PHP にハードコード**（モック再現） |
| `home.php` | `/blog/`（表示設定で「投稿ページ」に割当） | **WP Loop**（管理画面の投稿が反映） |
| `single.php` | `/blog/{post}/` 等 | **WP Loop**（記事本文は `the_content()`） |
| `404.php` | 該当なし | ハードコード |

> **トップページに「新着記事」枠がある場合**: `front-page.php` 内で `WP_Query` を回して最新 N 件を `parts/blog-card.php` で表示する。これでトップにも投稿が自動反映される。

### 3.4 functions.php の必須実装

```php
<?php
// ============================================
// 1. テーマ基本設定
// ============================================
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');          // <title> を WP に任せる
    add_theme_support('post-thumbnails');    // アイキャッチ画像を有効化
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
});

// ============================================
// 2. アセット読込（モックの CSS/JS をそのまま enqueue）
//    filemtime をバージョンにしてキャッシュバスト
// ============================================
add_action('wp_enqueue_scripts', function () {
    $dir = get_template_directory();
    $uri = get_template_directory_uri();
    wp_enqueue_style('theme-main', $uri . '/assets/css/main.css', [], filemtime($dir . '/assets/css/main.css'));
    wp_enqueue_script('theme-main', $uri . '/assets/js/main.js', [], filemtime($dir . '/assets/js/main.js'), true);
});

// ============================================
// 3. 影響遮断（R1/R2）: WP が勝手に差し込む CSS/機能を無効化
//    → 本体更新でフロントの見た目が変わる要因を排除
// ============================================
// ブロックエディタのフロント用 CSS を読み込まない（デザインはモックの CSS のみで構成）
add_action('wp_enqueue_scripts', function () {
    wp_dequeue_style('wp-block-library');
    wp_dequeue_style('wp-block-library-theme');
    wp_dequeue_style('classic-theme-styles');
    wp_dequeue_style('global-styles');
}, 20);

// 絵文字スクリプト等の不要な自動挿入を除去
remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');
remove_action('wp_head', 'wp_generator');   // バージョン情報を出さない（セキュリティ）

// ============================================
// 4. 記事本文だけは安全に整形（single.php でのみ影響）
// ============================================
// the_content() の出力には .post-content などのラッパーclassを付け、
// 記事内要素のスタイルは .post-content 配下にスコープした CSS で当てる。

// ============================================
// 5. ブログURLスラッグの安全網（3.7 参照）
//    日本語タイトルのまま公開されても URL が文字化けしないよう、
//    ASCII でないスラッグを自動でフォールバックへ置換する
// ============================================
add_filter('wp_insert_post_data', function ($data) {
    if ($data['post_type'] !== 'post') {
        return $data; // 投稿(post)のみ対象。固定ページ等は触らない
    }
    if ($data['post_status'] === 'auto-draft') {
        return $data;
    }
    // sanitize_title は日本語をパーセントエンコード or 空にするため、
    // 結果に ASCII 英数字が含まれない＝スラッグ未設定とみなす
    $slug = $data['post_name'];
    if ($slug === '' || !preg_match('/[a-z0-9]/i', urldecode($slug))) {
        // 記事ID採番前でも衝突しない一時スラッグ。公開後に手動で英字へ変更可能
        $data['post_name'] = 'post-' . substr(md5($data['post_title'] . time()), 0, 8);
    }
    return $data;
}, 10, 1);
```

> **注意**: `wp-block-library` を dequeue するため、**記事詳細ページの本文スタイルはテーマ CSS 側で用意する**必要がある（見出し・段落・リスト・画像・引用・コードブロック程度で十分）。`.post-content h2 {...}` のようにスコープして書くこと。

### 3.5 header.php / footer.php の必須ルール

- `header.php` は `<?php wp_head(); ?>` を `</head>` 直前に、`footer.php` は `<?php wp_footer(); ?>` を `</body>` 直前に必ず含める（プラグイン・管理バーが動作するための WP の規約）。
- モックの `<link>`/`<script>` タグ直書きは**すべて削除**し、`functions.php` の enqueue に一本化する。
- ナビゲーションはモックの HTML をそのまま使ってよい（`wp_nav_menu` は使わなくてよい。メニュー変更もコード管理にする方が R1/R4 に適う）。ただしリンクは `<?php echo esc_url(home_url('/about/')); ?>` の形式で書き、ドメイン移行に耐えるようにする。

### 3.6 home.php / single.php の実装パターン

**home.php（記事一覧）** — モックのブログ一覧ページのマークアップに WP Loop を埋め込む:

```php
<?php get_header(); ?>
<main class="blog-archive"><!-- ← モックの一覧ページと同じクラス構成 -->
  <?php if (have_posts()) : while (have_posts()) : the_post(); ?>
    <?php get_template_part('parts/blog-card'); ?>
  <?php endwhile; ?>
  <?php get_template_part('parts/pagination'); ?>
  <?php else : ?>
    <p>記事はまだありません。</p>
  <?php endif; ?>
</main>
<?php get_footer(); ?>
```

**parts/blog-card.php** — モックの記事カードの静的テキストをテンプレートタグへ置換:

| モックの静的要素 | 置換後 |
|------------------|--------|
| カードのリンク先 | `<?php the_permalink(); ?>` |
| 記事タイトル | `<?php the_title(); ?>` |
| 日付 | `<?php echo get_the_date('Y.m.d'); ?>` |
| サムネイル画像 | `<?php the_post_thumbnail('medium_large'); ?>`（無い場合のデフォルト画像分岐を入れる） |
| 抜粋文 | `<?php echo esc_html(wp_trim_words(get_the_excerpt(), 60)); ?>` |
| カテゴリバッジ | `<?php $c = get_the_category(); if ($c) echo esc_html($c[0]->name); ?>` |

**single.php（記事詳細）** — 本文は `<div class="post-content"><?php the_content(); ?></div>`。前後記事リンクは `previous_post_link()` / `next_post_link()`。

### 3.7 ブログ記事の URL（スラッグ）ルール【運用者向け・重要】

- **URL 構造は `/blog/{スラッグ}/`**（パーマリンク設定 `/blog/%postname%/`。4章で設定）。
- WordPress は日本語タイトルのまま公開すると、URL が `/blog/%E3%83%96%E3%83%AD.../` のようにパーセントエンコードされて**文字化け**する。これを避けるため、記事の URL は必ず**アルファベットのスラッグ**を使う。
- **記事を書く人の運用ルール（毎回必須）**:
  1. ブロックエディタ右サイドバー →「投稿」タブ →「URL」（または「スラッグ」）欄を開く
  2. 日本語タイトルとは別に、**URL 用のアルファベット文字列を自分で入力する**
     - 例: タイトル「新サービスを開始しました」→ スラッグ `new-service-launch`
     - 小文字・半角英数字・ハイフンのみ。単語はハイフン区切り
  3. 公開後にスラッグを変えると URL が変わりリンク切れになるので、**公開前に確定**する
- **安全網（自動）**: 万一スラッグを英字にし忘れて公開しても、`functions.php` のフィルタ（3.4 の 5番）が `post-xxxxxxxx` という英数字スラッグに自動置換するため、URL が日本語で文字化けすることは起きない。ただし意味のある URL にするため、**運用者が手動で英字スラッグを付けるのが正**（安全網はあくまで保険）。

> WP-CLI で記事を作る場合は `--post_name` に英字スラッグを明示する:
> `wp post create --post_title='新サービス開始' --post_name='new-service-launch' --post_status=publish`

### 3.8 問い合わせフォームの扱い【今回は未接続】

- モックに問い合わせフォームがある場合、**フォームの見た目（HTML/CSS）はそのまま実装するが、送信機能は今回は繋ぎ込まない**。
- `<form>` は残しつつ、送信先は後日決定するプレースホルダ（例: `action="#"` またはボタンを `disabled` + 「準備中」注記）にしておく。
- 将来の接続先候補（この設計の「プラグイン不使用」方針と両立する順）:
  1. Xserver の「メールフォーム」機能（サーバー側で完結、プラグイン不要 ← 方針に最も適合）
  2. 外部フォームサービス（Google フォーム等）への差し替え
  3. どうしても WordPress 内で完結させたい場合のみ、例外的に Contact Form 7 を1つだけ許可
- **実装時の指示**: フォーム箇所には `<!-- TODO: 問い合わせ送信は後日接続。3.8参照 -->` を残し、後から探しやすくする。

---

## 4. WordPress 本体側の設定（初回のみ）

テーマ有効化後、以下を設定する（`setup-remote.sh` で WP-CLI により自動化する）:

```bash
WP="~/bin/wp --path=$HOME/{ドメイン}/public_html"

# 1. テーマ有効化
$WP theme activate {THEME_SLUG}

# 2. 不要な同梱テーマを削除（誤有効化・更新通知の元を断つ）
$WP theme delete --all --force   # activeなテーマは自動でスキップされる

# 3. パーマリンク設定（例: /blog/記事スラッグ/）
$WP rewrite structure '/blog/%postname%/' --hard

# 4. 固定ページ「Blog」を作成し「投稿ページ」に割当（home.php が使われるようになる）
BLOG_ID=$($WP post create --post_type=page --post_title='Blog' --post_name=blog --post_status=publish --porcelain)
$WP option update show_on_front 'page'
$WP option update page_for_posts "$BLOG_ID"
# front-page.php があるためトップは自動でそれが使われる（page_on_front の設定は不要）

# 5. 不要プラグインの削除（Hello Dolly 等）
$WP plugin delete hello akismet
```

**wp-config.php への追記（R4: 管理画面からのテーマ破壊防止）**:

```php
/** 管理画面のテーマ／プラグインエディタを無効化（テーマは Git+デプロイでのみ変更） */
define('DISALLOW_FILE_EDIT', true);
```

> Xserver の wp-config.php は `public_html/wp-config.php`。`/* 編集が必要なのはここまでです */` のコメントより**上**に追記する。

---

## 5. デプロイ設計

### 5.1 前提: Xserver への SSH 接続

- Xserver サーバーパネル →「SSH設定」を ON にし、公開鍵を登録する
- 接続情報: `ssh -p 10022 -i {秘密鍵} {サーバーID}@{サーバーID}.xsrv.jp`
- ドキュメントルート: `/home/{サーバーID}/{ドメイン}/public_html/`

### 5.2 .deploy.env（Git 管理外・.gitignore に追加）

```bash
XSERVER_HOST={サーバーID}.xsrv.jp
XSERVER_USER={サーバーID}
XSERVER_PORT=10022
XSERVER_KEY=~/.ssh/xserver_ed25519
REMOTE_THEME_DIR=/home/{サーバーID}/{ドメイン}/public_html/wp-content/themes/{THEME_SLUG}
```

### 5.3 deploy.sh（rsync 一方向同期）

```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../.deploy.env"

rsync -avz --delete \
  -e "ssh -p ${XSERVER_PORT} -i ${XSERVER_KEY}" \
  --exclude '.DS_Store' \
  "$(dirname "$0")/../theme/{THEME_SLUG}/" \
  "${XSERVER_USER}@${XSERVER_HOST}:${REMOTE_THEME_DIR}/"

echo "✅ Deployed."
```

- `--delete` によりローカル（Git）が常に正。サーバー側でテーマを直接いじっても次のデプロイで消える → **コードの単一情報源が守られる**
- 記事データ（DB）には一切触れないので、デプロイでブログ記事が消えることはない

### 5.4 動作確認手順（デプロイ後に毎回）

1. トップページがモックと一致すること（目視 or スクリーンショット比較）
2. `/blog/` に記事一覧が出ること
3. 管理画面からテスト記事を公開 → 一覧・詳細・（あれば）トップの新着枠に反映されること
4. 404ページの表示
5. `wp theme status {THEME_SLUG}` が Active であること

---

## 6. モック → テーマ変換の作業手順（Claude Code 向け実装ガイド)

### フェーズ 0: 準備

1. モックサイトの全ページを列挙し、以下に分類する:
   - **固定ページ**（トップ、会社概要、サービス等）→ `front-page.php` / `page-{slug}.php`
   - **ブログ系ページ**(一覧、詳細)→ `home.php` / `single.php`。モックにブログ詳細ページが無い場合は一覧のデザイントーンから新規作成する
2. 全ページに共通するヘッダー/フッター部分を特定する
3. `{THEME_SLUG}` を決定する（3.1 の命名規則）

**完了条件**: ページ一覧と対応テンプレートの対応表ができている。

### フェーズ 1: テーマ骨格の作成

1. 3.2 のディレクトリ構成を作成
2. `style.css`（ヘッダーのみ、`Update URI: false` 必須）、`functions.php`（3.4 の内容）を作成
3. モックの CSS/JS/画像を `assets/` へコピー
4. 共通部分を `header.php` / `footer.php` に切り出し（`wp_head()` / `wp_footer()` を忘れない）
5. アセットのパス参照をすべて `get_template_directory_uri()` ベースに書き換える
   - HTML 内: `<img src="<?php echo esc_url(get_template_directory_uri()); ?>/assets/img/...">`
   - CSS 内の `url()` は相対パスのままで動く（CSS ファイルからの相対になるため）

**完了条件**: `index.php` だけで真っ白でないページが表示され、CSS/JS が 200 で読み込まれる。

### フェーズ 2: 固定ページの移植

1. モックの各 HTML から `<body>` 内のページ固有部分を対応する `page-{slug}.php` / `front-page.php` へ移植
2. 内部リンクを `home_url()` ベースに書き換える
3. WordPress 側に同スラッグの固定ページを作成（`wp post create --post_type=page --post_name={slug} ...`）
   - ※ `page-{slug}.php` が使われるためには同スラッグの固定ページが存在する必要がある。本文は空でよい

**完了条件**: 全固定ページがモックと同一の見た目で表示される。

### フェーズ 3: ブログ機能の実装

1. `home.php`、`single.php`、`parts/blog-card.php`、`parts/pagination.php` を 3.6 のパターンで実装
2. `.post-content` 配下の記事本文用 CSS を作成（h2〜h4, p, ul/ol, blockquote, img, a, table, pre/code）
3. `front-page.php` に新着記事枠がある場合は `WP_Query` で実装:

```php
<?php $latest = new WP_Query(['posts_per_page' => 3]); ?>
<?php if ($latest->have_posts()) : while ($latest->have_posts()) : $latest->the_post(); ?>
  <?php get_template_part('parts/blog-card'); ?>
<?php endwhile; wp_reset_postdata(); endif; ?>
```

**完了条件**: テスト記事3件（アイキャッチあり/なし、長短タイトル）で一覧・詳細・新着枠が崩れない。

### フェーズ 4: デプロイと本番設定

1. 5.2〜5.3 のデプロイスクリプトを作成し、`.deploy.env` を `.gitignore` に追加
2. 初回: `setup-remote.sh` を実行（4章の WP-CLI コマンド群）
3. `wp-config.php` に `DISALLOW_FILE_EDIT` を追記
4. 5.4 の動作確認をすべて実施

**完了条件**: 5.4 の 5 項目すべて合格。

### フェーズ 5: 仕上げ（品質・セキュリティ）

- [ ] すべての動的出力にエスケープ（`esc_html` / `esc_url` / `esc_attr`）が入っている
- [ ] `screenshot.png` を配置
- [ ] OGP / meta description の出力（`wp_head` フック or シンプルな自前実装。SEO プラグインに依存しない）
- [ ] 管理画面 → 外観 → テーマ で更新通知が**出ていない**ことを確認（`Update URI: false` の検証）
- [ ] PHP 構文チェック: `find theme -name '*.php' -exec php -l {} \;`

---

## 7. トラブルシューティング / FAQ

| 症状 | 原因と対処 |
|------|-----------|
| `page-{slug}.php` が使われず index.php が表示される | 同スラッグの固定ページが WP 上に存在しない。固定ページを作成する |
| `/blog/` で home.php が使われない | 表示設定の「投稿ページ」が未割当。4章の手順4を実行 |
| 記事本文が無スタイルで表示される | `wp-block-library` を dequeue しているため。`.post-content` 用 CSS を書く（仕様通り） |
| デプロイ後に画面が真っ白 | PHP 構文エラー。`php -l` をデプロイ前に必ず実行。Xserver のエラーログは `~/{ドメイン}/log/` |
| 管理バー（上部の黒いバー）が出ない | `wp_footer()` の入れ忘れ |
| CSS 更新が反映されない | Xserver のサーバーキャッシュ。サーバーパネルでキャッシュ削除、または filemtime バージョンが機能しているか確認 |
| ブログ記事の URL が `%E3%83%96...` と文字化けする | スラッグが日本語のまま。3.7 の通り英字スラッグを手動設定する。安全網フィルタ（3.4-5）が入っていれば `post-xxxx` に自動置換される |

---

## 8. この設計が要件を満たす根拠（レビュー用サマリ）

- **R1（更新の影響を受けない)**: 親テーマなし・`Update URI: false`・wordpress.org 由来コードゼロ・ページビルダー不使用。テーマを更新できる主体が「このリポジトリからのデプロイ」しか存在しない
- **R2（モック再現)**: デザインはモックの CSS のみで構成し、WP が注入するブロック CSS を dequeue。WP 本体更新でフロントの見た目に影響する経路を遮断
- **R3（ブログ連携)**: WP 標準の投稿 + WP Loop。管理画面で公開した瞬間に一覧・詳細・新着枠へ反映。プラグイン不要・API 連携不要で壊れる要素が最小
- **R4（誤操作防止)**: `DISALLOW_FILE_EDIT` + rsync `--delete` により、テーマの変更経路を Git に一本化
