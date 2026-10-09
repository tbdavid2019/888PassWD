export function registerNodeWardenServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  const register = () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((reg) => {
      void reg.update();
    }).catch(() => {
      // PWA support is progressive enhancement; the vault still works without it.
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  };

  if (document.readyState === 'complete') {
    register();
    return;
  }

  window.addEventListener('load', register, { once: true });
}
