import { motion } from "motion/react";
import { Sparkles, Wind, Shield, Zap, Droplets, Eye } from "lucide-react";

const services = [
  {
    icon: Droplets,
    title: "Exterior Wash",
    desc: "Hand wash, foam cannon, spot-free rinse, and air dry. Your paint stays pristine.",
    color: "sky",
    img: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    icon: Sparkles,
    title: "Full Detail",
    desc: "Interior vacuum, steam clean, leather conditioning, and deep carpet extraction.",
    color: "violet",
    img: "https://images.unsplash.com/photo-1605437241278-c1806d14a4d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBpbnRlcmlvciUyMGRldGFpbGluZyUyMGNsZWFufGVufDF8fHx8MTc4MDQxOTY3Mnww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    icon: Shield,
    title: "Paint Protection",
    desc: "Ceramic coating and paint sealant that shields against UV, dirt, and oxidation.",
    color: "emerald",
    img: "https://images.unsplash.com/photo-1575844611398-2a68400b437c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw3fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    icon: Zap,
    title: "Paint Correction",
    desc: "Multi-stage machine polish to eliminate swirl marks, scratches, and water spots.",
    color: "amber",
    img: "https://images.unsplash.com/photo-1608506375591-b90e1f955e4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    icon: Wind,
    title: "Engine Bay Clean",
    desc: "Degreased and steam-cleaned engine compartment for peak appearance and cooling.",
    color: "rose",
    img: "https://images.unsplash.com/photo-1533630217389-3a5e4dff5683?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjYXIlMjBpbnRlcmlvciUyMGRldGFpbGluZyUyMGNsZWFufGVufDF8fHx8MTc4MDQxOTY3Mnww&ixlib=rb-4.1.0&q=80&w=400",
  },
  {
    icon: Eye,
    title: "Headlight Restore",
    desc: "Oxidized plastic lenses polished back to crystal clarity for safer night driving.",
    color: "cyan",
    img: "https://images.unsplash.com/photo-1565689876697-e467b6c54da2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
  },
];

const colorMap: Record<string, string> = {
  sky: "from-sky-500/20 to-sky-500/5 border-sky-500/30 text-sky-400",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/30 text-violet-400",
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-400",
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/30 text-cyan-400",
};

export function ServicesSection() {
  return (
    <section id="services" className="py-28 bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sky-400 text-sm font-semibold tracking-widest uppercase mb-3">
            What We Do
          </p>
          <h2 className="text-white text-4xl md:text-5xl font-black tracking-tight mb-4">
            Our Services
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-base">
            Every service is performed by certified detailers using only premium
            products — no shortcuts, ever.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc, i) => {
            const Icon = svc.icon;
            const colorCls = colorMap[svc.color];
            return (
              <motion.div
                key={svc.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={svc.img}
                    alt={svc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                </div>
                <div className="p-6">
                  <div
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br border mb-4 ${colorCls}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{svc.title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{svc.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
