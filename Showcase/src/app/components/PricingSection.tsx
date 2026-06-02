import { motion } from "motion/react";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Essential Wash",
    price: "$35",
    tag: null,
    desc: "Perfect for regular maintenance between full details.",
    features: [
      "Hand foam wash",
      "Wheel & tire clean",
      "Window cleaning",
      "Air dry & blow-out",
      "Interior vacuum",
    ],
    cta: "Book Now",
    highlight: false,
  },
  {
    name: "Signature Detail",
    price: "$149",
    tag: "Most Popular",
    desc: "Our most booked package — a thorough inside-out transformation.",
    features: [
      "Everything in Essential",
      "Clay bar decontamination",
      "One-step paint polish",
      "Interior steam clean",
      "Leather conditioning",
      "Plastic trim restore",
      "Tire dressing",
    ],
    cta: "Book Now",
    highlight: true,
  },
  {
    name: "Elite Ceramic",
    price: "$499",
    tag: "Premium",
    desc: "Long-lasting protection for those who demand the absolute best.",
    features: [
      "Everything in Signature",
      "Multi-stage paint correction",
      "2-year ceramic coating",
      "Engine bay detail",
      "Headlight restoration",
      "Interior odor elimination",
      "Free 30-day follow-up wash",
    ],
    cta: "Get a Quote",
    highlight: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sky-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Transparent Pricing
          </p>
          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            Choose Your Package
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base px-2">
            No hidden fees. No surprises. Just exceptional results at every
            price point.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-6 sm:p-8 border transition-all duration-300 ${
                plan.highlight
                  ? "bg-sky-500/10 border-sky-500/50 shadow-2xl shadow-sky-500/10"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
            >
              {plan.tag && (
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-wide ${
                    plan.highlight
                      ? "bg-sky-500 text-white"
                      : "bg-amber-500 text-black"
                  }`}
                >
                  {plan.tag}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{plan.desc}</p>
              </div>

              <div className="mb-8">
                <span className="text-white text-5xl font-black">{plan.price}</span>
                <span className="text-white/40 text-sm ml-2">starting</span>
              </div>

              <ul className="flex-1 flex flex-col gap-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                        plan.highlight ? "bg-sky-500" : "bg-white/20"
                      }`}
                    >
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-white/70 text-sm">{f}</span>
                  </li>
                ))}
              </ul>

              <a
                href="#book"
                className={`block text-center py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? "bg-sky-500 text-white hover:bg-sky-400 shadow-lg shadow-sky-500/30"
                    : "border border-white/20 text-white hover:bg-white/10"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-white/30 text-sm mt-8">
          Prices vary by vehicle size. SUVs and trucks may incur additional charges. Contact us for a custom quote.
        </p>
      </div>
    </section>
  );
}
