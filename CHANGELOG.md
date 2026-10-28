# Changelog

All notable changes to **888warden** (formerly NodeWarden) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- Remove the TypeSafe API key from tracked Wrangler configuration and the decision service default. Configure `TYPESAFE_API_KEY` as a Cloudflare Worker secret to enable that provider fallback.
- Keep password-security assessment results in memory and clear the older browser-local cache. Profile snapshots no longer persist the master-password hint.
- Pin deployment actions, scope workflow token permissions, add Dependabot cooldowns, and update vulnerable npm packages.

## [v2026.10.22] - 2026-10-22

### Changed
- **2md.aiurl.tw 潘通標準配色全面升級 (Pantone Standard Color Palette Upgrade)**:
  - 配色全面升級為 2md.aiurl.tw 潘通標準：Pantone 14-1064 TPG Saffron (藏紅花黃 `#ffb010`)、Pantone 19-4024 TCX Dress Blues (夜幕深藍 `#17324d`)、Pantone 18-1442 TCX Clay (赤陶/陶土褐 `#a9471d`)、Pantone 11-0104 TCX Cream (暖奶油 `#fff9e8`)、Pantone 19-0303 TCX Jet Black / Deep Ink (沉木焦墨 `#2b251a`) 與畫布暖色 (`#faf6ee` / `#fff0cc`)。
  - **嚴格落實 WCAG AA / AAA 無障礙可讀性標準**：
    - 主按鈕（`.btn-primary`、`.auth-card .btn-primary`、`.btn-passkey-primary`）全面強制使用沉木焦墨（`#2b251a`）文字，對比度高達 8.30:1（超越 WCAG AAA 7.0:1 標準），徹底移除白字（1.83:1 嚴重不及格）之反模式。
    - 主文字（`#2b251a`）在暖奶油背景對比度達 14.45:1（WCAG AAA）。
    - 夜幕深藍（`#17324d`）在淺色背景對比度達 12.48:1（WCAG AAA）。
    - 次要文字（`#655a43`）在淺色背景對比度達 6.45:1（WCAG AA >= 4.5:1）。
    - 赤陶色（`#a9471d`）在淺色背景對比度達 5.54:1（WCAG AA >= 4.5:1）。
  - **深色模式（Dark Mode）全面達標 WCAG AAA**：
    - 深夜幕藍底色（`#0b131d`）與深藍面板（`#132030`）。
    - 暖奶油主文字色（`#fff9e8`）在深底對比度達 15.64:1（WCAG AAA）。
    - 暖米灰次要文字色（`#b5a990`）對比度達 7.08:1（WCAG AAA）。
    - 藏紅花黃主色（`#ffb010`）對比度達 8.98:1（WCAG AAA）。
  - **新增自動化 WCAG 對比度單元測試**：
    - 建立 `scripts/wcag-contrast.test.ts` 與 `npm run test:wcag` 指令，將無障礙色彩對比度納入自動化測試保護。

## [v2026.10.15] - 2026-10-15

### Added
- **Clef-Flash / Jev 邊緣決策推論引擎整合 (Edge Decision Intelligence)**:
  - 整合自建極速 Clef-Flash（<200ms 推論）、Clef-Flash-Q4 與 TypeSafe Jev 官方服務，打造高可用邊緣決策中樞。
  - **4 階彈性降級架構 (Multi-Tier Resilient Fallback)**：
    1. Primary: `https://clef.create360.ai/v1/systemone`
    2. Fallback 2: `https://clef.aiurl.tw/v1/systemone`
    3. Fallback 3: `https://api.typesafe.ai/v1/systemone` (支援 `TYPESAFE_API_KEY`)
    4. Tier 4: 本機確定性啟發式規則引擎（Fail-Open Graceful Degradation），即使外部所有 AI 端點斷線，全系統與密碼庫日常操作依然 100% 正常順暢運作。
- **密碼安全智慧分級與治理 (Vault Security Triage)**:
  - 自動偵測公網外洩密碼與內部弱密碼，並提供清晰風險優先級：
    - `🚨 P0 緊急`：公網關鍵資產密碼已外洩，面臨撞庫攻擊急迫風險。
    - `⚠️ P1 高危`：特權管理帳號 (admin/root) 存在複用或弱密碼。
    - `🛡️ P2 建議`：內部設備密碼複用或複雜度不足。
    - `P3 良好`：無已知安全風險。
  - **持久化評估快取 (Persistent Assessment Cache)**：
    - 導入 `nodewarden_security_assessment_v1` 本機快取機制，掃描 2,500+ 筆密碼後切換分頁無須重複運算，秒開即現。
  - **風險項目一鍵刪除 (Quick Remediation Deletion)**：
    - 安全檢查清單提供直接「🗑️ 刪除」動作與確認彈窗，支援歷史冗餘項目即時清理並自動同步快取。
- **AI 網站智慧分類建議 (Smart Website Categorization)**:
  - 依據網域、內外網架構（`10.x.x.x`、`192.168.x.x`、私有 IP、DNS 服務）與業務性質（金融/銀行、雲端/開發、辦公、電商、社群等），全自動建議分類。
  - **智慧資料夾配對與一鍵歸納**：
    - 自動對應現有資料夾（如「區網10」、「區網192」、「金融與銀行」、「雲端與開發」）。
    - 支援一鍵全選、批次新建目標資料夾與批次搬移。
  - **自動化標籤建議**：智慧產出 `#內網`、`#10網段`、`#銀行帳戶`、`#開發工具`、`#2FA` 等實用標籤。
- **主密碼庫即時安全徽章與側邊欄風險計數**:
  - 在主密碼庫卡片上直接渲染 `🚨 P0`、`⚠️ P1`、`🛡️ P2` 安全徽章。
  - 側邊欄「🛡️ 密碼安全」即時顯示全庫未處理之安全風險項目數量。

### Security
- **絕對零知識架構落實 (Zero-Knowledge Privacy Enforcement)**:
  - 徹底移除重複項目分析及外部決策請求中的備忘（`notes`）欄位，使用者私人備忘錄絕不離開瀏覽器。
  - 外部 AI 決策提示詞全面針對使用者帳號（`username`）進行身分角色遮罩（僅傳送特權帳號標記，不傳輸真實信箱與帳號）。
  - 明文密碼 100% 保持在客戶端瀏覽器本機記憶體，絕不上傳任何後端或 AI 端點。
- **模型防幻覺與本機規則雙重防禦 (Anti-Hallucination & Fallback Guard)**:
  - 加入強制性安全規則：凡已有確認洩漏記錄（`exposedCount > 0`）之公網憑證，強制鎖定為最高等級 P0，阻斷遠端模型低估或幻覺。
  - 修正本機降級時假答案污染問題，確保全斷線情境下本機正則規則獨立精準運作。

### Performance
- **大規模密碼庫效能優化 (Large Vault Scale Optimization)**:
  - 將智慧分類彈窗渲染循環之 $O(N^2)$ `.find` 搜尋全面改寫為記憶體 Map $O(1)$ 查找，流暢支援數千筆項目。

---

## [v2026.10.14] - 2026-10-14

### Added
- **登入頁與獨立頁面語言切換器 (Standalone Language Picker)**:
  - 在登入、註冊、解鎖與獨立頁面右上角新增浮動多國語言切換器（`StandaloneLanguagePicker`），支援繁體中文、簡體中文、英文等 10 種語言 1 秒即時切換。
- **通行密鑰（Passkey / WebAuthn）置頂優先快捷登入 (Passwordless First)**:
  - 登入頁與密碼庫解鎖頁將「使用通行密鑰登入 (Passkey)」提升為頂部首選 Hero 操作卡片，標註 Touch ID / Face ID / 實體安全金鑰免密快速登入。
  - 支援 WebAuthn 一鍵秒登入，徹底擺脫傳統密碼管理器繁瑣的輸入流程與記密碼負擔。

### Changed
- **介面視覺風格全站深度統一與中文字體工藝底線 (Craft Floor)**:
  - 嚴格落實中文字型最低字級規範（全面淘汰 11px~12px 微型字），副標題提升至 14px、欄位標籤 15px、按鈕與主標題 16px~17px，確保繁體中文字體筆畫清晰大氣。
  - 重構 Passkey Hero 卡片排版，標題與推薦標籤並列、副標題全寬平鋪，徹底消除中文字句折行斷截問題。
  - 統一介面視覺色調為 **888 PassWD** 專屬 Cyber Orange 與黑曜石深冷極簡美學，移除雜亂桃粉底色，主登入按鈕全數對齊 Cyber Orange 質感漸層。
- **全面升級品牌識別名稱為 888 PassWD**:
  - 將未登入頁（Standalone Frame）、已登入頂欄（Topbar）、404 頁面、PWA 清單（manifest）與通知信發送主體統一升級為 **888 PassWD**。
  - 優化品牌標題字距與排版（`888` 橘色與 `PassWD` 之間設定舒適間隔），確保在淺色與深色模式下均具備清晰辨識度與頂級工藝質感。
  - 將頁尾版本連結由原本不存在且 404 的 GitHub Releases（因尚未設定自動化 Releases 機制）修復並直連至官方程式庫之 `CHANGELOG.md`，提供完整清晰之更新履歷。

### Security
- **零知識表單防禦隔離（阻斷瀏覽器儲存主密碼提示）**:
  - 在登入、解鎖與註冊表單全面導入防瀏覽器嗅探屬性（`data-1p-ignore`, `data-lpignore`, `data-bwignore`, `data-form-type="other"` 及 `autoComplete="new-password"`）。
  - 徹底解決 Chrome、Safari、Edge 等瀏覽器在輸入主密碼時頻繁彈出「是否儲存此密碼」的干擾與資安隱患。

## [v2026.10.09] - 2026-10-09

### Added
- **密碼庫 Shift + 左鍵 連續選取與矩形框選 (Shift + Click & Marquee Selection)**:
  - 支援在密碼庫清單中按住 `Shift` 點選勾選框或項目卡片，自動連續選取與上次選取錨點之間的所有密碼庫項目（Range Selection）。
  - 支援按住 `Shift` 搭配滑鼠左鍵拖曳畫框，產生專屬 Cyber Orange 科技感半透明框選矩形（Marquee Selection），即時圈選框內接觸到的所有密碼項目。

### Changed
- **全面升級極簡素色 Cyber Orange 品牌圖示 (888 / PassWD)**:
  - 捨棄任何複雜盾牌、鑰匙與剪貼畫元素，全面回歸純粹極簡設計美學。
  - 採用純素色 Cyber Orange 圓角磚（`#F95700`），文字純淨白底高對比置中排列（第一行 `888`，第二行 `PassWD`）。
  - 完整重構 `scripts/build-icons.mjs` 並自動化重新產生高精度 512px、192px、180px、64px、32px 及 `favicon.ico` 圖示，確保各種縮圖與視角皆清晰無白底。
- **全面改用日期版本號 (CalVer: `v2026.10.09`) 徹底對齊前後端與中繼資料**:
  - 將專案版本號全面改用日期命名法（CalVer: `2026.10.09`），徹底解決前端登入頁與側邊欄顯示（原殘留 `1.8.1`）與 `package.json`（原 `1.9.2`）版本不對應的問題。
  - 同步更新 `package.json`、`package-lock.json`、`shared/app-version.ts` 及備份封存中繼資料。
  - 在 Web Vault 側邊欄底部新增版本標籤連結（`side-footer`），登入與未登入狀態皆可明確檢視當前版本。
- **全站字型升級 JetBrains Mono 與 Google Fonts Noto Sans TC**:
  - 英文、數字、程式碼、密碼強度與認證指紋全面採用 JetBrains Mono。
  - 中文對應 Google Fonts Noto Sans TC，兼顧極客程式碼美感與繁體中文可讀性。
  - 調整 CSP 安全策略與 Tailwind / Design Tokens，支援 PWA 自動升級與字型預載。
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
