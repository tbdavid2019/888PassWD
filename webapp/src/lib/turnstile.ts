const TURNSTILE_COOKIE_NAME = 'nw_turnstile_cleared';

let globalWidgetId: string | null = null;
let currentToken: string | null = null;
let pendingResolver: ((token: string) => void) | null = null;

export function hasTurnstileClearance(): boolean {
  try {
    if (sessionStorage.getItem(TURNSTILE_COOKIE_NAME) === '1') return true;
    const cookies = document.cookie ? document.cookie.split(';') : [];
    return cookies.some(c => c.trim().startsWith(`${TURNSTILE_COOKIE_NAME}=`));
  } catch {
    return false;
  }
}

export function markTurnstileClearance(): void {
  try {
    sessionStorage.setItem(TURNSTILE_COOKIE_NAME, '1');
  } catch {}
}

function getGlobalTurnstileContainer(): HTMLElement {
  let container = document.getElementById('cf-turnstile-global');
  if (!container) {
    container = document.createElement('div');
    container.id = 'cf-turnstile-global';
    container.style.cssText = 'display:none;position:fixed;bottom:16px;right:16px;z-index:99999;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);';
    document.body.append(container);
  }
  return container;
}

export function acquireTurnstileToken(siteKey?: string): Promise<string> {
  if (hasTurnstileClearance()) {
    return Promise.resolve('');
  }

  const effectiveSiteKey = siteKey || (window as any).__NW_BOOT__?.turnstileSiteKey;
  if (!effectiveSiteKey) {
    return Promise.resolve('');
  }

  const container = getGlobalTurnstileContainer();

  return new Promise((resolve) => {
    pendingResolver = resolve;

    const checkReady = () => {
      const turnstile = (window as any).turnstile;
      if (!turnstile) {
        setTimeout(checkReady, 50);
        return;
      }

      container.style.display = 'block';

      if (globalWidgetId !== null) {
        try {
          turnstile.reset(globalWidgetId);
        } catch {
          globalWidgetId = null;
        }
      }

      if (globalWidgetId === null) {
        try {
          globalWidgetId = turnstile.render(container, {
            sitekey: effectiveSiteKey,
            size: 'flexible',
            theme: 'auto',
            callback(token: string) {
              currentToken = token;
              container.style.display = 'none';
              markTurnstileClearance();
              if (pendingResolver) {
                const cb = pendingResolver;
                pendingResolver = null;
                cb(token);
              }
            },
            'expired-callback'() {
              currentToken = null;
            },
            'error-callback'() {
              container.style.display = 'none';
              if (pendingResolver) {
                const cb = pendingResolver;
                pendingResolver = null;
                cb('');
              }
            },
          });
        } catch {
          container.style.display = 'none';
          if (pendingResolver) {
            const cb = pendingResolver;
            pendingResolver = null;
            cb('');
          }
        }
      }
    };

    checkReady();
  });
}
