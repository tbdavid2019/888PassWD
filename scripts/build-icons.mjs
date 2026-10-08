import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 4 Iconic Designs for 888warden
export const DESIGNS = {
  // Option A1: Cyber Security Shield (888 + 秘) - Recommended
  a1: {
    name: 'Cyber Shield (888 + 秘)',
    description: '經典安全防護盾造型，融合科技感 888 與厚重穩定的「秘」字，極致橘色漸層高光。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Shield Gradient: Cloudflare/Modern Cyber Orange -->
    <linearGradient id="shieldGradA1" x1="64" y1="36" x2="448" y2="480" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF7A00" />
      <stop offset="42%" stop-color="#F95700" />
      <stop offset="100%" stop-color="#C23600" />
    </linearGradient>

    <!-- Specular Highlight Curve -->
    <linearGradient id="specularGlowA1" x1="256" y1="46" x2="256" y2="280" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </linearGradient>

    <!-- Edge Luminous Highlight -->
    <linearGradient id="edgeGlowA1" x1="256" y1="48" x2="256" y2="460" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="45%" stop-color="#FED7AA" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#EA580C" stop-opacity="0.1" />
    </linearGradient>

    <!-- Ambient Shadow -->
    <filter id="shieldShadowA1" x="20" y="20" width="472" height="480" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#431407" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#7C2D12" flood-opacity="0.3" />
    </filter>

    <filter id="textGlowA1" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#7C2D12" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Outer Cyber Shield -->
  <path d="M256 46C356 46 436 76 448 106C452 234 420 364 256 466C92 364 60 234 64 106C76 76 156 46 256 46Z"
        fill="url(#shieldGradA1)"
        filter="url(#shieldShadowA1)" />

  <!-- Specular highlight top half -->
  <path d="M256 46C356 46 436 76 448 106C450 170 442 220 420 260C340 240 172 240 92 260C70 220 62 170 64 106C76 76 156 46 256 46Z"
        fill="url(#specularGlowA1)" />

  <!-- Inner Bevel Rim -->
  <path d="M256 62C346 62 420 88 430 116C434 228 404 346 256 440C108 346 78 228 82 116C92 88 166 62 256 62Z"
        stroke="url(#edgeGlowA1)"
        stroke-width="5"
        stroke-linecap="round"
        fill="none" />

  <!-- Horizontal Divider / Security Seam -->
  <path d="M140 246C180 252 332 252 372 246" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" />
  <circle cx="256" cy="248" r="5" fill="#FFFFFF" />
  <circle cx="232" cy="248" r="2.5" fill="#FFEAD5" opacity="0.8" />
  <circle cx="280" cy="248" r="2.5" fill="#FFEAD5" opacity="0.8" />

  <!-- "888" Text -->
  <text x="256" y="202"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="128"
        letter-spacing="3"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#textGlowA1)">888</text>

  <!-- "秘" Text -->
  <text x="256" y="380"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
        font-weight="900"
        font-size="142"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#textGlowA1)">秘</text>
</svg>`
  },

  // Option A2: Squircle App Tile (888 + 秘)
  a2: {
    name: 'Squircle App Tile (888 + 秘)',
    description: '專為 iOS / macOS App 和 PWA 主畫面打造的圓角方塊圖示。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="radialTileA2" cx="50%" cy="18%" r="85%">
      <stop offset="0%" stop-color="#FF8A00" />
      <stop offset="45%" stop-color="#F95700" />
      <stop offset="100%" stop-color="#BA2D00" />
    </radialGradient>
    <linearGradient id="tileBorderA2" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5" />
      <stop offset="50%" stop-color="#FED7AA" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.3" />
    </linearGradient>
    <filter id="tileShadowA2" x="12" y="12" width="488" height="494" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#431407" flood-opacity="0.4" />
    </filter>
    <filter id="textGlowTileA2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#601A03" flood-opacity="0.4" />
    </filter>
  </defs>

  <rect x="20" y="20" width="472" height="472" rx="112" fill="url(#radialTileA2)" filter="url(#tileShadowA2)" />
  <rect x="20" y="20" width="472" height="472" rx="112" stroke="url(#tileBorderA2)" stroke-width="4" />

  <rect x="42" y="42" width="428" height="428" rx="90" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.5" stroke-dasharray="10 6" />

  <line x1="130" y1="244" x2="382" y2="244" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="2" stroke-linecap="round" />
  <circle cx="256" cy="244" r="5" fill="#FFFFFF" />

  <text x="256" y="200"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="134"
        letter-spacing="4"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#textGlowTileA2)">888</text>

  <text x="256" y="386"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
        font-weight="900"
        font-size="148"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#textGlowTileA2)">秘</text>
</svg>`
  },

  // Option B1: The Classic ㊙️ Seal Crest (Circular Vault Badge)
  b1: {
    name: 'Circular ㊙️ Seal Crest',
    description: '經典「㊙️」圓形鋼印金庫意象，帶有同心圓防偽刻度與頂部 888 皇冠鐫刻。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sealRadialB1" cx="50%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#FF7F0A" />
      <stop offset="50%" stop-color="#F95200" />
      <stop offset="100%" stop-color="#B82700" />
    </radialGradient>
    <linearGradient id="sealRingGlowB1" x1="100" y1="80" x2="412" y2="432" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="50%" stop-color="#FFF2E8" />
      <stop offset="100%" stop-color="#FED7AA" />
    </linearGradient>
    <filter id="sealShadowB1" x="14" y="14" width="484" height="490" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#431407" flood-opacity="0.42" />
    </filter>
    <filter id="sealInnerShadowB1" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#551703" flood-opacity="0.45" />
    </filter>
  </defs>

  <circle cx="256" cy="256" r="232" fill="url(#sealRadialB1)" filter="url(#sealShadowB1)" />
  <circle cx="256" cy="256" r="230" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="3" />
  <circle cx="256" cy="256" r="212" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="2" stroke-dasharray="6 8" />

  <circle cx="256" cy="256" r="176" stroke="url(#sealRingGlowB1)" stroke-width="20" fill="none" filter="url(#sealInnerShadowB1)" />

  <text x="256" y="326"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
        font-weight="900"
        font-size="192"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#sealInnerShadowB1)">秘</text>

  <text x="256" y="66"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="34"
        letter-spacing="5"
        fill="#FFFFFF"
        opacity="0.9"
        text-anchor="middle">888</text>
</svg>`
  },

  // Option B2: Shield with 888 + Circular ㊙️ Vault Core
  b2: {
    name: 'Shield + ㊙️ Vault Core (雙合一盾牌)',
    description: '盾牌上排 888，下方鑲嵌圓形「㊙️」保險箱密碼轉盤。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shieldGradB2" x1="64" y1="36" x2="448" y2="480" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FF7A00" />
      <stop offset="42%" stop-color="#F95700" />
      <stop offset="100%" stop-color="#C23600" />
    </linearGradient>
    <linearGradient id="edgeGlowB2" x1="256" y1="48" x2="256" y2="460" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="45%" stop-color="#FED7AA" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#EA580C" stop-opacity="0.1" />
    </linearGradient>
    <filter id="shadowB2" x="20" y="20" width="472" height="480" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#431407" flood-opacity="0.45" />
    </filter>
    <filter id="coreShadowB2" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#551703" flood-opacity="0.45" />
    </filter>
  </defs>

  <path d="M256 46C356 46 436 76 448 106C452 234 420 364 256 466C92 364 60 234 64 106C76 76 156 46 256 46Z"
        fill="url(#shieldGradB2)"
        filter="url(#shadowB2)" />

  <path d="M256 62C346 62 420 88 430 116C434 228 404 346 256 440C108 346 78 228 82 116C92 88 166 62 256 62Z"
        stroke="url(#edgeGlowB2)"
        stroke-width="5"
        stroke-linecap="round"
        fill="none" />

  <text x="256" y="175"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="112"
        letter-spacing="3"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#coreShadowB2)">888</text>

  <g transform="translate(256, 316)" filter="url(#coreShadowB2)">
    <circle cx="0" cy="0" r="108" fill="#D63A00" fill-opacity="0.45" />
    <circle cx="0" cy="0" r="108" stroke="#FFFFFF" stroke-width="12" fill="none" />
    <circle cx="0" cy="0" r="92" stroke="#FED7AA" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="6 6" />

    <text x="0" y="46"
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
          font-weight="900"
          font-size="124"
          fill="#FFFFFF"
          text-anchor="middle">秘</text>
  </g>
</svg>`
  }
};

export function applyIcon(choiceKey = 'a1') {
  const chosen = DESIGNS[choiceKey];
  if (!chosen) {
    throw new Error(`Unknown design option "${choiceKey}". Available: ${Object.keys(DESIGNS).join(', ')}`);
  }

  console.log(`[build-icons] Applying design: ${chosen.name} (${choiceKey})...`);

  // 1. Write master SVG to temp
  const tmpSvg = '/tmp/chosen-icon.svg';
  fs.writeFileSync(tmpSvg, chosen.svg.trim());

  // 2. Render master PNG (512x512)
  console.log('[build-icons] Rendering vector SVG to 512x512 master PNG via qlmanage...');
  execSync(`qlmanage -t -s 512 -o /tmp ${tmpSvg}`, { stdio: 'pipe' });
  const masterPng = '/tmp/chosen-icon.svg.png';

  // 3. Target paths
  const svgTargets = [
    path.join(rootDir, 'NodeWarden.svg'),
    path.join(rootDir, 'webapp/public/nodewarden-logo.svg'),
    path.join(rootDir, 'webapp/public/nodewarden-logo-bg.svg'),
    path.join(rootDir, 'webapp/public/icon-source.svg')
  ];

  for (const svgTarget of svgTargets) {
    fs.writeFileSync(svgTarget, chosen.svg.trim());
    console.log(`[build-icons] Updated SVG: ${path.relative(rootDir, svgTarget)}`);
  }

  // 4. Update NodeWarden.png (512x512)
  fs.copyFileSync(masterPng, path.join(rootDir, 'NodeWarden.png'));
  console.log('[build-icons] Updated root NodeWarden.png');

  // 5. Generate scaled PNGs for webapp/public/
  const sizes = [
    { file: 'icon-512.png', size: 512 },
    { file: 'icon-192.png', size: 192 },
    { file: 'apple-touch-icon.png', size: 180 },
    { file: 'logo-64.png', size: 64 },
    { file: 'favicon-32.png', size: 32 }
  ];

  for (const item of sizes) {
    const targetPng = path.join(rootDir, 'webapp/public', item.file);
    execSync(`sips -z ${item.size} ${item.size} ${masterPng} --out ${targetPng}`, { stdio: 'pipe' });
    console.log(`[build-icons] Generated ${item.file} (${item.size}x${item.size})`);
  }

  // 6. Generate favicon.ico via ffmpeg
  const icoTarget = path.join(rootDir, 'webapp/public/favicon.ico');
  const fav32 = path.join(rootDir, 'webapp/public/favicon-32.png');
  execSync(`ffmpeg -y -i ${fav32} -s 32x32 ${icoTarget}`, { stdio: 'pipe' });
  console.log('[build-icons] Generated favicon.ico (32x32 ICO)');

  // 7. Update dist/ assets if dist/ exists
  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    for (const svgTarget of ['nodewarden-logo.svg', 'nodewarden-logo-bg.svg', 'icon-source.svg']) {
      fs.writeFileSync(path.join(distDir, svgTarget), chosen.svg.trim());
    }
    for (const item of sizes) {
      fs.copyFileSync(path.join(rootDir, 'webapp/public', item.file), path.join(distDir, item.file));
    }
    fs.copyFileSync(icoTarget, path.join(distDir, 'favicon.ico'));
    console.log('[build-icons] Synchronized dist/ assets');
  }

  console.log(`[build-icons] Successfully rebuilt all icon assets with design [${choiceKey}]!`);
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith('build-icons.mjs')) {
  const chosenKey = process.argv[2] || 'a1';
  applyIcon(chosenKey);
}
