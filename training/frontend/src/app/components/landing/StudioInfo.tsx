import type { ContentAbout } from '../../context/AppContext';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/') && API_BASE) return `${API_BASE}${url}`;
  return url;
}

export function StudioInfo({ about }: { about?: ContentAbout | null }) {
  if (!about || (!about.text && !about.image && about.features.length === 0)) return null;

  const imgSrc = about.image ? resolveImageUrl(about.image) : '';

  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>
            О СТУДИИ
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            ATMOSFERA ДЕТЕЙЛИНГ
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {imgSrc && (
            <div className="rounded-2xl overflow-hidden">
              <img src={imgSrc} alt="О студии" className="w-full h-full object-cover rounded-2xl" style={{ maxHeight: '420px' }} />
            </div>
          )}
          <div className={imgSrc ? '' : 'md:col-span-2 max-w-2xl mx-auto'}>
            {about.text && (
              <div className="text-gray-600 leading-relaxed text-sm space-y-3"
                dangerouslySetInnerHTML={{ __html: about.text.replace(/\n/g, '<br/>') }} />
            )}
            {about.features.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mt-6">
                {about.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-sm text-gray-700">{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
