// Interactive figures, one folder per product slug: text.js (texts in three languages), figure.json
// (written by figures/<id>/build.mjs) and live.js (behaviour, loaded on demand by loader.js).
const texts = import.meta.glob<{ TEXT: Record<string, any> }>('./*/text.js', { eager: true });
const datas = import.meta.glob<{ default: Record<string, any> }>('./*/figure.json', { eager: true });

export function figureById(id: string) {
  const text = texts[`./${id}/text.js`]?.TEXT;
  const data = datas[`./${id}/figure.json`]?.default;
  return text && data ? { text, data } : undefined;
}
