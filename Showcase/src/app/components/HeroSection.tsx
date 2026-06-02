import { motion } from "motion/react";
import { ArrowDown, Star } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Luxury car detailing"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
      </div>

      {/* Animated blue accent glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 text-sky-400 text-xs sm:text-sm font-medium mb-6">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-sky-400 flex-shrink-0" />
            <span>Rated #1 Detailing Studio in the City</span>
          </div>

          <h1 className="text-white text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-5">
            Your Car Deserves
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              Perfection.
            </span>
          </h1>

          <p className="text-white/60 text-base md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed px-2">
            Premium car wash and full detailing services that restore your vehicle
            to showroom condition. Every time. No exceptions.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
            <a
              href="#book"
              className="px-7 py-4 rounded-full bg-sky-500 text-white font-bold text-base hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/30 active:scale-95 text-center"
            >
              Book a Detail
            </a>
            <a
              href="#services"
              className="px-7 py-4 rounded-full border border-white/20 text-white font-medium text-base hover:border-white/50 hover:bg-white/5 transition-all text-center"
            >
              View Services
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 max-w-sm mx-auto text-white/50">
            {[["500+", "Cars Detailed"], ["98%", "Satisfaction"], ["7+", "Years Exp."]].map(
              ([val, label]) => (
                <div key={label} className="text-center">
                  <div className="text-white text-xl sm:text-2xl md:text-3xl font-black">{val}</div>
                  <div className="text-xs mt-1 leading-tight">{label}</div>
                </div>
              )
            )}
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ArrowDown className="w-4 h-4" />
      </motion.div>
    </section>
  );
}
