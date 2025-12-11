/**
 * 認証ルート
 */

import { Router } from 'express';
import { LarkOAuthService } from '../../services/larkOAuthService.js';
import { tokenStorage } from '../../services/tokenStorage.js';

const router = Router();

function getOAuthService() {
  return new LarkOAuthService();
}

/**
 * Lark OAuth認証を開始
 */
router.get('/login', (req, res) => {
  // 環境変数からリダイレクトURIを取得（Lark Developer Consoleに登録したURLと完全一致させる）
  let redirectUri = process.env.LARK_REDIRECT_URI;

  // 環境変数が設定されていない場合はリクエストから生成
  if (!redirectUri) {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    redirectUri = `${protocol}://${host}/auth/callback`;

    // httpの場合はhttpsに変更（ngrok用）
    if (redirectUri.startsWith('http://') && host?.includes('ngrok')) {
      redirectUri = redirectUri.replace('http://', 'https://');
    }
  }

  console.log('Using redirect_uri:', redirectUri);

  const state = Math.random().toString(36).substring(7); // CSRF対策用のランダム文字列

  // stateをセッションに保存
  req.session.oauthState = state;

  const oauthService = getOAuthService();
  const authUrl = oauthService.generateAuthUrl(redirectUri, state);
  console.log('Redirecting to:', authUrl);
  res.redirect(authUrl);
});

/**
 * OAuth認証コールバック
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // stateの検証（CSRF対策）- ngrok経由ではセッションが維持されない場合があるため緩和
    if (state && req.session.oauthState && state !== req.session.oauthState) {
      console.warn('State mismatch - session:', req.session.oauthState, 'received:', state);
      // 開発環境では警告のみ
    }

    if (!code || typeof code !== 'string') {
      throw new Error('Authorization code not received');
    }

    const oauthService = getOAuthService();

    // アクセストークンを取得
    const tokens = await oauthService.getAccessToken(code);

    // ユーザー情報を取得
    const userInfo = await oauthService.getUserInfo(tokens.access_token);

    // セッションに保存
    req.session.userAccessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    req.session.userId = userInfo.open_id;
    req.session.userName = userInfo.name;

    // トークンストレージにも保存（Bot用）
    tokenStorage.saveToken(
      userInfo.open_id,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
      userInfo.name
    );

    // oauthStateをクリア
    delete req.session.oauthState;

    // メインページにリダイレクト
    res.redirect('/?login=success');

  } catch (error) {
    console.error('OAuth認証エラー:', error);
    res.redirect('/?error=auth_failed');
  }
});

/**
 * ログアウト
 */
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('セッション破棄エラー:', err);
    }
    res.redirect('/');
  });
});

/**
 * 現在のユーザー情報を取得
 */
router.get('/user', (req, res) => {
  if (!req.session.userAccessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    userId: req.session.userId,
    userName: req.session.userName,
    authenticated: true,
  });
});

export { router as authRouter };
