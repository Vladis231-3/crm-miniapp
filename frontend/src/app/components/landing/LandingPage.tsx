import { useEffect, useState } from 'react';
import { apiRequest } from '../../api';
import type { ContentData, ContentService } from '../../context/AppContext';
import { Navbar } from './Navbar';
import { Hero } from './Hero';
import { Services } from './Services';
import { Pricing } from './Pricing';
import { Testimonials } from './Testimonials';
import { Contact } from './Contact';
import { Footer } from './Footer';

export function LandingPage() {
  const [content, setContent] = useState<ContentData | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const contactRef = { current: null } as React.RefObject<HTMLElement>;

  useEffect(() => {
    apiRequest<ContentData>('/api/content')
      .then(setContent)
      .catch(() => setContent(null));
  }, []);

  const handleBook = (service: string) => {
    setSelectedService(service);
    setTimeout(() => {
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero content={content} />
        <Services onBook={handleBook} apiServices={content?.services ?? []} />
        <Pricing services={content?.services ?? []} />
        <Testimonials />
        <Contact preselectedService={selectedService} />
      </main>
      <Footer />
    </div>
  );
}
