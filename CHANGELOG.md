# Changelog

All notable changes to **888warden** (formerly NodeWarden) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2026.10.09] - 2026-10-09

### Added
- **密碼庫 Shift + 左鍵 連續選取與矩形框選 (Shift + Click & Marquee Selection)**:
  - 支援在密碼庫清單中按住 `Shift` 點選勾選框或項目卡片，自動連續選取與上次選取錨點之間的所有密碼庫項目（Range Selection）。
  - 支援按住 `Shift` 搭配滑鼠左鍵拖曳畫框，產生專屬 Cyber Orange 科技感半透明框選矩形（Marquee Selection），即時圈選框內接觸到的所有密碼項目。

### Changed
- **全面改用日期版本號 (CalVer: `v2026.10.09`) 徹底對齊前後端與中繼資料**:
  - 將專案版本號全面改用日期命名法（CalVer: `2026.10.09`），徹底解決前端登入頁與側邊欄顯示（原殘留 `1.8.1`）與 `package.json`（原 `1.9.2`）版本不對應的問題。
  - 同步更新 `package.json`、`package-lock.json`、`shared/app-version.ts` 及備份封存中繼資料。
  - 在 Web Vault 側邊欄底部新增版本標籤連結（`side-footer`），登入與未登入狀態皆可明確檢視當前版本。
- **全面升級開源頂級圖示庫向量 (Remix / Lucide / Tabler / Heroicons / Phosphor / Iconoir / Eva)**:
  - 捨棄任何粗糙手繪與文字拼貼，全面引進世界級開源 UI 圖示庫之標準向量圖形：
    - **預設方案 (Remix)**：採用 **Remix Icon** 經典極客密鑰盾牌 (`shield-keyhole-fill`)，結合 Cyber Orange 能量漸層與雙重光暈。
    - **備選方案**：支援 **Lucide** 密碼守護盾 (`shield-ellipsis`)、**Tabler** 密碼金庫鎖 (`lock-password`)、**Heroicons** 萬能主密鑰 (`key`)、**Phosphor** 安全認證盾 (`shield-check`)、**Iconoir** 與 **Eva Icons**。
  - **深色黑曜石圓角方塊邏輯背景 (Obsidian Squircle Tile)**：
    - 底層採用 `#1E293B` ➔ `#0F172A` ➔ `#040711` 高科技深邃黑曜石漸層，搭配精細內外雙邊框與橙色環境背光。
    - 徹底根絕 QuickLook / 系統縮圖預設白底問題，確保圖示外部四角為 100% 透明通道。
  - **升級 `scripts/build-icons.mjs` 自動化建置管線**：
    - 採用 Chrome Headless 引擎進行透明通道高精度點陣渲染，完整更新 `NodeWarden.png`、`NodeWarden.svg`、`apple-touch-icon.png`、`icon-512.png`、`icon-192.png`、`logo-64.png`、`favicon-32.png`、`favicon.ico` 等全部尺寸資產。
    - 更新 `webapp/public/manifest.webmanifest` 之 `background_color` 為 `#0f172a`。

### Infrastructure
- **Git 遠端倉庫設定與追蹤**:
  - 將本地倉庫與 `https://github.com/tbdavid2019/nodewarden.git` 連結，以遠端 `origin/main` 為主進行同步與分支追蹤。

---

## [v1.9.1] - 2026-10-08

### Added
- **Automated Brand Icon Build Pipeline (`npm run icons:build`)**:
  - Added `scripts/build-icons.mjs` script to automatically compile and distribute high-resolution vector and raster assets across root, webapp, and distribution bundles.
  - Generates SVG vectors, 512x512 master PNG, 192x192 PWA icon, 180x180 Apple touch icon, 64x64 logo, 32x32 favicon PNG, and multi-resolution `favicon.ico`.
  - Built-in support for 4 design variants (`a1` Cyber Shield, `a2` Squircle, `b1` Circular ㊙️ Seal, `b2` Dual-Core Shield).

### Changed
- **New Cyber Orange Brand Icon & Identity Overhaul (888 + 秘)**:
  - Rebuilt brand icon with vibrant Cyber Orange base (`#FF7A00` ➔ `#F95700` ➔ `#C23600`), specular highlight curve, and luminous bevel rim.
  - Centered high-contrast typography featuring modern cryptographic `888` and authoritative, balanced `秘` (Vault Secret) glyph.
  - Harmonized Web Vault header typography and logo drop shadow in `webapp/src/styles/shell.css` to match the radiant amber-orange palette.
  - Cleaned up gradient text slop in navigation shell per Impeccable craft guidelines for superior contrast and readability.

---

## [v1.9.0] - 2026-10-06

### Added
- **Resend Email 2FA (OTP) Verification (Provider 1)**:
  - Integrated Resend API for sending 6-digit one-time password (OTP) verification codes directly to user emails.
  - Added secure challenge storage with SHA-256 challenge hashing, 10-minute validity window, 5-attempt brute-force protection, and single-use replay prevention.
  - Implemented standard Bitwarden Email 2FA API endpoints (`/api/two-factor/get-email`, `/api/two-factor/send-email`, `/api/two-factor/email`, `/identity/accounts/prelogin`, and two-factor token challenge in `/identity/connect/token`).
  - Added Email 2FA management UI in Web Vault Settings with "Send verification code", 6-digit OTP input, and enable/disable workflows.
  - Full compatibility with official Bitwarden desktop, mobile, and browser extension clients.
  - Configurable via `RESEND_API_KEY` (secret) and `RESEND_FROM` (variable or secret).
- **Taiwan Traditional Chinese (zh-TW) Localization**:
  - Added complete Traditional Chinese (zh-TW) localization with 1,540 translated keys matching Taiwan standard terminology (帳號、兩步驟驗證、通行金鑰、伺服器、註冊、管理員等).
  - Added `README_ZH_TW.md` documentation guide for Traditional Chinese users.

### Changed
- **888warden Rebranding & Modern Cyber Shield Visual Identity**:
  - Rebranded application interface and assets from NodeWarden to **888warden**.
  - Replaced legacy generic key logo with modern Cyber Shield SVG brand icon featuring emerald security accents and dual-tone gradients.
  - Upgraded email notification templates with 888warden branding and responsive security styling.
- **Repository Independence & Upstream Acknowledgement**:
  - Severed upstream tracking links to maintain independent repository lifecycle (`tbdavid2019/nodewarden`).
  - Sincere acknowledgement and attribution to original author (`shuaiplus`) included across documentation.

### Improved
- **Passkey and FIDO2 Authentication Diagnostics**:
  - Clarified distinction between WebAuthn Two-Step Login (`purpose = 'twoFactor'`) requiring master password entry and Account Passkey (`purpose = 'login'` with PRF direct vault unlock).
  - Enhanced error messaging and diagnostics for two-step login providers.

---

## [v1.8.1] - 2026-10-06

### Added
- **More local generation tools.** The generator now creates numeric PINs, memorable usernames, email aliases, and Ed25519 or RSA SSH key pairs alongside passwords and passphrases. Passwords support minimum counts for each character type and an option to avoid ambiguous characters, while passphrases and usernames can use custom word lists. SSH keys are generated on the device and are not retained by NodeWarden.

### Improved
- **Current Bitwarden client compatibility.** Configuration, prelogin, and account-key responses now include fields expected by Bitwarden 2026.7 clients while retaining older response formats. Supported desktop clients also show the official settings dialog with browser integration controls.
- **Stronger account authentication with automatic migration.** New registrations and password changes use randomly salted server-side password verifiers, and existing accounts upgrade after a successful password login and any required two-factor verification.
- **Clearer deployment and build guidance.** Builds declare support for Node.js 22.19+ within the 22.x series or Node.js 24.11+, with `.node-version` selecting 24.18.0.

### Fixed
- **Vault edits preserve fields and detect conflicting saves.** Web edits retain linked custom-field metadata and unrecognized encrypted properties. Outdated and concurrent saves are rejected instead of overwriting newer changes.
- **Cleared notes stay cleared.** Full item updates treat omitted notes and custom fields as cleared values.
- **WebAuthn verification in official clients.** Desktop, browser-extension, and mobile connectors follow Bitwarden's request and response formats. Exact connector URLs are preserved in Worker deployments.
- **Visible controls and values in narrow panels.** Improved layout wrapping and theme consistency across responsive viewports.
