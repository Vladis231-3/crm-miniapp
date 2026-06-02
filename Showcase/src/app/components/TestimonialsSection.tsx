import { motion } from "motion/react";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Marcus T.",
    vehicle: "2022 BMW M4",
    stars: 5,
    text: "Brought in my M4 for a full ceramic package and I'm blown away. The paint looks better than the day I picked it up from the dealership. Absolutely worth every penny.",
    avatar: "MT",
  },
  {
    name: "Sofia R.",
    vehicle: "2021 Tesla Model S",
    stars: 5,
    text: "The interior detail was insane. I have two kids and the back seat was a disaster zone. It came back looking brand new — no smell, no stains, nothing. Incredible team.",
    avatar: "SR",
  },
  {
    name: "James K.",
    vehicle: "2019 Porsche 911",
    stars: 5,
    text: "These guys are true professionals. They caught a deep swirl mark in my clear coat I didn't even notice and corrected it without me even asking. That's attention to detail.",
    avatar: "JK",
  },
  {
    name: "Priya M.",
    vehicle: "2023 Range Rover",
    stars: 5,
    text: "Been coming here for 2 years. Their Signature Detail is my monthly ritual — 45 minutes and my Rover looks showroom fresh every single time. Highly recommend.",
    avatar: "PM",
  },
  {
    name: "Derek W.",
    vehicle: "2020 Dodge Charger",
    stars: 5,
    text: "I did the paint correction + ceramic combo. The depth of shine on black paint is something else. Had zero swirls, zero water spots. People at work thought I bought a new car.",
    avatar: "DW",
  },
  {
    name: "Aisha N.",
    vehicle: "2022 Audi Q7",
    stars: 5,
    text: "Fast, professional, and honest. They told me my headlights weren't bad enough to need full restoration yet — no upsell. Gained a customer for life.",
    avatar: "AN",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-zinc-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sky-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Real Clients
          </p>
          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            What They're Saying
          </h2>
          <div className="flex items-center justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-white/50 max-w-lg mx-auto text-base">
            4.9 out of 5 stars across 200+ verified reviews.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all duration-300 group"
            >
              <Quote className="w-8 h-8 text-sky-500/30 absolute top-5 right-5 group-hover:text-sky-500/50 transition-colors" />
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-white/40 text-xs">{t.vehicle}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
