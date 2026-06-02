import { Check, ArrowRight } from "lucide-react";
import type { ContentService } from "../../api";

export type ServiceTitle =
  | "Express Wash"
  | "Full Interior Detail"
  | "Paint Polish & Wax"
  | "Ceramic Coating"
  | "Wheel & Tire Detail"
  | "Complete Detail Package";

const FALLBACK_SERVICES: ContentService[] = [
  {
    title: "Express Wash", subtitle: "Quick & Efficient",
    description: "A thorough exterior rinse and hand-dry that brings back your car's clean look in as little as 15 minutes.",
    image: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxMDI0OXww&ixlib=rb-4.1.0&q=80&w=600",
    price: "From $19", category: "", accent: "#2563eb",
    features: ["Foam pre-soak", "High-pressure rinse", "Hand dry & wipe", "Window cleaning"],
  },
  {
    title: "Full Interior Detail", subtitle: "Deep Clean",
    description: "Complete interior restoration — vacuuming, steam cleaning, leather conditioning, and odor elimination.",
    image: "https://images.unsplash.com/photo-1605437241278-c1806d14a4d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBpbnRlcmlvciUyMGNsZWFuaW5nJTIwZGV0YWlsfGVufDF8fHx8MTc4MDQxMDI1M3ww&ixlib=rb-4.1.0&q=80&w=600",
    price: "From $89", category: "", accent: "#7c3aed",
    features: ["Full vacuum", "Steam sanitization", "Leather treatment", "Odor removal"],
  },
  {
    title: "Paint Polish & Wax", subtitle: "Restore & Protect",
    description: "Multi-stage machine polishing removes swirl marks and light scratches, finished with a premium carnauba wax.",
    image: "https://images.unsplash.com/photo-1708805282706-f44730b7e527?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBwYWludCUyMHBvbGlzaCUyMHdheHxlbnwxfHx8fDE3ODA0MTAyNTR8MA&ixlib=rb-4.1.0&q=80&w=600",
    price: "From $149", category: "", accent: "#059669",
    features: ["Swirl mark removal", "Machine polish", "Carnauba wax", "Paint sealant"],
  },
  {
    title: "Ceramic Coating", subtitle: "Long-Term Defense",
    description: "Professional-grade 9H ceramic coating creates a hydrophobic barrier that protects your paint for years.",
    image: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxMDI0OXww&ixlib=rb-4.1.0&q=80&w=600",
    price: "From $599", category: "", accent: "#d97706",
    features: ["9H hardness", "5-year warranty", "UV protection", "Self-cleaning effect"],
  },
  {
    title: "Wheel & Tire Detail", subtitle: "Complete Wheel Care",
    description: "Iron decontamination, acid-free wheel cleaner, tire dressing and brake dust removal for a stunning finish.",
    image: "https://images.unsplash.com/photo-1565689876697-e467b6c54da2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxMDI0OXww&ixlib=rb-4.1.0&q=80&w=600",
    price: "From $49", category: "", accent: "#dc2626",
    features: ["Iron decontam.", "Acid-free cleaner", "Tire dressing", "Caliper clean"],
  },
  {
    title: "Complete Detail Package", subtitle: "The Full Treatment",
    description: "The ultimate detailing experience combining exterior wash, interior deep clean, paint polish, and protection.",
    image: "https://images.unsplash.com/photo-1652898072202-5084dc85b850?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjYXIlMjBwYWludCUyMHBvbGlzaCUyMHdheHxlbnwxfHx8fDE3ODA0MTAyNTR8MA&ixlib=rb-4.1.0&q=80&w=600",
    price: "From $299", category: "", accent: "#0284c7",
    features: ["Full exterior", "Interior detail", "Paint correction", "12-mo protection"],
  },
];

export function Services({ onBook, apiServices }: { onBook: (service: ServiceTitle) => void; apiServices: ContentService[] }) {
  const services = apiServices.length > 0 ? apiServices : FALLBACK_SERVICES;

  return (
    <section id="services" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div
            className="inline-block bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full mb-4"
            style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            OUR SERVICES
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
            Everything Your Car Needs
          </h2>
          <p
            className="text-gray-500 mt-4 max-w-xl mx-auto"
            style={{ fontSize: "1rem", lineHeight: 1.7 }}
          >
            From a quick rinse to a full concours-level restoration — choose the
            service that fits your schedule and budget.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {services.map((svc, i) => (
            <ServiceCard key={i} {...svc} onBook={onBook} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  title,
  subtitle,
  description,
  image,
  price,
  features,
  accent,
  onBook,
}: ContentService & { onBook: (service: ServiceTitle) => void }) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col group border border-gray-100">
      <div className="relative h-48 overflow-hidden">
        {image && (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <span
          className="absolute bottom-4 right-4 text-white"
          style={{ fontWeight: 800, fontSize: "1.1rem" }}
        >
          {price}
        </span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="mb-1" style={{ color: accent, fontSize: "0.75rem", fontWeight: 700 }}>
          {subtitle}
        </div>
        <h3 className="text-gray-900 mb-2" style={{ fontWeight: 700, fontSize: "1.15rem" }}>
          {title}
        </h3>
        <p className="text-gray-500 mb-5 flex-1" style={{ fontSize: "0.875rem", lineHeight: 1.65 }}>
          {description}
        </p>

        {features.length > 0 && (
          <ul className="space-y-1.5 mb-6">
            {features.map((f, fi) => (
              <li key={fi} className="flex items-center gap-2.5">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${accent}18` }}
                >
                  <Check size={10} style={{ color: accent }} strokeWidth={3} />
                </div>
                <span className="text-gray-600" style={{ fontSize: "0.8rem", fontWeight: 500 }}>
                  {f}
                </span>
              </li>
            ))}
          </ul>
        )}

        <button
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border transition-colors duration-200 cursor-pointer group/btn"
          style={{
            borderColor: accent,
            color: accent,
            backgroundColor: "transparent",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = accent;
            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = accent;
          }}
          onClick={() => onBook(title as ServiceTitle)}
        >
          Book This Service
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
