import { useState } from "react";
import { motion } from "motion/react";
import { Calendar, Car, User, Phone, CheckCircle2 } from "lucide-react";

const services = [
  "Essential Wash — $35",
  "Signature Detail — $149",
  "Elite Ceramic — $499",
  "Paint Correction",
  "Headlight Restoration",
  "Engine Bay Clean",
];

const vehicles = ["Sedan / Coupe", "SUV / Crossover", "Truck", "Van / Minivan", "Sports Car", "Other"];

export function BookingSection() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", service: "", vehicle: "", date: "", notes: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="book" className="py-28 bg-black relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1561646114-780004e1fe33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBzcG9ydHMlMjBjYXIlMjBzaGlueSUyMHJlZmxlY3Rpb258ZW58MXx8fHwxNzgwNDE5NjczfDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Sports car"
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sky-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Ready to Book?
          </p>
          <h2 className="text-white text-4xl md:text-5xl font-black tracking-tight mb-4">
            Schedule Your Detail
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-base">
            Fill out the form below and we'll confirm your appointment within 2
            business hours.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl"
            >
              <CheckCircle2 className="w-16 h-16 text-sky-400 mx-auto mb-4" />
              <h3 className="text-white text-2xl font-bold mb-2">You're Booked!</h3>
              <p className="text-white/60 text-base max-w-sm mx-auto">
                We'll reach out to {form.name} at {form.phone} shortly to confirm your appointment.
              </p>
            </motion.div>
          ) : (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                  <input
                    name="name"
                    type="text"
                    placeholder="Your Name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-500/60 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="Phone Number"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-500/60 transition-colors"
                  />
                </div>
              </div>

              <div className="relative">
                <Car className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <select
                  name="vehicle"
                  required
                  value={form.vehicle}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-sky-500/60 transition-colors appearance-none"
                >
                  <option value="" className="bg-zinc-900">Vehicle Type</option>
                  {vehicles.map((v) => (
                    <option key={v} value={v} className="bg-zinc-900">{v}</option>
                  ))}
                </select>
              </div>

              <select
                name="service"
                required
                value={form.service}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-sky-500/60 transition-colors appearance-none"
              >
                <option value="" className="bg-zinc-900">Select a Service</option>
                {services.map((s) => (
                  <option key={s} value={s} className="bg-zinc-900">{s}</option>
                ))}
              </select>

              <div className="relative">
                <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-white/30" />
                <input
                  name="date"
                  type="date"
                  required
                  value={form.date}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-sm focus:outline-none focus:border-sky-500/60 transition-colors [color-scheme:dark]"
                />
              </div>

              <textarea
                name="notes"
                placeholder="Additional notes (optional) — vehicle year, make, model, specific concerns..."
                rows={3}
                value={form.notes}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-sky-500/60 transition-colors resize-none"
              />

              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-sky-500 text-white font-bold text-base hover:bg-sky-400 transition-all shadow-xl shadow-sky-500/30 hover:shadow-sky-400/40 hover:scale-[1.01] active:scale-[0.99]"
              >
                Confirm Booking Request
              </button>
            </motion.form>
          )}
        </div>
      </div>
    </section>
  );
}
