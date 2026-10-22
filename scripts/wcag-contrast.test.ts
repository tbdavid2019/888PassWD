import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Convert 3 or 6-character hex string to RGB tuple.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '').trim();
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex;
  const num = parseInt(fullHex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Calculate relative luminance according to WCAG 2.1 specs.
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((val) => {
    const srgb = val / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.1 specs.
 * https://www.w3.org/WAI/GL/wiki/Contrast_ratio
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// 2md.aiurl.tw Pantone Standard Color Palette Specifications
export const PANTONE_PALETTE = {
  saffron: '#ffb010', // Pantone 14-1064 TPG Saffron (藏紅花黃)
  saffronHover: '#f2a600', // Saffron Hover 狀態
  deepBlue: '#17324d', // Pantone 19-4024 TCX Dress Blues (夜幕深藍)
  brandStrong: '#17324d', // 夜幕深藍強調文字色
  clay: '#a9471d', // Pantone 18-1442 TCX Clay (赤陶/陶土褐)
  warmCream: '#fff9e8', // Pantone 11-0104 TCX Pureed Pumpkin Pale / Cream (暖奶油)
  ink: '#2b251a', // Pantone 19-0303 TCX Jet Black / Deep Ink (沉木焦墨)
  bronzeMuted: '#655a43', // Pantone 18-0930 TCX Bronze Brown Muted (次要文字)
  canvasWarm: '#fff0cc', // 畫布暖色 (Warm Tint)
  canvas: '#faf6ee', // 畫布底色 (Canvas)
  darkModeBg: '#0b131d', // 深夜幕藍背景
  darkModePanel: '#132030', // 深藍面板/卡片底色
  darkModeSubtle: '#172638', // 次級卡片底色
  darkModeText: '#fff9e8', // 暖奶油主文字色
  darkModeMuted: '#b5a990', // 暖米灰次要文字色
} as const;

test('WCAG Contrast: Ink on Warm Cream reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.ink, PANTONE_PALETTE.warmCream);
  assert.ok(
    ratio >= 7.0,
    `Ink (#2b251a) on Warm Cream (#fff9e8) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 13.0, `Ink on Warm Cream expected >= 13:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Ink on Saffron (Primary button text) reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.ink, PANTONE_PALETTE.saffron);
  assert.ok(
    ratio >= 7.0,
    `Ink (#2b251a) on Saffron (#ffb010) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 8.0, `Ink on Saffron expected >= 8:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: White on Saffron strictly fails WCAG AA (proves Ink is mandatory)', () => {
  const ratio = getContrastRatio('#ffffff', PANTONE_PALETTE.saffron);
  assert.ok(
    ratio < 3.0,
    `White (#ffffff) on Saffron (#ffb010) ratio ${ratio.toFixed(2)}:1 must fail WCAG (< 3.0:1)`,
  );
});

test('WCAG Contrast: Deep Blue on Warm Cream reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.deepBlue, PANTONE_PALETTE.warmCream);
  assert.ok(
    ratio >= 7.0,
    `Deep Blue (#17324d) on Warm Cream (#fff9e8) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 12.0, `Deep Blue on Warm Cream expected >= 12:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Text Muted (Bronze Brown) on Warm Cream meets WCAG AA (>= 4.5:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.bronzeMuted, PANTONE_PALETTE.warmCream);
  assert.ok(
    ratio >= 4.5,
    `Text Muted (#655a43) on Warm Cream (#fff9e8) ratio ${ratio.toFixed(2)}:1 must be >= 4.5:1 (WCAG AA)`,
  );
  assert.ok(ratio >= 6.0, `Text Muted on Warm Cream expected >= 6.0:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Dark mode Text on Panel reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.darkModeText, PANTONE_PALETTE.darkModePanel);
  assert.ok(
    ratio >= 7.0,
    `Dark mode Text (#fff9e8) on Panel (#132030) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 15.0, `Dark mode Text on Panel expected >= 15:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Dark mode Saffron on Panel reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.saffron, PANTONE_PALETTE.darkModePanel);
  assert.ok(
    ratio >= 7.0,
    `Dark mode Saffron (#ffb010) on Panel (#132030) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 8.5, `Dark mode Saffron on Panel expected >= 8.5:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Dark mode Muted on Panel meets WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.darkModeMuted, PANTONE_PALETTE.darkModePanel);
  assert.ok(
    ratio >= 7.0,
    `Dark mode Muted (#b5a990) on Panel (#132030) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
});

test('WCAG Contrast: Clay on Warm Cream meets WCAG AA (>= 4.5:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.clay, PANTONE_PALETTE.warmCream);
  assert.ok(
    ratio >= 4.5,
    `Clay (#a9471d) on Warm Cream (#fff9e8) ratio ${ratio.toFixed(2)}:1 must be >= 4.5:1 (WCAG AA)`,
  );
  assert.ok(ratio >= 5.0, `Clay on Warm Cream expected >= 5.0:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Brand Strong (#17324d) on Warm Cream (#fff9e8) reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.brandStrong, PANTONE_PALETTE.warmCream);
  assert.ok(
    ratio >= 7.0,
    `Brand Strong (#17324d) on Warm Cream (#fff9e8) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 12.0, `Brand Strong on Warm Cream expected >= 12:1, got ${ratio.toFixed(2)}:1`);
});

test('WCAG Contrast: Ink on Saffron Hover (#f2a600) reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.ink, PANTONE_PALETTE.saffronHover);
  assert.ok(
    ratio >= 7.0,
    `Ink (#2b251a) on Saffron Hover (#f2a600) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
});

test('WCAG Contrast: Dark Mode Text on Panel Subtle (#172638) reaches WCAG AAA (>= 7.0:1)', () => {
  const ratio = getContrastRatio(PANTONE_PALETTE.darkModeText, PANTONE_PALETTE.darkModeSubtle);
  assert.ok(
    ratio >= 7.0,
    `Dark mode Text (#fff9e8) on Panel Subtle (#172638) ratio ${ratio.toFixed(2)}:1 must be >= 7.0:1 (WCAG AAA)`,
  );
  assert.ok(ratio >= 14.0, `Dark mode Text on Panel Subtle expected >= 14:1, got ${ratio.toFixed(2)}:1`);
});
