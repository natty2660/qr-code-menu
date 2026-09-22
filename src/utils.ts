/**
 * Formats price strictly using Ethiopian Birr (ETB).
 * Never uses $, USD, or international currencies.
 */
export function formatPrice(price: number, display: 'ETB' | 'ብር' = 'ETB'): string {
  const rounded = Math.round(price);
  return `${rounded} ${display}`;
}

/**
 * Converts 24-hour time "06:00" to readable "6:00 AM"
 */
export function formatTimeRange(start?: string, end?: string): string {
  if (!start && !end) return '';
  const to12h = (timeStr?: string) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m || 0).padStart(2, '0')} ${period}`;
  };

  if (start && end) {
    return `${to12h(start)} – ${to12h(end)}`;
  }
  return to12h(start || end);
}

/**
 * Default Ethiopian food placeholder if image is broken or missing
 */
export const FALLBACK_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80';

export const FALLBACK_RESTAURANT_COVER =
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80';
