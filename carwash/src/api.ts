const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface ContentAbout {
  text: string;
  features: string[];
}

export interface ContentService {
  title: string;
  subtitle: string;
  description: string;
  price: string;
  features: string[];
  image: string;
  accent: string;
  category: string;
}

export interface ContentWorks {
  title: string;
  description: string;
  image_url: string;
}

export interface ContentData {
  about: ContentAbout;
  services: ContentService[];
  works: ContentWorks[];
}

export async function fetchContent(): Promise<ContentData> {
  if (!API_BASE) {
    return {
      about: { text: '', features: [] },
      services: [],
      works: [],
    };
  }
  const res = await fetch(`${API_BASE}/api/content`);
  if (!res.ok) throw new Error('Failed to load content');
  return res.json();
}
