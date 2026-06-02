import { useRef, useState } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Services } from "./components/Services";
import type { ServiceTitle } from "./components/Services";
import { Pricing } from "./components/Pricing";
import { Testimonials } from "./components/Testimonials";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { useContent } from "./useContent";
import type { ContentService } from "../api";

export default function App() {
  const { content, loading } = useContent();
  const [selectedService, setSelectedService] = useState<ServiceTitle | "">("");
  const contactRef = useRef<HTMLElement>(null);

  const handleBook = (service: ServiceTitle) => {
    setSelectedService(service);
    setTimeout(() => {
      contactRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero content={content} />
        <Services onBook={handleBook} apiServices={content?.services ?? []} />
        <Pricing services={content?.services ?? []} />
        <Testimonials />
        <Contact ref={contactRef} preselectedService={selectedService} />
      </main>
      <Footer />
    </div>
  );
}
