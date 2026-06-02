import { useState, useEffect } from 'react';
import { fetchContent, ContentData } from '../api';

export function useContent() {
  const [content, setContent] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent()
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, []);

  return { content, loading };
}
