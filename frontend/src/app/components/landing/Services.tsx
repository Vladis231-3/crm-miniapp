import { Check, ArrowRight } from 'lucide-react';
import type { ContentService } from '../../context/AppContext';

const FALLBACK_SERVICES: ContentService[] = [
  { title: 'Express Wash', subtitle: 'Quick & Efficient', description: 'A thorough exterior rinse and hand-dry.', price: 'From $19', category: '', accent: '#2563eb', image: '', features: ['Foam pre-soak', 'High-pressure rinse', 'Hand dry', 'Window cleaning'] },
  { title: 'Full Interior Detail', subtitle: 'Deep Clean', description: 'Complete interior restoration.', price: 'From $89', category: '', accent: '#7c3aed', image: '', features: ['Full vacuum', 'Steam sanitization', 'Leather treatment', 'Odor removal'] },
  { title: 'Paint Polish & Wax', subtitle: 'Restore & Protect', description: 'Multi-stage machine polishing.', price: 'From $149', category: '', accent: '#059669', image: '', features: ['Swirl mark removal', 'Machine polish', 'Carnauba wax', 'Paint sealant'] },
  { title: 'Ceramic Coating', subtitle: 'Long-Term Defense', description: 'Professional-grade 9H ceramic coating.', price: 'From $599', category: '', accent: '#d97706', image: '', features: ['9H hardness', '5-year warranty', 'UV protection', 'Self-cleaning'] },
  { title: 'Wheel & Tire Detail', subtitle: 'Complete Wheel Care', description: 'Iron decontamination and tire dressing.', price: 'From $49', category: '', accent: '#dc2626', image: '', features: ['Iron decontam.', 'Acid-free cleaner', 'Tire dressing', 'Caliper clean'] },
  { title: 'Complete Detail Package', subtitle: 'The Full Treatment', description: 'The ultimate detailing experience.', price: 'From $299', category: '', accent: '#0284c7', image: '', features: ['Full exterior', 'Interior detail', 'Paint correction', '12-mo protection'] },
];

export function Services({ onBook, apiServices }: { onBook: (service: string) => void; apiServices: ContentService[] }) {
  const services = apiServices.length > 0 ? apiServices : FALLBACK_SERVICES;

  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>OUR SERVICES</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Everything Your Car Needs</h2>
          <p className="text-gray-500 mt-4 max-w-xl mx-auto" style={{ fontSize: '1rem', lineHeight: 1.7 }}>
            From a quick rinse to a full concours-level restoration.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {services.map((svc, i) => <ServiceCard key={i} {...svc} onBook={onBook} />)}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ title, subtitle, description, price, features, accent, onBook }: ContentService & { onBook: (service: string) => void }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col group border border-gray-100">
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-1" style={{ color: accent, fontSize: '0.75rem', fontWeight: 700 }}>{subtitle}</div>
        <h3 className="text-gray-900 mb-2" style={{ fontWeight: 700, fontSize: '1.15rem' }}>{title}</h3>
        <p className="text-gray-500 mb-5 flex-1" style={{ fontSize: '0.875rem', lineHeight: 1.65 }}>{description}</p>
        <div className="mb-4"><span className="text-2xl font-bold">{price}</span></div>
        {features.length > 0 && (
          <ul className="space-y-1.5 mb-6">
            {features.map((f, fi) => (
              <li key={fi} className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${accent}18` }}>
                  <Check size={10} style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-gray-600" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{f}</span>
              </li>
            ))}
          </ul>
        )}
        <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border transition-colors duration-200 cursor-pointer"
          style={{ borderColor: accent, color: accent, fontWeight: 600, fontSize: '0.875rem' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = accent; }}
          onClick={() => onBook(title)}>
          Book This Service <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
