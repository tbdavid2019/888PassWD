import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Designs for 888warden
export const DESIGNS = {
  // Primary Design: Pure Minimalist Cyber Orange with 888 PassWD
  pure_orange_text: {
    name: 'Solid Cyber Orange - 888 PassWD (素色橘色純文字款)',
    library: 'Minimalist Typography',
    description: '素色橘色科技圓角磚，杜絕任何剪貼畫或圖形，純淨白色粗體 888 與 PassWD，極簡清晰。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Solid Cyber Orange Squircle Tile (No Graphics, Pure Text) -->
  <rect x="16" y="16" width="480" height="480" rx="112" fill="#F95700" />

  <!-- "888" Text (Line 1) -->
  <text x="256" y="240"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="148"
        letter-spacing="4"
        fill="#FFFFFF"
        text-anchor="middle">888</text>

  <!-- "PassWD" Text (Line 2) -->
  <text x="256" y="364"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif"
        font-weight="900"
        font-size="78"
        letter-spacing="2"
        fill="#FFFFFF"
        text-anchor="middle">PassWD</text>
</svg>`
  },

  // Lucide Cyber Orange with Shield
  lucide_orange: {
    name: 'Lucide Cyber Orange - 888 PassWD (鮮豔橙色盾牌款)',
    library: 'Lucide Icons (lucide.dev)',
    description: '全亮鮮豔 Cyber Orange 科技圓角磚，搭配官方 Lucide 防護盾。',
    svg: `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="fullOrangeBg" cx="50%" cy="15%" r="85%">
      <stop offset="0%" stop-color="#FFA028" />
      <stop offset="40%" stop-color="#F95700" />
      <stop offset="100%" stop-color="#BD2600" />
    </radialGradient>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="112" fill="url(#fullOrangeBg)" />
  <text x="256" y="240" font-family="system-ui, sans-serif" font-weight="900" font-size="148" letter-spacing="4" fill="#FFFFFF" text-anchor="middle">888</text>
  <text x="256" y="364" font-family="system-ui, sans-serif" font-weight="900" font-size="78" letter-spacing="2" fill="#FFFFFF" text-anchor="middle">PassWD</text>
</svg>`
  }
};

// Aliases
DESIGNS.default = DESIGNS.pure_orange_text;
DESIGNS.orange = DESIGNS.pure_orange_text;
DESIGNS.text = DESIGNS.pure_orange_text;

export function applyIcon(choiceKey = 'pure_orange_text') {
  const chosen = DESIGNS[choiceKey] || DESIGNS.pure_orange_text;

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
  const chosenKey = process.argv[2] || 'pure_orange_text';
  applyIcon(chosenKey);
}

