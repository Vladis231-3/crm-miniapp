import { useState, useEffect } from 'react';
import { Menu, X, Droplets } from 'lucide-react';

const navLinks = [
  { label: 'Услуги', href: '#services' },
  { label: 'Цены', href: '#pricing' },
  { label: 'Галерея', href: '#gallery' },
  { label: 'Отзывы', href: '#testimonials' },
  { label: 'Контакты', href: '#contact' },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Droplets size={18} className="text-white" />
          </div>
          <span className={`transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-white'}`}
            style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em' }}>
            ATMOSFERA
          </span>
        </button>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <button key={link.label} onClick={() => handleNav(link.href)}
              className={`transition-colors duration-200 hover:text-blue-500 cursor-pointer bg-transparent border-none p-0 ${
                scrolled ? 'text-gray-600' : 'text-white/90'
              }`} style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {link.label}
            </button>
          ))}
          <button onClick={() => handleNav('#contact')}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer border-none"
            style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            Записаться
          </button>
        </nav>

        <button className={`md:hidden p-2 rounded-lg cursor-pointer bg-transparent border-none ${scrolled ? 'text-gray-700' : 'text-white'}`}
          onClick={() => setMenuOpen((o) => !o)} aria-label="Toggle menu">
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
          <nav className="px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <button key={link.label} onClick={() => handleNav(link.href)}
                className="text-left text-gray-700 py-3 border-b border-gray-50 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-none"
                style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                {link.label}
              </button>
            ))}
            <button onClick={() => handleNav('#contact')}
              className="mt-3 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 cursor-pointer border-none"
              style={{ fontWeight: 600 }}>
              Записаться
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
