# Changelog

All notable changes to **888warden** (formerly NodeWarden) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
