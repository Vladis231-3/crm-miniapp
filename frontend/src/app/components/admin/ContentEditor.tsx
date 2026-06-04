import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Save, Plus, X, Image, Loader2, Upload, AlertCircle } from 'lucide-react';
import { type ContentData, type ContentHero, type ContentAbout, type ContentService, type ContentWorks, type ContentStats } from '../../context/AppContext';
import { apiRequest, apiUploadFile } from '../../api';

interface ContentEditorProps {
  initialContent: ContentData;
  onSave: (content: ContentData) => Promise<void>;
  glass: string;
  inputCls: string;
  sub: string;
  primary: string;
  isDark: boolean;
}

type EditorTab = 'hero' | 'about' | 'services' | 'works';

const EMPTY_SERVICE: ContentService = { title: '', subtitle: '', description: '', price: '', features: [], image: '', accent: '#2563eb', category: '' };
const EMPTY_WORK: ContentWorks = { title: '', description: '', image_url: '' };
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function ImageUploader({ current, onUpload, label, glass, sub }: { current: string; onUpload: (url: string) => void; label: string; glass: string; sub: string }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await apiUploadFile(file);
      onUpload(result.url);
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const src = current.startsWith('http') ? current : current.startsWith('/') ? `${API_BASE}${current}` : current;

  return (
    <div>
      <label className={`text-xs ${sub} block mb-1`}>{label}</label>
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/10 shrink-0 flex items-center justify-center">
          {current ? (
            <img src={src} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <Image size={24} className={sub} />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            type="text"
            className={`${glass} border-none rounded-xl px-3 py-2 w-full text-sm outline-none`}
            value={current}
            onChange={(e) => onUpload(e.target.value)}
            placeholder="URL изображения или загрузите файл"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl ${glass} cursor-pointer disabled:opacity-50`}
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {uploading ? 'Загрузка...' : 'Загрузить файл'}
            </button>
            {current && (
              <button
                type="button"
                onClick={() => onUpload('')}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl ${glass} cursor-pointer`}
              >
                <X size={12} /> Очистить
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      </div>
    </div>
  );
}

export function ContentEditor({ initialContent, onSave, glass, inputCls, sub, primary, isDark }: ContentEditorProps) {
  const [tab, setTab] = useState<EditorTab>('hero');
  const [content, setContent] = useState<ContentData>(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    apiRequest<ContentData>('/api/content').then(setContent).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await onSave(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const updateHero = (patch: Partial<ContentHero>) => {
    setContent((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
  };

  const updateStat = (i: number, patch: Partial<ContentStats>) => {
    setContent((c) => ({
      ...c,
      hero: { ...c.hero, stats: c.hero.stats.map((s, j) => (j === i ? { ...s, ...patch } : s)) },
    }));
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
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {[
          { id: 'hero' as EditorTab, label: 'Главный экран' },
          { id: 'about' as EditorTab, label: 'О студии' },
          { id: 'services' as EditorTab, label: 'Услуги' },
          { id: 'works' as EditorTab, label: 'Портфолио' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'text-white' : sub}`}
            style={{ background: tab === t.id ? primary : 'transparent' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Hero tab */}
      {tab === 'hero' && (
        <div className="space-y-4">
          <ImageUploader current={content.hero.backgroundImage} onUpload={(url) => updateHero({ backgroundImage: url })} label="Фоновое изображение" glass={glass} sub={sub} />

          <div>
            <label className={`text-xs ${sub} block mb-1`}>Текст бейджа</label>
            <input className={inputCls} value={content.hero.badgeText} onChange={(e) => updateHero({ badgeText: e.target.value })} placeholder="ATMOSFERA ДЕТЕЙЛИНГ" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Заголовок (до выделения)</label>
              <input className={inputCls} value={content.hero.title.split(content.hero.titleHighlight)[0] || content.hero.title} onChange={(e) => {
                const before = e.target.value;
                const after = content.hero.title.split(content.hero.titleHighlight).slice(1).join(content.hero.titleHighlight);
                updateHero({ title: before + content.hero.titleHighlight + after });
              }} placeholder="Ваш автомобиль заслуживает " />
            </div>
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Выделенная часть</label>
              <input className={inputCls} value={content.hero.titleHighlight} onChange={(e) => {
                const hl = e.target.value;
                const parts = content.hero.title.split(content.hero.titleHighlight);
                updateHero({ titleHighlight: hl, title: parts[0] + hl + parts.slice(1).join(content.hero.titleHighlight) });
              }} placeholder="лучшего" />
            </div>
          </div>

          <div>
            <label className={`text-xs ${sub} block mb-1`}>Подзаголовок</label>
            <textarea className={`${inputCls} min-h-[60px]`} value={content.hero.subtitle} onChange={(e) => updateHero({ subtitle: e.target.value })} placeholder="Премиум мойка и детейлинг..." />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Кнопка 1 — текст</label>
              <input className={inputCls} value={content.hero.button1Text} onChange={(e) => updateHero({ button1Text: e.target.value })} placeholder="Наши услуги" />
            </div>
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Кнопка 1 — ID секции</label>
              <input className={inputCls} value={content.hero.button1Action} onChange={(e) => updateHero({ button1Action: e.target.value })} placeholder="services" />
            </div>
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Кнопка 2 — текст</label>
              <input className={inputCls} value={content.hero.button2Text} onChange={(e) => updateHero({ button2Text: e.target.value })} placeholder="Записаться" />
            </div>
            <div>
              <label className={`text-xs ${sub} block mb-1`}>Кнопка 2 — ID секции</label>
              <input className={inputCls} value={content.hero.button2Action} onChange={(e) => updateHero({ button2Action: e.target.value })} placeholder="contact" />
            </div>
          </div>

          <div>
            <label className={`text-xs ${sub} block mb-1`}>Статистика (3 шт.)</label>
            <div className="space-y-2">
              {content.hero.stats.map((stat, i) => (
                <div key={i} className={`${glass} rounded-2xl p-3`}>
                  <div className="text-xs font-medium mb-2">Статистика {i + 1}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-[11px] ${sub} block mb-0.5`}>Значение</label>
                      <input className={inputCls} value={stat.value} onChange={(e) => updateStat(i, { value: e.target.value })} placeholder="4.9" />
                    </div>
                    <div>
                      <label className={`text-[11px] ${sub} block mb-0.5`}>Подпись</label>
                      <input className={inputCls} value={stat.label} onChange={(e) => updateStat(i, { label: e.target.value })} placeholder="Средний рейтинг" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* About tab */}
      {tab === 'about' && (
        <div className="space-y-4">
          <ImageUploader current={content.about.image} onUpload={(url) => updateAbout({ image: url })} label="Фото студии" glass={glass} sub={sub} />

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
              <div className="space-y-2">
                <div>
                  <label className={`text-xs ${sub} block mb-0.5`}>Название</label>
                  <input className={inputCls} value={work.title} onChange={(e) => updateWork(i, { title: e.target.value })} />
                </div>
                <div>
                  <label className={`text-xs ${sub} block mb-0.5`}>Описание</label>
                  <textarea className={`${inputCls} min-h-[60px]`} value={work.description} onChange={(e) => updateWork(i, { description: e.target.value })} />
                </div>
                <ImageUploader current={work.image_url} onUpload={(url) => updateWork(i, { image_url: url })} label="Фото работы" glass={glass} sub={sub} />
              </div>
            </div>
          ))}
          <button onClick={addWork} className={`flex items-center gap-2 ${glass} rounded-2xl p-4 w-full text-left ${sub} text-sm`}>
            <Plus size={16} /> Добавить работу
          </button>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div className="flex items-start gap-2 text-red-500 text-xs mt-3 p-3 rounded-xl bg-red-500/10">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{saveError}</span>
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
