import { useState, useEffect } from "react";
import { Menu, X, Droplets } from "lucide-react";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Services", href: "#services" },
    { label: "Gallery", href: "#gallery" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Book Now", href: "#book", cta: true },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/90 backdrop-blur-md shadow-lg shadow-black/40" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        <a href="#" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/40">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-black text-xl tracking-tight">
            APEX<span className="text-sky-400">DETAIL</span>
          </span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {links.map((l) =>
            l.cta ? (
              <a
                key={l.label}
                href={l.href}
                className="px-5 py-2.5 rounded-full bg-sky-500 text-white text-sm font-semibold hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/30"
              >
                {l.label}
              </a>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="text-white/70 text-sm font-medium hover:text-white transition-colors"
              >
                {l.label}
              </a>
            )
          )}
        </div>

        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-black/95 backdrop-blur-md px-6 pb-6 flex flex-col gap-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`text-sm font-medium py-2 border-b border-white/10 ${
                l.cta ? "text-sky-400" : "text-white/70"
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
}
