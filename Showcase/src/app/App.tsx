import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { ServicesSection } from "./components/ServicesSection";
import { GallerySection } from "./components/GallerySection";
import { PricingSection } from "./components/PricingSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { BookingSection } from "./components/BookingSection";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="bg-black min-h-screen scroll-smooth overflow-x-hidden">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <GallerySection />
      <PricingSection />
      <TestimonialsSection />
      <BookingSection />
      <Footer />
    </div>
  );
}
