import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Designs for 888warden
export const DESIGNS = {
  // Option 1: Lucide Cyber Orange (Default & User Preferred)
  // Vibrant Cyber Orange tile + Lucide Shield + Bold "888" & "PassWD"
  lucide_orange: {
    name: 'Lucide Cyber Orange - 888 PassWD (鮮豔橙色盾牌款)',
    library: 'Lucide Icons (lucide.dev)',
    description: '100% 全亮鮮豔 Cyber Orange 科技圓角磚，搭配官方 Lucide 防護盾，頂部鐫刻 888，下方 PassWD，杜絕任何白底。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- 100% Full Vibrant Cyber Orange Squircle Tile -->
    <radialGradient id="fullOrangeBg" cx="50%" cy="15%" r="85%">
      <stop offset="0%" stop-color="#FFA028" />
      <stop offset="40%" stop-color="#F95700" />
      <stop offset="100%" stop-color="#BD2600" />
    </radialGradient>

    <!-- Inset Rim Lighting -->
    <linearGradient id="orangeTileRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6" />
      <stop offset="40%" stop-color="#FED7AA" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.25" />
    </linearGradient>

    <!-- Lucide Shield White Gloss Gradient -->
    <linearGradient id="shieldWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#FFF0E5" />
    </linearGradient>

    <!-- Drop Shadow for Lucide Elements -->
    <filter id="tileGlowShadow" x="10" y="10" width="492" height="492" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="#431407" flood-opacity="0.45" />
    </filter>

    <filter id="shieldElementsShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#601802" flood-opacity="0.55" />
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3" />
    </filter>
  </defs>

  <!-- Base: Saturated Vibrant Cyber Orange Squircle Tile -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#fullOrangeBg)" filter="url(#tileGlowShadow)" />
  <rect x="18" y="18" width="476" height="476" rx="110" stroke="url(#orangeTileRim)" stroke-width="2.5" />
  <rect x="36" y="36" width="440" height="440" rx="92" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="1.5" stroke-dasharray="8 6" />

  <!-- Lucide Shield Outline in Crisp White Glassmorphism -->
  <g transform="translate(256, 252) scale(18) translate(-12, -12)" filter="url(#shieldElementsShadow)">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          stroke="url(#shieldWhiteGrad)"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="#FFFFFF"
          fill-opacity="0.12" />
  </g>

  <!-- Lucide Technical Divider Line with Pin Dots -->
  <line x1="168" y1="238" x2="344" y2="238" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="2.5" stroke-linecap="round" />
  <circle cx="256" cy="238" r="5" fill="#FFFFFF" />
  <circle cx="228" cy="238" r="2.5" fill="#FFFFFF" opacity="0.75" />
  <circle cx="284" cy="238" r="2.5" fill="#FFFFFF" opacity="0.75" />

  <!-- "888" Text (Pure White, Lucide Aesthetic) -->
  <text x="256" y="196"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="108"
        letter-spacing="3"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#shieldElementsShadow)">888</text>

  <!-- "PassWD" Text (Pure White, Lucide Aesthetic) -->
  <text x="256" y="324"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="62"
        letter-spacing="2.5"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#shieldElementsShadow)">PassWD</text>
</svg>`
  },

  // Option 2: Lucide Shield on Dark Obsidian Tile
  lucide_dark_tile: {
    name: 'Lucide Shield on Dark Obsidian Tile (黑曜石底橙色盾款)',
    library: 'Lucide Icons (lucide.dev)',
    description: '深色黑曜石科技圓角磚，內部鑲嵌鮮豔橙色 Lucide 盾牌，帶 888 與 PassWD。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fsDarkBg" cx="50%" cy="15%" r="85%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#040711" />
    </radialGradient>
    <linearGradient id="fsOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B00" />
      <stop offset="45%" stop-color="#F25100" />
      <stop offset="100%" stop-color="#C72C00" />
    </linearGradient>
    <linearGradient id="fsBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#FED7AA" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#EA580C" stop-opacity="0.2" />
    </linearGradient>
    <filter id="fsOrangeGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#FF5500" flood-opacity="0.55" />
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.85" />
    </filter>
    <filter id="fsTextShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#551500" flood-opacity="0.75" />
    </filter>
  </defs>

  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#fsDarkBg)" stroke="#334155" stroke-width="2" />
  <rect x="18" y="18" width="476" height="476" rx="110" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="1" />
  <circle cx="256" cy="245" r="165" fill="#FF5500" fill-opacity="0.22" filter="blur(32px)" />

  <g transform="translate(256, 250) scale(19, 19.5) translate(-12, -12)" filter="url(#fsOrangeGlow)">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"
          fill="url(#fsOrangeGrad)"
          stroke="url(#fsBorderGrad)"
          stroke-width="0.75"
          stroke-linecap="round"
          stroke-linejoin="round" />
  </g>

  <line x1="168" y1="236" x2="344" y2="236" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="2.5" stroke-linecap="round" />
  <circle cx="256" cy="236" r="5" fill="#FFFFFF" />
  <circle cx="228" cy="236" r="2.5" fill="#FFEAD5" opacity="0.85" />
  <circle cx="284" cy="236" r="2.5" fill="#FFEAD5" opacity="0.85" />

  <text x="256" y="196"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="100"
        letter-spacing="3"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#fsTextShadow)">888</text>

  <text x="256" y="324"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="60"
        letter-spacing="2"
        fill="#FFFFFF"
        text-anchor="middle"
        filter="url(#fsTextShadow)">PassWD</text>
</svg>`
  },

  // Option 3: Remix Icon Shield Keyhole
  remix: {
    name: 'Remix Icon - Shield Keyhole',
    library: 'Remix Icon (remixicon.com)',
    description: '開源 Remix Icon 密鑰盾牌。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="remixBg" cx="50%" cy="15%" r="85%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#040711" />
    </radialGradient>
    <linearGradient id="remixGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA028" />
      <stop offset="40%" stop-color="#F95700" />
      <stop offset="100%" stop-color="#BD2B00" />
    </linearGradient>
    <filter id="remixGlow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#F95700" flood-opacity="0.45" />
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.85" />
    </filter>
  </defs>

  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#remixBg)" stroke="#334155" stroke-width="2" />
  <rect x="18" y="18" width="476" height="476" rx="110" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="1" />
  <circle cx="256" cy="240" r="160" fill="#F95700" fill-opacity="0.15" filter="blur(28px)" />

  <g transform="translate(256, 252) scale(15.5) translate(-12, -12)" filter="url(#remixGlow)">
    <path d="M12 1L20.2169 2.82598C20.6745 2.92766 21 3.33347 21 3.80217V13.7889C21 15.795 19.9974 17.6684 18.3282 18.7812L12 23L5.6718 18.7812C4.00261 17.6684 3 15.795 3 13.7889V3.80217C3 3.33347 3.32553 2.92766 3.78307 2.82598L12 1ZM12 7C10.8954 7 10 7.89543 10 9C10 9.74025 10.4022 10.3866 10.9999 10.7324L11 15H13L13.0011 10.7318C13.5983 10.3858 14 9.73984 14 9C14 7.89543 13.1046 7 12 7Z"
          fill="url(#remixGrad)" />
  </g>
</svg>`
  }
};

// Aliases
DESIGNS.default = DESIGNS.lucide_orange;
DESIGNS.lucide = DESIGNS.lucide_orange;
DESIGNS.a1 = DESIGNS.lucide_orange;
DESIGNS.a2 = DESIGNS.lucide_dark_tile;

export function applyIcon(choiceKey = 'lucide_orange') {
  const chosen = DESIGNS[choiceKey] || DESIGNS.lucide_orange;

  console.log(`[build-icons] Applying design: ${chosen.name} (${choiceKey})...`);

  // 1. Write master SVG to temp
  const tmpSvg = '/tmp/chosen-icon.svg';
  fs.writeFileSync(tmpSvg, chosen.svg.trim());

  // 2. Render master PNG (512x512) via Chrome Headless
  console.log('[build-icons] Rendering vector SVG to 512x512 master PNG via Chrome headless...');
  const masterPng = '/tmp/chosen-icon.svg.png';
  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (fs.existsSync(chromePath)) {
    execSync(`"${chromePath}" --headless=new --screenshot=${masterPng} --window-size=512,512 --default-background-color=00000000 "file://${tmpSvg}"`, { stdio: 'pipe' });
  } else {
    execSync(`qlmanage -t -s 512 -o /tmp ${tmpSvg}`, { stdio: 'pipe' });
  }

  // 3. Target paths
  fs.writeFileSync(path.join(rootDir, 'NodeWarden.svg'), chosen.svg.trim());
  fs.writeFileSync(path.join(rootDir, 'webapp/public/nodewarden-logo-bg.svg'), chosen.svg.trim());
  fs.writeFileSync(path.join(rootDir, 'webapp/public/icon-source.svg'), chosen.svg.trim());
  fs.writeFileSync(path.join(rootDir, 'webapp/public/nodewarden-logo.svg'), (chosen.svgNavbar || chosen.svg).trim());
  console.log('[build-icons] Updated NodeWarden.svg, nodewarden-logo-bg.svg, nodewarden-logo.svg, icon-source.svg');

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
    fs.writeFileSync(path.join(distDir, 'nodewarden-logo.svg'), (chosen.svgNavbar || chosen.svg).trim());
    fs.writeFileSync(path.join(distDir, 'nodewarden-logo-bg.svg'), chosen.svg.trim());
    fs.writeFileSync(path.join(distDir, 'icon-source.svg'), chosen.svg.trim());
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
  const chosenKey = process.argv[2] || 'lucide_orange';
  applyIcon(chosenKey);
}
