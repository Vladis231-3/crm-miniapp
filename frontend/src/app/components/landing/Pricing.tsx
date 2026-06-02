import { Check } from 'lucide-react';
import type { ContentService } from '../../context/AppContext';

const FALLBACK_PLANS = [
  { name: 'Basic', tagline: 'Perfect for regular maintenance', price: 29, period: 'per wash', color: '#6b7280', highlight: false, features: ['Exterior hand wash', 'Wheel & tire clean', 'Window cleaning', 'Air freshener', 'Microfiber dry'], notIncluded: ['Interior vacuum', 'Polish & wax'] },
  { name: 'Premium', tagline: 'Our most popular package', price: 99, period: 'per detail', color: '#2563eb', highlight: true, features: ['Everything in Basic', 'Interior vacuum & wipe', 'Leather conditioning', 'Dashboard polish', 'Carpet shampoo'], notIncluded: ['Polish & wax'] },
  { name: 'Ultimate', tagline: 'Complete showroom finish', price: 249, period: 'per detail', color: '#7c3aed', highlight: false, features: ['Everything in Premium', 'Machine paint polish', 'Premium wax coating', 'Engine bay cleaning', 'Headlight restoration', '12-month protection'], notIncluded: [] },
];

export function Pricing({ services }: { services: ContentService[] }) {
  const plans = services.length > 0
    ? services.map((s, i) => ({
        name: s.title,
        tagline: s.subtitle,
        price: parseInt(s.price.replace(/\D/g, '')) || (i === 1 ? 99 : i === 2 ? 249 : 29),
        period: 'per service',
        color: s.accent,
        highlight: i === 1,
        features: s.features.slice(0, 5),
        notIncluded: [] as string[],
      }))
    : FALLBACK_PLANS;

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>PRICING</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Transparent Pricing</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`rounded-2xl p-8 flex flex-col border transition-all duration-300 ${plan.highlight ? 'shadow-xl scale-105 border-blue-200' : 'shadow-sm border-gray-100'}`}
              style={{ backgroundColor: plan.highlight ? '#ffffff' : '#fafafa' }}>
              {plan.highlight && <div className="text-white text-xs font-bold px-3 py-1 rounded-full self-start mb-4" style={{ backgroundColor: plan.color }}>MOST POPULAR</div>}
              <h3 style={{ fontWeight: 700, fontSize: '1.25rem', color: '#0f172a' }}>{plan.name}</h3>
              <p className="text-gray-500 mt-1" style={{ fontSize: '0.875rem' }}>{plan.tagline}</p>
              <div className="my-6">
                <span style={{ fontWeight: 800, fontSize: '2.5rem', color: '#0f172a' }}>${plan.price}</span>
                <span className="text-gray-400" style={{ fontSize: '0.9rem' }}>/{plan.period}</span>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-gray-900 mb-3">Included:</div>
                <ul className="space-y-2.5">
                  {plan.features.map((feature: string) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600" style={{ fontSize: '0.875rem' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <button onClick={() => document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-3 rounded-xl text-white font-semibold mt-6 transition-all duration-200 hover:opacity-90 cursor-pointer border-none"
                style={{ backgroundColor: plan.color }}>Choose {plan.name}</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
