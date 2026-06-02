import { useEffect, useState } from 'react';
import { apiRequest } from '../../api';
import type { ContentData } from '../../context/AppContext';
import { Works } from './Works';
import { Footer } from './Footer';
import { ArrowLeft, Droplets } from 'lucide-react';

export function WorksPage() {
  const [content, setContent] = useState<ContentData | null>(null);

  useEffect(() => {
    apiRequest<ContentData>('/api/content')
      .then(setContent)
      .catch(() => setContent(null));
  }, []);

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => window.location.href = window.location.origin}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-none"
            style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            <ArrowLeft size={16} />
            На главную
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Droplets size={15} className="text-white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.02em' }}>ATMOSFERA</span>
          </div>
        </div>
      </nav>
      <Works apiWorks={content?.works ?? []} />
      <Footer />
    </div>
  );
}
