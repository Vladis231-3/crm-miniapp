import { Droplets, MapPin, Phone, Mail, Instagram, Facebook, Youtube } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/40">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-black text-xl tracking-tight">
                APEX<span className="text-sky-400">DETAIL</span>
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              Premium car wash and detailing services. We treat every vehicle like it's our own.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Quick Links</h4>
            <ul className="flex flex-col gap-2.5">
              {["Services", "Gallery", "Pricing", "Testimonials", "Book Now"].map((l) => (
                <li key={l}>
                  <a
                    href={`#${l.toLowerCase().replace(" ", "")}`}
                    className="text-white/40 text-sm hover:text-sky-400 transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Contact</h4>
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 text-white/40 text-sm">
                <MapPin className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <span>1240 Auto Blvd, Suite 100<br />Los Angeles, CA 90012</span>
              </li>
              <li className="flex items-center gap-3 text-white/40 text-sm">
                <Phone className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <a href="tel:+13105550199" className="hover:text-sky-400 transition-colors">
                  (310) 555-0199
                </a>
              </li>
              <li className="flex items-center gap-3 text-white/40 text-sm">
                <Mail className="w-4 h-4 text-sky-500 flex-shrink-0" />
                <a href="mailto:hello@apexdetail.com" className="hover:text-sky-400 transition-colors">
                  hello@apexdetail.com
                </a>
              </li>
            </ul>
            <div className="mt-4 text-white/30 text-xs">
              <p>Mon – Fri: 8AM – 7PM</p>
              <p>Sat – Sun: 9AM – 5PM</p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/25 text-xs">
            © 2026 ApexDetail. All rights reserved.
          </p>
          <div className="flex gap-4 text-white/25 text-xs">
            <a href="#" className="hover:text-white/50 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white/50 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
