import type { Env } from '../types';

export interface ResendSendOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ResendSendResult {
  success: boolean;
  id?: string;
  error?: string;
}

export function isResendConfigured(env: Env): boolean {
  return !!(env.RESEND_API_KEY && env.RESEND_API_KEY.trim());
}

export function getResendFromAddress(env: Env): string {
  const from = env.RESEND_FROM ? env.RESEND_FROM.trim() : '';
  if (from) {
    if (from.includes('<') && from.includes('>')) return from;
    return `888warden <${from}>`;
  }
  return '888warden <no-reply@vip.david888.com>';
}

export async function sendEmailViaResend(
  env: Env,
  options: ResendSendOptions
): Promise<ResendSendResult> {
  const apiKey = env.RESEND_API_KEY ? env.RESEND_API_KEY.trim() : '';
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }

  const from = getResendFromAddress(env);

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API call failed', {
        status: response.status,
        body: errorText,
      });
      return {
        success: false,
        error: `Resend error (${response.status}): ${errorText}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return { success: true, id: data.id };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to send email via Resend', error);
    return { success: false, error: msg };
  }
}

export async function sendTwoFactorOtpEmail(
  env: Env,
  recipientEmail: string,
  otpCode: string,
  purpose: 'login' | 'setup' = 'login'
): Promise<ResendSendResult> {
  const subject =
    purpose === 'setup'
      ? '888warden 啟用電子郵件兩步驟驗證碼'
      : '888warden 登入安全驗證碼';

  const title =
    purpose === 'setup'
      ? '啟用電子郵件兩步驟驗證'
      : '您的登入安全驗證碼';

  const description =
    purpose === 'setup'
      ? '您正在設定 888warden 電子郵件兩步驟登入保護，請在驗證視窗中輸入以下 6 位數驗證碼：'
      : '您正在嘗試登入 888warden 密碼保險庫。為保護您的帳號安全，請輸入以下 6 位數驗證碼：';

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: 'JetBrains Mono', 'Noto Sans TC', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0b0f19;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #111827;
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 28px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 0;
    }
    .brand-accent {
      color: #38bdf8;
    }
    .brand-sub {
      color: #f8fafc;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 14px 0;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #94a3b8;
      margin: 0 0 24px 0;
    }
    .code-box {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 12px;
      padding: 24px 16px;
      text-align: center;
      margin: 28px 0;
    }
    .otp-code {
      font-family: 'JetBrains Mono', 'Noto Sans TC', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 0.25em;
      color: #38bdf8;
      text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
      display: inline-block;
      margin-left: 0.25em;
    }
    .expiry-note {
      font-size: 13px;
      color: #cbd5e1;
      margin-top: 10px;
    }
    .warning {
      background: rgba(239, 68, 68, 0.08);
      border-left: 3px solid #ef4444;
      padding: 12px 14px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.5;
      color: #fca5a5;
      margin-bottom: 24px;
    }
    .footer {
      border-top: 1px solid #1e293b;
      padding-top: 20px;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand">
        <div class="brand-title">
          <span class="brand-accent">888</span><span class="brand-sub">warden</span>
        </div>
      </div>
      <h1>${title}</h1>
      <p>${description}</p>
      <div class="code-box">
        <div class="otp-code">${otpCode}</div>
        <div class="expiry-note">⏱️ 此驗證碼有效時間為 <strong>10 分鐘</strong>，且僅可使用一次。</div>
      </div>
      <div class="warning">
        🛡️ <strong>安全提醒</strong>：888warden 團隊絕對不會主動向您索取此驗證碼。若非您本人操作，可能有人正在嘗試登入您的帳號，請立即檢查並更換主密碼。
      </div>
      <div class="footer">
        此郵件由 888warden 自動發送，請勿直接回覆。
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `${title}\n\n${description}\n\n驗證碼：${otpCode}\n\n此驗證碼有效時間為 10 分鐘，僅可使用一次。\n若非您本人操作，請儘速更換主密碼。`;

  return sendEmailViaResend(env, {
    to: recipientEmail,
    subject,
    html,
    text,
  });
}
