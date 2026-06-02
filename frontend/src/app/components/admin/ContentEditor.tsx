import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Plus, X, ChevronRight } from 'lucide-react';
import { type ContentData, type ContentAbout, type ContentService, type ContentWorks, EMPTY_CONTENT } from '../../context/AppContext';
import { apiRequest } from '../../api';

interface ContentEditorProps {
  initialContent: ContentData;
  onSave: (content: ContentData) => Promise<void>;
  glass: string;
  inputCls: string;
  sub: string;
  primary: string;
  isDark: boolean;
}

type EditorTab = 'about' | 'services' | 'works';

const EMPTY_SERVICE: ContentService = { title: '', subtitle: '', description: '', price: '', features: [], image: '', accent: '#2563eb', category: '' };
const EMPTY_WORK: ContentWorks = { title: '', description: '', image_url: '' };

export function ContentEditor({ initialContent, onSave, glass, inputCls, sub, primary, isDark }: ContentEditorProps) {
  const [tab, setTab] = useState<EditorTab>('about');
  const [content, setContent] = useState<ContentData>(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiRequest<ContentData>('/api/content').then(setContent).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const updateAbout = (patch: Partial<ContentAbout>) => {
    setContent((c) => ({ ...c, about: { ...c.about, ...patch } }));
  };

  const updateService = (i: number, patch: Partial<ContentService>) => {
    setContent((c) => ({
      ...c,
      services: c.services.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    }));
  };

  const addService = () => {
    setContent((c) => ({ ...c, services: [...c.services, { ...EMPTY_SERVICE }] }));
  };

  const removeService = (i: number) => {
    setContent((c) => ({ ...c, services: c.services.filter((_, j) => j !== i) }));
  };

  const addFeature = (i: number) => {
    setContent((c) => ({
      ...c,
      services: c.services.map((s, j) => (j === i ? { ...s, features: [...s.features, ''] } : s)),
    }));
  };

  const updateFeature = (i: number, fi: number, val: string) => {
    setContent((c) => ({
      ...c,
      services: c.services.map((s, j) => (j === i ? { ...s, features: s.features.map((f, k) => (k === fi ? val : f)) } : s)),
    }));
  };

  const removeFeature = (i: number, fi: number) => {
    setContent((c) => ({
      ...c,
      services: c.services.map((s, j) => (j === i ? { ...s, features: s.features.filter((_, k) => k !== fi) } : s)),
    }));
  };

  const updateWork = (i: number, patch: Partial<ContentWorks>) => {
    setContent((c) => ({
      ...c,
      works: c.works.map((w, j) => (j === i ? { ...w, ...patch } : w)),
    }));
  };

  const addWork = () => {
    setContent((c) => ({ ...c, works: [...c.works, { ...EMPTY_WORK }] }));
  };

  const removeWork = (i: number) => {
    setContent((c) => ({ ...c, works: c.works.filter((_, j) => j !== i) }));
  };

  return (
    <div>
      <h2 className="font-semibold mb-1">Контент сайта</h2>
      <p className={`text-xs ${sub} mb-4`}>Изменения отображаются у клиентов и на сайте после сохранения</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: 'about' as EditorTab, label: 'О студии' },
          { id: 'services' as EditorTab, label: 'Услуги' },
          { id: 'works' as EditorTab, label: 'Портфолио' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'text-white' : sub}`}
            style={{ background: tab === t.id ? primary : 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* About tab */}
      {tab === 'about' && (
        <div className="space-y-4">
          <div>
            <label className={`text-xs ${sub} block mb-1`}>Текст (HTML)</label>
            <textarea
              className={`${inputCls} min-h-[200px]`}
              value={content.about.text}
              onChange={(e) => updateAbout({ text: e.target.value })}
              placeholder="<b>Текст о студии</b> с HTML-разметкой..."
            />
          </div>
          <div>
            <label className={`text-xs ${sub} block mb-1`}>Преимущества (список)</label>
            {content.about.features.map((feature, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input className={`${inputCls} flex-1`} value={feature} onChange={(e) => {
                  const next = [...content.about.features];
                  next[i] = e.target.value;
                  updateAbout({ features: next });
                }} placeholder="Преимущество" />
                <button onClick={() => updateAbout({ features: content.about.features.filter((_, j) => j !== i) })} className={`p-2 rounded-xl ${glass}`}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => updateAbout({ features: [...content.about.features, ''] })} className={`flex items-center gap-1 text-xs ${sub} ${glass} px-3 py-2 rounded-xl`}>
              <Plus size={12} /> Добавить преимущество
            </button>
          </div>
        </div>
      )}

      {/* Services tab */}
      {tab === 'services' && (
        <div className="space-y-3">
          {content.services.map((svc, i) => (
            <div key={i} className={`${glass} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{svc.title || `Услуга ${i + 1}`}</span>
                <button onClick={() => removeService(i)} className={`p-1.5 rounded-xl ${glass}`}><X size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className={`text-xs ${sub} block mb-0.5`}>Название</label>
                  <input className={inputCls} value={svc.title} onChange={(e) => updateService(i, { title: e.target.value })} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-0.5`}>Подзаголовок</label>
                  <input className={inputCls} value={svc.subtitle} onChange={(e) => updateService(i, { subtitle: e.target.value })} />
                </div>
              </div>
              <div className="mb-2">
                <label className={`text-xs ${sub} block mb-0.5`}>Описание</label>
                <textarea className={`${inputCls} min-h-[60px]`} value={svc.description} onChange={(e) => updateService(i, { description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <label className={`text-xs ${sub} block mb-0.5`}>Цена</label>
                  <input className={inputCls} value={svc.price} onChange={(e) => updateService(i, { price: e.target.value })} placeholder="От 500 ₽" />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-0.5`}>Категория</label>
                  <input className={inputCls} value={svc.category} onChange={(e) => updateService(i, { category: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-0.5`}>Особенности</label>
                {svc.features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 mb-1">
                    <input className={`${inputCls} flex-1`} value={f} onChange={(e) => updateFeature(i, fi, e.target.value)} />
                    <button onClick={() => removeFeature(i, fi)} className={`p-1.5 rounded-xl ${glass}`}><X size={12} /></button>
                  </div>
                ))}
                <button onClick={() => addFeature(i)} className={`flex items-center gap-1 text-xs ${sub} px-2 py-1 rounded-xl`}>
                  <Plus size={10} /> Добавить
                </button>
              </div>
            </div>
          ))}
          <button onClick={addService} className={`flex items-center gap-2 ${glass} rounded-2xl p-4 w-full text-left ${sub} text-sm`}>
            <Plus size={16} /> Добавить услугу
          </button>
        </div>
      )}

      {/* Works tab */}
      {tab === 'works' && (
        <div className="space-y-3">
          {content.works.map((work, i) => (
            <div key={i} className={`${glass} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{work.title || `Работа ${i + 1}`}</span>
                <button onClick={() => removeWork(i)} className={`p-1.5 rounded-xl ${glass}`}><X size={14} /></button>
              </div>
              <div className="mb-2">
                <label className={`text-xs ${sub} block mb-0.5`}>Название</label>
                <input className={inputCls} value={work.title} onChange={(e) => updateWork(i, { title: e.target.value })} />
              </div>
              <div className="mb-2">
                <label className={`text-xs ${sub} block mb-0.5`}>Описание</label>
                <textarea className={`${inputCls} min-h-[60px]`} value={work.description} onChange={(e) => updateWork(i, { description: e.target.value })} />
              </div>
              <div>
                <label className={`text-xs ${sub} block mb-0.5`}>URL фото</label>
                <input className={inputCls} value={work.image_url} onChange={(e) => updateWork(i, { image_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
          ))}
          <button onClick={addWork} className={`flex items-center gap-2 ${glass} rounded-2xl p-4 w-full text-left ${sub} text-sm`}>
            <Plus size={16} /> Добавить работу
          </button>
        </div>
      )}

      {/* Save button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${primary}, #0066CC)` }}
      >
        <Save size={16} />
        {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить контент'}
      </motion.button>
    </div>
  );
}
