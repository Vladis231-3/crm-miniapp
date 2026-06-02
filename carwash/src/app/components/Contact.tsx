import { useState, useEffect, forwardRef } from "react";
import { Phone, MapPin, Clock, Send, CheckCircle } from "lucide-react";
import type { ServiceTitle } from "./Services";

interface ContactProps {
  preselectedService?: ServiceTitle | "";
}

export const Contact = forwardRef<HTMLElement, ContactProps>(function Contact(
  { preselectedService = "" },
  ref
) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: preselectedService,
    message: "",
  });

  useEffect(() => {
    if (preselectedService) {
      setForm((f) => ({ ...f, service: preselectedService }));
    }
  }, [preselectedService]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section id="contact" ref={ref} className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div
            className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            CONTACT US
          </div>
          <h2
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.75rem)",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            Book Your Appointment
          </h2>
          <p
            className="text-gray-500 mt-4"
            style={{ fontSize: "1rem", lineHeight: 1.7 }}
          >
            Ready for a showroom-fresh finish? Get in touch and we'll take care of the rest.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 max-w-5xl mx-auto">
          {/* Info panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem", marginBottom: "1.25rem" }}>
                Get in Touch
              </h3>
              <div className="space-y-5">
                {[
                  {
                    icon: Phone,
                    label: "Phone",
                    value: "(555) 123-4567",
                    sub: "Mon–Sat, 8am–6pm",
                  },
                  {
                    icon: MapPin,
                    label: "Location",
                    value: "1420 Detail Drive",
                    sub: "San Francisco, CA 94105",
                  },
                  {
                    icon: Clock,
                    label: "Hours",
                    value: "Mon–Fri: 8am – 7pm",
                    sub: "Sat–Sun: 9am – 5pm",
                  },
                ].map(({ icon: Icon, label, value, sub }) => (
                  <div key={label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Icon size={17} className="text-white" />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#0f172a", fontWeight: 600, marginTop: "0.1rem" }}>
                        {value}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>{sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl p-6 text-white"
              style={{ backgroundColor: "#030213" }}
            >
              <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>
                First-time customer?
              </p>
              <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.65 }}>
                Mention this website when booking and receive{" "}
                <span className="text-blue-400" style={{ fontWeight: 700 }}>15% off</span> your first
                service.
              </p>
            </div>

            <a
              href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'atmosfera_bot'}?start=app`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: '#229ED9' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" fill="white" />
                <path d="M16.5 8.5L8.5 12.5L7.5 9.5L6 10.5L8.5 16.5L10.5 15.5L13 12.5L15.5 15.5L17 9L16.5 8.5Z" fill="#229ED9" />
              </svg>
              Записаться через Telegram
            </a>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 bg-gray-50 rounded-2xl p-8">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <CheckCircle size={48} className="text-green-500 mb-4" />
                <h3 style={{ fontWeight: 700, fontSize: "1.2rem", color: "#0f172a" }}>
                  Booking Request Sent!
                </h3>
                <p className="text-gray-500 mt-2" style={{ fontSize: "0.9rem" }}>
                  We'll confirm your appointment within 2 business hours.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", phone: "", service: preselectedService, message: "" }); }}
                  className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer border-none"
                  style={{ fontWeight: 600, fontSize: "0.875rem" }}
                >
                  Book Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {form.service && (
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <CheckCircle size={17} className="text-blue-600 flex-shrink-0" />
                    <p style={{ fontSize: "0.85rem", color: "#1e40af", fontWeight: 500 }}>
                      Selected: <strong>{form.service}</strong> — fill in your details below to confirm.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="block text-gray-700 mb-1.5"
                      style={{ fontSize: "0.82rem", fontWeight: 600 }}
                    >
                      Full Name *
                    </label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="John Smith"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ fontSize: "0.875rem" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-gray-700 mb-1.5"
                      style={{ fontSize: "0.82rem", fontWeight: 600 }}
                    >
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ fontSize: "0.875rem" }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label
                      className="block text-gray-700 mb-1.5"
                      style={{ fontSize: "0.82rem", fontWeight: 600 }}
                    >
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="(555) 000-0000"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      style={{ fontSize: "0.875rem" }}
                    />
                  </div>
                  <div>
                    <label
                      className="block text-gray-700 mb-1.5"
                      style={{ fontSize: "0.82rem", fontWeight: 600 }}
                    >
                      Service *
                    </label>
                    <select
                      required
                      value={form.service}
                      onChange={(e) => setForm({ ...form, service: e.target.value })}
                      className="w-full bg-white rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                      style={{
                        fontSize: "0.875rem",
                        border: form.service
                          ? "2px solid #2563eb"
                          : "1px solid #e5e7eb",
                        boxShadow: form.service ? "0 0 0 3px rgba(37,99,235,0.1)" : "none",
                      }}
                    >
                      <option value="">Select a service…</option>
                      <option>Express Wash</option>
                      <option>Full Interior Detail</option>
                      <option>Paint Polish & Wax</option>
                      <option>Ceramic Coating</option>
                      <option>Wheel & Tire Detail</option>
                      <option>Complete Detail Package</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    className="block text-gray-700 mb-1.5"
                    style={{ fontSize: "0.82rem", fontWeight: 600 }}
                  >
                    Additional Notes
                  </label>
                  <textarea
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us about your vehicle, preferred date/time, or any special requests…"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    style={{ fontSize: "0.875rem" }}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer border-none"
                  style={{ fontWeight: 700, fontSize: "0.95rem" }}
                >
                  <Send size={16} />
                  Request Appointment
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
});
