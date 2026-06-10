// Утиліти форматування для української локалі.
export function fmtMoney(v: number | null | undefined, currency = 'USD'): string {
  if (v == null || isNaN(Number(v))) return '—';
  const sym: Record<string, string> = { USD: '$', EUR: '€', UAH: '₴' };
  return `${sym[currency] ?? ''}${Math.round(Number(v)).toLocaleString('uk-UA')}`;
}
export function fmtNumber(v: number | null | undefined, digits = 0): string {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('uk-UA', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('uk-UA'); } catch { return s; }
}
export function fmtArea(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${fmtNumber(v, 1)} м²`;
}
export function propertyTypeLabel(t: string): string {
  const m: Record<string, string> = { apartment: 'Квартира', house: 'Будинок', commercial: 'Комерція', land: 'Земля' };
  return m[t] ?? t;
}
export function roleLabel(r: string): string {
  return ({ superuser: 'Суперкористувач', admin: 'Адмін', moderator: 'Модератор', user: 'Користувач' } as Record<string, string>)[r] ?? r;
}
export function statusLabel(s: string): string {
  return ({ pending: 'На перевірці', approved: 'Підтверджено', rejected: 'Відхилено', duplicate: 'Дублікат', blocked: 'Заблоковано' } as Record<string, string>)[s] ?? s;
}
export function sourceLabel(s: string): string {
  return ({ telegram: 'Telegram', google_sheets: 'Google Таблиці', manual: 'Вручну', csv: 'CSV', site_form: 'Форма сайту' } as Record<string, string>)[s] ?? s;
}
