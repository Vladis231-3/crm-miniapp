import { useState, useEffect, forwardRef } from 'react';
import { Phone, MapPin, Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api';

interface ContactProps {
  preselectedService?: string;
}

export const Contact = forwardRef<HTMLElement, ContactProps>(function Contact({ preselectedService = '' }, ref) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', service: preselectedService, message: '' });

  useEffect(() => {
    if (preselectedService) setForm((f) => ({ ...f, service: preselectedService }));
  }, [preselectedService]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, phone: form.phone, service: form.service, message: form.message }),
      });
      setSubmitted(true);
    } catch {
      setError('Не удалось отправить заявку. Попробуйте позже.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em' }}>КОНТАКТЫ</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            Записаться на услугу</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', marginBottom: '1.25rem' }}>Свяжитесь с нами</h3>
              <div className="space-y-5">
                {[
                  { icon: Phone, label: 'Telegram', value: '@system_polish', sub: 'Онлайн 24/7' },
                  { icon: MapPin, label: 'Адрес', value: 'г. Казань, ул. Гладилова 27а', sub: 'По записи' },
                  { icon: Clock, label: 'Часы работы', value: 'Пн–Сб: 9:00 – 19:00', sub: 'Вс: выходной' },
                ].map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon size={17} className="text-white" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>{label}</div>
                      <div style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{value}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <a href={window.location.origin}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#229ED9' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" fill="white"/>
                <path d="M16.5 8.5L8.5 12.5L7.5 9.5L6 10.5L8.5 16.5L10.5 15.5L13 12.5L15.5 15.5L17 9L16.5 8.5Z" fill="#229ED9"/>
              </svg>
              Записаться через Telegram
            </a>
          </div>

          <div className="lg:col-span-3 bg-gray-50 rounded-2xl p-8">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <CheckCircle size={48} className="text-green-500 mb-4" />
                <h3 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a' }}>Заявка отправлена!</h3>
                <p className="text-gray-500 mt-2" style={{ fontSize: '0.9rem' }}>Мы свяжемся с вами в ближайшее время.</p>
                <button onClick={() => { setSubmitted(false); setForm({ name: '', phone: '', service: preselectedService, message: '' }); }}
                  className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer border-none"
                  style={{ fontWeight: 600, fontSize: '0.875rem' }}>Ещё запись</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-gray-700 mb-1.5" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Имя *</label>
                    <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Иван Петров"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ fontSize: '0.875rem' }} />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-1.5" style={{ fontSize: '0.82rem', fontWeight: 600 }}>Телефон *</label>
                    <input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+7 (999) 123-45-67"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ fontSize: '0.875rem' }} />
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-xs">
                    <AlertCircle size={13} /> {error}
                  </div>
                )}
                <button type="submit" disabled={sending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-60"
                  style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  <Send size={16} /> {sending ? 'Отправка...' : 'Отправить заявку'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
