import { Globe } from 'lucide-preact';
import { AVAILABLE_LOCALES, getLocale, setLocale, type Locale } from '@/lib/i18n';

export default function StandaloneLanguagePicker() {
  const current = getLocale();

  async function handleChange(e: Event) {
    const next = (e.currentTarget as HTMLSelectElement).value as Locale;
    if (next === current) return;
    await setLocale(next);
    window.location.reload();
  }

  return (
    <div className="standalone-lang-picker" title="切換語言 / Switch Language">
      <Globe size={16} className="standalone-lang-icon" />
      <select
        className="standalone-lang-select"
        value={current}
        onChange={handleChange}
        aria-label="切換語言 / Switch Language"
      >
        {AVAILABLE_LOCALES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
