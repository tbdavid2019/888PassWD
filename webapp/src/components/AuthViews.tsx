import { useEffect, useRef, useState } from 'preact/hooks';
import { AlertTriangle, ArrowLeft, ChevronDown, Eye, EyeOff, KeyRound, Lock, LogIn, LogOut, Mail, Send, ShieldCheck, Unlock, UserPlus } from 'lucide-preact';
import NetworkStatusBadge from '@/components/NetworkStatusBadge';
import StandalonePageFrame from '@/components/StandalonePageFrame';
import { t } from '@/lib/i18n';
import { getCurrentNetworkStatus, subscribeNetworkStatus, type NetworkStatus } from '@/lib/network-status';

interface LoginValues {
  email: string;
  password: string;
}

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  password2: string;
  passwordHint: string;
  inviteCode: string;
}

interface AuthViewsProps {
  mode: 'login' | 'register' | 'locked';
  relaxedLoginInput?: boolean;
  authPlaceholder?: string;
  unlockPlaceholder?: string;
  pendingAction: 'login' | 'passkey' | 'register' | 'unlock' | null;
  unlockReady: boolean;
  unlockPreparing: boolean;
  sessionRefreshError?: string;
  loginValues: LoginValues;
  pendingPasskeyPasswordEmail?: string | null;
  passkeyPassword: string;
  registerValues: RegisterValues;
  registrationInviteRequired?: boolean;
  unlockPassword: string;
  emailForLock: string;
  loginHintLoading: boolean;
  onChangeLogin: (next: LoginValues) => void;
  onChangePasskeyPassword: (password: string) => void;
  onChangeRegister: (next: RegisterValues) => void;
  onChangeUnlock: (password: string) => void;
  onSubmitLogin: () => void;
  onSubmitEmailOtpLogin: (email: string, otpCode: string, password: string) => void;
  onSendOtp: (email: string) => Promise<{ ok: boolean; retryAfter?: number; error?: string }>;
  onSubmitPasskey: () => void;
  onSubmitPasskeyUnlock: () => void;
  onSubmitPasskeyPassword: () => void;
  onSubmitRegister: () => void;
  onSubmitUnlock: () => void;
  onGotoLogin: () => void;
  onGotoRegister: () => void;
  onLogout: () => void;
  onTogglePasswordHint: () => void;
  onShowLockedPasswordHint: () => void;
  onRetrySessionRefresh: () => void;
}

function PasswordField(props: {
  label: string;
  value: string;
  onInput: (v: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="field">
      <span>{props.label}</span>
      <div className="password-wrap">
        <input
          className="input"
          type={show ? 'text' : 'password'}
          value={props.value}
          onInput={(e) => props.onInput((e.currentTarget as HTMLInputElement).value)}
          autoFocus={props.autoFocus}
          autoComplete={props.autoComplete || 'new-password'}
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={props.placeholder}
        />
        <button type="button" className="eye-btn" onClick={() => setShow((v) => !v)}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </label>
  );
}

function OfflineModeNotice() {
  const [status, setStatus] = useState<NetworkStatus>(getCurrentNetworkStatus);

  useEffect(() => subscribeNetworkStatus(setStatus), []);

  if (status !== 'offline') return null;

  return (
    <div className="offline-mode-notice" role="alert" aria-live="assertive">
      <div>
        <strong>{t('txt_offline_mode_notice_title')}</strong>
        <div className="offline-shortcut-list">
          <div className="offline-shortcut-row">
            <span className="offline-shortcut-label">{t('txt_offline_mode_notice_windows')}</span>
            <span className="offline-shortcut-value">
              <span className="offline-shortcut-chord"><kbd>Ctrl</kbd><span>+</span><kbd>F5</kbd></span>
            </span>
          </div>
          <div className="offline-shortcut-row">
            <span className="offline-shortcut-label">{t('txt_offline_mode_notice_macos')}</span>
            <span className="offline-shortcut-value">
              <span className="offline-shortcut-chord"><kbd>Command</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>R</kbd></span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthViews(props: AuthViewsProps) {
  const loginBusy = props.pendingAction === 'login';
  const passkeyBusy = props.pendingAction === 'passkey';
  const registerBusy = props.pendingAction === 'register';
  const unlockBusy = props.pendingAction === 'unlock';
  const passkeyPasswordPending = !!props.pendingPasskeyPasswordEmail;
  const showInviteCodeField = props.registrationInviteRequired !== false || !!props.registerValues.inviteCode.trim();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCountdown]);

  async function handleSendOtp() {
    if (otpSending || otpCountdown > 0) return;
    const email = props.loginValues.email.trim();
    if (!email) return;
    setOtpSending(true);
    try {
      const result = await props.onSendOtp(email);
      if (result.ok) {
        setOtpCountdown(60);
        otpInputRef.current?.focus();
      } else if (result.retryAfter) {
        setOtpCountdown(result.retryAfter);
      }
    } finally {
      setOtpSending(false);
    }
  }

  if (props.mode === 'locked') {
    return (
      <div className="auth-page">
        <StandalonePageFrame title={t('txt_unlock_vault')} titleAccessory={<NetworkStatusBadge />}>
          <form
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSubmitUnlock();
            }}
          >
            <OfflineModeNotice />
            <p className="muted standalone-muted">{props.emailForLock}</p>
            <input type="text" value={props.emailForLock} autoComplete="off" readOnly hidden tabIndex={-1} aria-hidden="true" />

            {/* === 方案 A：通行密鑰解鎖置頂優先 === */}
            <div className="passkey-hero-section">
              <button
                type="button"
                className="btn-passkey-hero"
                onClick={props.onSubmitPasskeyUnlock}
                disabled={unlockBusy || passkeyBusy || props.unlockPreparing || !props.unlockReady}
                aria-label={t('txt_unlock_with_passkey')}
              >
                <div className="passkey-hero-icon-tile">
                  <KeyRound size={22} />
                </div>
                <div className="passkey-hero-body">
                  <div className="passkey-hero-title-row">
                    <span className="passkey-hero-title">
                      {passkeyBusy ? t('txt_unlocking') : t('txt_unlock_with_passkey')}
                    </span>
                    <span className="passkey-hero-badge">推薦 (Fast)</span>
                  </div>
                  <span className="passkey-hero-sub">Touch ID · Face ID · 實體安全金鑰免密快速解鎖</span>
                </div>
              </button>
            </div>

            <div className="auth-divider">
              <span className="auth-divider-line" />
              <span className="auth-divider-text">{t('txt_or')}</span>
              <span className="auth-divider-line" />
            </div>

            <PasswordField
              label={t('txt_master_password')}
              value={props.unlockPassword}
              autoFocus
              autoComplete="new-password"
              placeholder={props.unlockPlaceholder}
              onInput={props.onChangeUnlock}
            />
            <div className="auth-support-row">
              <span className="browser-defense-hint">
                <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                <span>防瀏覽器儲存隔離</span>
              </span>
              <button
                type="button"
                className="auth-link-btn"
                onClick={props.onShowLockedPasswordHint}
                disabled={unlockBusy || props.unlockPreparing}
              >
                {t('txt_show_password_hint')}
              </button>
            </div>
            {props.unlockPreparing ? (
              <p className="muted standalone-muted">{t('txt_loading')}</p>
            ) : null}
            {props.sessionRefreshError ? (
              <div className="offline-mode-notice" role="alert" aria-live="polite">
                <AlertTriangle size={18} />
                <div>
                  <strong>{props.sessionRefreshError}</strong>
                  <div>
                    <button type="button" className="auth-link-btn" onClick={props.onRetrySessionRefresh}>
                      {t('txt_refresh')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <button type="submit" className="btn btn-secondary full" disabled={unlockBusy || passkeyBusy || props.unlockPreparing || !props.unlockReady}>
              <Unlock size={16} className="btn-icon" />
              {unlockBusy ? t('txt_unlocking') : props.unlockPreparing ? t('txt_loading') : t('txt_unlock')}
            </button>
            <div className="or">{t('txt_or')}</div>
            <button type="button" className="btn btn-secondary full" onClick={props.onLogout} disabled={unlockBusy || passkeyBusy}>
              <LogOut size={16} className="btn-icon" />
              {t('txt_log_out')}
            </button>
          </form>
        </StandalonePageFrame>
      </div>
    );
  }

  if (props.mode === 'register') {
    return (
      <div className="auth-page">
        <StandalonePageFrame title={t('txt_create_account')} titleAccessory={<NetworkStatusBadge />}>
          <form
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            onSubmit={(e) => {
              e.preventDefault();
              props.onSubmitRegister();
            }}
          >
            <label className="field">
              <span>{t('txt_name')}</span>
              <input
                className="input"
                value={props.registerValues.name}
                autoComplete="name"
                onInput={(e) =>
                  props.onChangeRegister({ ...props.registerValues, name: (e.currentTarget as HTMLInputElement).value })
                }
              />
            </label>
            <label className="field">
              <span>{t('txt_email')}</span>
              <input
                className="input"
                type="email"
                value={props.registerValues.email}
                autoComplete="email"
                onInput={(e) =>
                  props.onChangeRegister({ ...props.registerValues, email: (e.currentTarget as HTMLInputElement).value })
                }
              />
            </label>
            <PasswordField
              label={t('txt_master_password')}
              value={props.registerValues.password}
              autoComplete="new-password"
              onInput={(v) => props.onChangeRegister({ ...props.registerValues, password: v })}
            />
            <PasswordField
              label={t('txt_confirm_master_password')}
              value={props.registerValues.password2}
              autoComplete="new-password"
              onInput={(v) => props.onChangeRegister({ ...props.registerValues, password2: v })}
            />
            <label className="field">
              <span>{t('txt_password_hint_optional')}</span>
              <input
                className="input"
                maxLength={120}
                value={props.registerValues.passwordHint}
                placeholder={t('txt_password_hint_register_placeholder')}
                onInput={(e) =>
                  props.onChangeRegister({ ...props.registerValues, passwordHint: (e.currentTarget as HTMLInputElement).value })
                }
              />
            </label>
            {showInviteCodeField ? (
              <label className="field">
                <span>{t('txt_invite_code_required')}</span>
                <input
                  className="input"
                  value={props.registerValues.inviteCode}
                  autoComplete="off"
                  onInput={(e) =>
                    props.onChangeRegister({ ...props.registerValues, inviteCode: (e.currentTarget as HTMLInputElement).value })
                  }
                />
              </label>
            ) : null}
            <button type="submit" className="btn btn-primary full" disabled={registerBusy}>
              <UserPlus size={16} className="btn-icon" />
              {registerBusy ? t('txt_registering') : t('txt_create_account')}
            </button>
            <div className="or">{t('txt_or')}</div>
            <button type="button" className="btn btn-secondary full" onClick={props.onGotoLogin} disabled={registerBusy}>
              <ArrowLeft size={16} className="btn-icon" />
              {t('txt_back_to_login')}
            </button>
          </form>
        </StandalonePageFrame>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <StandalonePageFrame title={t('txt_log_in')} titleAccessory={<NetworkStatusBadge />}>
        <form
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-bwignore="true"
          data-form-type="other"
          onSubmit={(e) => {
            e.preventDefault();
            if (passkeyPasswordPending) {
              props.onSubmitPasskeyPassword();
              return;
            }
            if (showPasswordForm && !otpCode.trim()) {
              props.onSubmitLogin();
              return;
            }
            if (otpCode.trim()) {
              props.onSubmitEmailOtpLogin(props.loginValues.email, otpCode, props.loginValues.password);
              return;
            }
            if (showPasswordForm) {
              props.onSubmitLogin();
              return;
            }
            props.onSubmitEmailOtpLogin(props.loginValues.email, otpCode, props.loginValues.password);
          }}
        >
          <OfflineModeNotice />
          {passkeyPasswordPending ? (
            <>
              <p className="muted standalone-muted">{props.pendingPasskeyPasswordEmail}</p>
              <input type="text" value={props.pendingPasskeyPasswordEmail || ''} autoComplete="off" readOnly hidden tabIndex={-1} aria-hidden="true" />
              <PasswordField
                label={t('txt_master_password')}
                value={props.passkeyPassword}
                autoFocus
                autoComplete="new-password"
                placeholder={props.authPlaceholder}
                onInput={props.onChangePasskeyPassword}
              />
              <button type="submit" className="btn btn-primary full" disabled={loginBusy}>
                <Unlock size={16} className="btn-icon" />
                {loginBusy ? t('txt_unlocking') : t('txt_unlock')}
              </button>
              <div className="or">{t('txt_or')}</div>
              <button type="button" className="btn btn-secondary full" onClick={props.onGotoLogin} disabled={loginBusy}>
                <ArrowLeft size={16} className="btn-icon" />
                {t('txt_back_to_login')}
              </button>
            </>
          ) : (
            <>
              {/* === 1. 通行密鑰登入 (Passkey) === */}
              <div className="passkey-hero-section">
                <button
                  type="button"
                  className="btn-passkey-hero"
                  onClick={props.onSubmitPasskey}
                  disabled={loginBusy || passkeyBusy}
                  aria-label={t('txt_login_with_passkey')}
                >
                  <div className="passkey-hero-icon-tile">
                    <KeyRound size={22} />
                  </div>
                  <div className="passkey-hero-body">
                    <div className="passkey-hero-title-row">
                      <span className="passkey-hero-title">
                        {passkeyBusy ? t('txt_logging_in') : t('txt_login_with_passkey')}
                      </span>
                      <span className="passkey-hero-badge">推薦 (Fast)</span>
                    </div>
                    <span className="passkey-hero-sub">Touch ID · Face ID · 實體安全金鑰免密快速登入</span>
                  </div>
                </button>
              </div>

              <div className="auth-divider">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">{t('txt_or')}</span>
                <span className="auth-divider-line" />
              </div>

              {/* === 2. Email OTP 驗證碼登入 (主要登入區) === */}
              <div className="auth-otp-section">
                {/* Email 欄位 + 發送驗證碼按鈕 */}
                <label className="field">
                  <span>{t('txt_email')}</span>
                  <div className="send-otp-row">
                    <input
                      className="input flex-1"
                      type={props.relaxedLoginInput ? 'text' : 'email'}
                      value={props.loginValues.email}
                      autoComplete="off"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      data-bwignore="true"
                      data-form-type="other"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={props.authPlaceholder}
                      autoFocus
                      onInput={(e) =>
                        props.onChangeLogin({
                          ...props.loginValues,
                          email: (e.currentTarget as HTMLInputElement).value,
                        })
                      }
                    />
                    <button
                      type="button"
                      className="btn-send-otp"
                      onClick={() => void handleSendOtp()}
                      disabled={otpSending || otpCountdown > 0 || !props.loginValues.email.trim() || loginBusy}
                    >
                      {otpSending ? <span className="spinner-sm" /> : <Send size={14} />}
                      <span>
                        {otpCountdown > 0
                          ? t('txt_resend_code_cooldown', { seconds: otpCountdown })
                          : t('txt_send_verification_code')}
                      </span>
                    </button>
                  </div>
                </label>

                {/* 6 位數 OTP 驗證碼輸入欄 */}
                <label className="field">
                  <span>{t('txt_email_otp_code_label')}</span>
                  <input
                    ref={otpInputRef}
                    className="input otp-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    autoComplete="one-time-code"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-bwignore="true"
                    data-form-type="other"
                    placeholder={t('txt_email_otp_code_placeholder')}
                    onInput={(e) =>
                      setOtpCode((e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6))
                    }
                  />
                </label>

                {/* 主密碼（零知識本地解鎖） */}
                <PasswordField
                  label={t('txt_master_password_vault_decrypt')}
                  value={props.loginValues.password}
                  autoComplete="new-password"
                  placeholder={props.authPlaceholder}
                  onInput={(v) => props.onChangeLogin({ ...props.loginValues, password: v })}
                />

                {/* 零知識安全與防瀏覽器記憶說明卡 */}
                <div className="auth-info-banner">
                  <ShieldCheck size={18} className="text-orange-500 shrink-0 mt-0.5" />
                  <span>{t('txt_email_otp_security_notice')}</span>
                </div>

                <div className="auth-support-row">
                  <span className="browser-defense-hint">
                    <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                    <span>防瀏覽器儲存隔離</span>
                  </span>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={props.onTogglePasswordHint}
                    disabled={loginBusy || props.loginHintLoading || !props.loginValues.email.trim()}
                  >
                    {props.loginHintLoading
                      ? t('txt_loading_password_hint')
                      : t('txt_show_password_hint')}
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary full"
                  onClick={() => {
                    props.onSubmitEmailOtpLogin(props.loginValues.email, otpCode, props.loginValues.password);
                  }}
                  disabled={loginBusy || passkeyBusy || !props.loginValues.email.trim() || !otpCode.trim() || !props.loginValues.password}
                >
                  <Mail size={16} className="btn-icon" />
                  {loginBusy ? t('txt_logging_in') : t('txt_email_otp_login_button')}
                </button>
              </div>

              {/* === 3. 傳統密碼登入 (預設折疊，需要才點開) === */}
              <div className="auth-collapse-section">
                <button
                  type="button"
                  className="auth-collapse-toggle"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  aria-expanded={showPasswordForm}
                >
                  <div className="flex items-center gap-2">
                    <Lock size={15} />
                    <span>{t('txt_traditional_password_login')}</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${showPasswordForm ? 'rotate-180' : ''}`}
                  />
                </button>

                {showPasswordForm && (
                  <div className="auth-collapse-content">
                    <label className="field">
                      <span>{t('txt_email')}</span>
                      <input
                        className="input"
                        type={props.relaxedLoginInput ? 'text' : 'email'}
                        value={props.loginValues.email}
                        autoComplete="off"
                        data-1p-ignore="true"
                        data-lpignore="true"
                        data-bwignore="true"
                        data-form-type="other"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        placeholder={props.authPlaceholder}
                        onInput={(e) =>
                          props.onChangeLogin({
                            ...props.loginValues,
                            email: (e.currentTarget as HTMLInputElement).value,
                          })
                        }
                      />
                    </label>
                    <PasswordField
                      label={t('txt_master_password')}
                      value={props.loginValues.password}
                      autoComplete="new-password"
                      placeholder={props.authPlaceholder}
                      onInput={(v) => props.onChangeLogin({ ...props.loginValues, password: v })}
                    />
                    <div className="auth-support-row">
                      <span className="browser-defense-hint">
                        <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                        <span>防瀏覽器儲存隔離</span>
                      </span>
                      <button
                        type="button"
                        className="auth-link-btn"
                        onClick={props.onTogglePasswordHint}
                        disabled={loginBusy || props.loginHintLoading || !props.loginValues.email.trim()}
                      >
                        {props.loginHintLoading
                          ? t('txt_loading_password_hint')
                          : t('txt_show_password_hint')}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary full"
                      onClick={props.onSubmitLogin}
                      disabled={loginBusy || passkeyBusy || !props.loginValues.email.trim() || !props.loginValues.password}
                    >
                      <LogIn size={16} className="btn-icon" />
                      {loginBusy ? t('txt_logging_in') : t('txt_log_in')}
                    </button>
                  </div>
                )}
              </div>

              <div className="or">{t('txt_or')}</div>
              <button
                type="button"
                className="btn btn-secondary full"
                onClick={props.onGotoRegister}
                disabled={loginBusy || passkeyBusy}
              >
                <UserPlus size={16} className="btn-icon" />
                {t('txt_create_account')}
              </button>
            </>
          )}
        </form>
      </StandalonePageFrame>
    </div>
  );
}
