import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sun, Moon, Shield, Eye, EyeOff, X, Car, Phone, User, Hash,
  ChevronRight, AlertCircle, Check, Wrench, BarChart3, LogIn
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppProvider, Role, useApp } from './context/AppContext';
import { ClientApp } from './components/client/ClientApp';
import { AdminApp } from './components/admin/AdminApp';
import { WorkerApp } from './components/worker/WorkerApp';
import { OwnerApp } from './components/owner/OwnerApp';
import {
  normalizePersonName,
  normalizePlateInput,
  normalizeVehicleInput,
  validatePersonName,
  validatePhoneValue,
  validatePlateValue,
  validateVehicleName,
} from './utils/validation';

function WelcomeScreen() {
  const { isDark, toggleTheme, loginClient, loginStaff, loginPrimaryOwnerViaTelegram, authLoading } = useApp();

  const [step, setStep] = useState<'greeting' | 'form'>('greeting');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffLogin, setStaffLogin] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffTwoFactorCode, setStaffTwoFactorCode] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [clientError, setClientError] = useState('');

  const [form, setForm] = useState({ name: '', phone: '', car: '', plate: '' });
  const canUseTelegramOwnerLogin = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initData);

  const bg = isDark ? 'bg-[#0B1226]' : 'bg-gradient-to-br from-[#E8F0FE] via-[#F6F7FA] to-[#E0F2FE]';
  const text = isDark ? 'text-[#E6EEF8]' : 'text-[#0B1226]';
  const sub = isDark ? 'text-[#9AA6B2]' : 'text-[#6B7280]';
  const primary = isDark ? '#4AA8FF' : '#0A84FF';
  const glass = isDark
    ? 'bg-white/5 backdrop-blur-md border border-white/10'
    : 'bg-white/80 backdrop-blur-md border border-white/60 shadow-lg';
  const inputCls = `${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-white/90 border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-2xl px-4 py-3.5 w-full text-sm outline-none focus:ring-2 transition-all`;
  const validate = () => {
    const errors: Record<string, string> = {};
    const nameError = validatePersonName(form.name);
    const phoneError = validatePhoneValue(form.phone);
    const carError = validateVehicleName(form.car);
    const plateError = validatePlateValue(form.plate);

    if (nameError) errors.name = nameError;
    if (phoneError) errors.phone = phoneError;
    if (carError) errors.car = carError;
    if (plateError) errors.plate = plateError;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClientSubmit = async () => {
    if (!validate()) return;
    try {
      setClientError('');
      await loginClient({
        name: normalizePersonName(form.name),
        phone: form.phone.trim(),
        car: normalizeVehicleInput(form.car),
        plate: normalizePlateInput(form.plate),
        registered: true,
      });
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Не удалось зарегистрировать клиента';
      setClientError(message);
    }
  };

const handleStaffLogin = async () => {
    setStaffError('');
    try {
      await loginStaff(staffLogin.toLowerCase().trim(), staffPassword, staffTwoFactorCode.trim() || undefined);
      setShowStaffModal(false);
      setStaffTwoFactorCode('');
      setNeedsTwoFactor(false);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'Не удалось выполнить вход';
      setStaffError(message);
      if (message.toLowerCase().includes('код') || message.toLowerCase().includes('telegram')) {
        setNeedsTwoFactor(true);
      }
    }
  };

  const handlePrimaryOwnerLogin = async () => {
    setStaffError('');
    try {
      await loginPrimaryOwnerViaTelegram();
      setShowStaffModal(false);
      setStaffTwoFactorCode('');
      setNeedsTwoFactor(false);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕР№С‚Рё РєР°Рє СЃРѕР·РґР°С‚РµР»СЊ';
      setStaffError(message);
    }
  };

  return (
    <div className={`${isDark ? 'dark' : ''} ${bg} ${text} min-h-screen flex flex-col relative overflow-hidden`}>
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: primary }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: '#A855F7' }} />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg" style={{ background: primary }}>A</div>
          <span className="font-bold tracking-wide text-sm">ATMOSFERA</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className={`p-2 rounded-xl ${glass}`}>{isDark ? <Sun size={16} /> : <Moon size={16} />}</button>
          {/* Staff entrance — small discrete button */}
          <button
            onClick={() => setShowStaffModal(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${glass} ${sub} transition-all hover:opacity-80`}
          >
            <Shield size={13} />
            <span>Служебный</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-8 relative z-10">
        <AnimatePresence mode="wait">

          {/* ── GREETING STEP ── */}
          {step === 'greeting' && (
            <motion.div key="greeting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-sm text-center">
              {/* Logo */}
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl text-white text-4xl font-bold"
                style={{ background: `linear-gradient(135deg, ${primary}, #A855F7)` }}>
                A
              </motion.div>

              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-bold mb-2">
                Добро пожаловать!
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className={`text-sm ${sub} mb-8 leading-relaxed`}>
                Запишитесь на услуги автосервиса<br />быстро и удобно
              </motion.p>

              {/* Feature chips */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="grid grid-cols-3 gap-2 mb-8">
                {[
                  { icon: '🔧', label: 'Ремонт' },
                  { icon: '✨', label: 'Детейлинг' },
                  { icon: '🚗', label: 'Мойка' },
                ].map(f => (
                  <div key={f.label} className={`${glass} rounded-2xl p-3 flex flex-col items-center gap-1`}>
                    <span className="text-xl">{f.icon}</span>
                    <span className={`text-xs ${sub}`}>{f.label}</span>
                  </div>
                ))}
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep('form')}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base shadow-lg flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${primary}, #0066CC)` }}
              >
                Начать
                <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {/* ── FORM STEP ── */}
          {step === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="w-full max-w-sm">
              <button onClick={() => setStep('greeting')} className={`flex items-center gap-1 text-sm ${sub} mb-5`}>
                ← Назад
              </button>

              <h2 className="text-xl font-bold mb-1">Ваши данные</h2>
              <p className={`text-sm ${sub} mb-6`}>Заполните один раз — они сохранятся в вашем профиле</p>

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <div className="relative">
                    <User size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input
                      className={`${inputCls} pl-11 ${formErrors.name ? 'border-red-400 ring-red-400/20' : ''}`}
                      placeholder="Ваше имя"
                      value={form.name}
                      onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setFormErrors(p => ({ ...p, name: '' })); setClientError(''); }}
                    />
                  </div>
                  {formErrors.name && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <div className="relative">
                    <Phone size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input
                      className={`${inputCls} pl-11 ${formErrors.phone ? 'border-red-400' : ''}`}
                      placeholder="+7 (___) ___-__-__"
                      type="tel"
                      value={form.phone}
                      onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: '' })); setClientError(''); }}
                    />
                  </div>
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.phone}</p>}
                </div>

                {/* Car */}
                <div>
                  <div className="relative">
                    <Car size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input
                      className={`${inputCls} pl-11 ${formErrors.car ? 'border-red-400' : ''}`}
                      placeholder="Марка и модель (Lada Vesta)"
                      value={form.car}
                      onChange={e => { setForm(p => ({ ...p, car: e.target.value })); setFormErrors(p => ({ ...p, car: '' })); setClientError(''); }}
                    />
                  </div>
                  {formErrors.car && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.car}</p>}
                </div>

                {/* Plate */}
                <div>
                  <div className="relative">
                    <Hash size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 ${sub}`} />
                    <input
                      className={`${inputCls} pl-11 uppercase ${formErrors.plate ? 'border-red-400' : ''}`}
                      placeholder="Гос. номер (У999УУ)"
                      maxLength={6}
                      value={form.plate}
                      onChange={e => { setForm(p => ({ ...p, plate: normalizePlateInput(e.target.value) })); setFormErrors(p => ({ ...p, plate: '' })); setClientError(''); }}
                    />
                  </div>
                  {formErrors.plate && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.plate}</p>}
                </div>
              </div>

              {clientError && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-xs mt-4 mb-1">
                  <AlertCircle size={13} />{clientError}
                </motion.div>
              )}

              {/* Privacy note */}
              <p className={`text-xs ${sub} text-center mt-4 mb-5 leading-relaxed`}>
                Данные используются только для записи на услуги и не передаются третьим лицам
              </p>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleClientSubmit}
                disabled={authLoading}
                className="w-full py-4 rounded-2xl font-semibold text-white text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: `linear-gradient(135deg, ${primary}, #0066CC)` }}
              >
                <Check size={18} />
                {authLoading ? 'Подключение...' : 'Сохранить и продолжить'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── STAFF LOGIN MODAL ── */}
      <AnimatePresence>
        {showStaffModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowStaffModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`fixed inset-0 z-50 flex items-center justify-center px-5`}
            >
              <div className={`${isDark ? 'bg-[#0E1624]' : 'bg-white'} rounded-3xl p-6 w-full max-w-sm shadow-2xl`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${primary}18` }}>
                      <Shield size={18} style={{ color: primary }} />
                    </div>
                    <div>
                      <div className="font-semibold">Служебный вход</div>
                      <div className={`text-xs ${sub}`}>Только для сотрудников</div>
                    </div>
                  </div>
                  <button onClick={() => { setShowStaffModal(false); setStaffError(''); setStaffLogin(''); setStaffPassword(''); setStaffTwoFactorCode(''); setNeedsTwoFactor(false); }} className={`p-1.5 rounded-xl ${glass}`}>
                    <X size={16} />
                  </button>
                </div>

                {/* Roles hint */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { icon: Shield, label: 'Админ', login: 'admin', color: '#A855F7' },
                    { icon: Wrench, label: 'Мастер', login: 'ivan', color: '#34C759' },
                    { icon: BarChart3, label: 'Владелец', login: 'owner', color: '#FF9500' },
                  ].map(r => (
                    <button
                      key={r.login}
                      onClick={() => { setStaffLogin(r.login); setStaffPassword(''); setStaffTwoFactorCode(''); setNeedsTwoFactor(false); setStaffError(''); }}
                      className={`p-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all ${staffLogin === r.login ? 'ring-2' : ''}`}
                      style={{
                        background: `${r.color}15`,
                        ringColor: r.color,
                        ...(staffLogin === r.login ? { outline: `2px solid ${r.color}`, outlineOffset: '-2px' } : {})
                      }}
                    >
                      <r.icon size={16} style={{ color: r.color }} />
                      <span className="text-xs font-medium">{r.label}</span>
                    </button>
                  ))}
                </div>

                {canUseTelegramOwnerLogin && (
                  <button
                    onClick={() => void handlePrimaryOwnerLogin()}
                    disabled={authLoading}
                    className="w-full mb-5 py-3 rounded-2xl font-semibold text-sm text-white disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, ${primary}, #0066CC)` }}
                  >
                    <LogIn size={16} />
                    Войти как создатель через Telegram
                  </button>
                )}

                <div className="space-y-3 mb-4">
                  <div>
                    <label className={`text-xs ${sub} block mb-1.5`}>Логин</label>
                    <input
                      className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`}
                      placeholder="admin / ivan / oleg / owner"
                      value={staffLogin}
                      onChange={e => { setStaffLogin(e.target.value); setStaffError(''); setStaffTwoFactorCode(''); setNeedsTwoFactor(false); }}
                      onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${sub} block mb-1.5`}>Пароль</label>
                    <div className="relative">
                      <input
                        className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none pr-10`}
                        placeholder="Пароль"
                        type={showPass ? 'text' : 'password'}
                        value={staffPassword}
                        onChange={e => { setStaffPassword(e.target.value); setStaffError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                      />
                      <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        {showPass ? <EyeOff size={14} className={sub} /> : <Eye size={14} className={sub} />}
                      </button>
                    </div>
                  </div>
                  {needsTwoFactor && (
                    <div>
                      <label className={`text-xs ${sub} block mb-1.5`}>Код из Telegram</label>
                      <input
                        className={`${isDark ? 'bg-white/5 border-white/10 text-[#E6EEF8] placeholder-white/30' : 'bg-gray-50 border-black/10 text-[#0B1226] placeholder-gray-400'} border rounded-xl px-3 py-2.5 w-full text-sm outline-none`}
                        placeholder="6 цифр"
                        inputMode="numeric"
                        maxLength={6}
                        value={staffTwoFactorCode}
                        onChange={e => { setStaffTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setStaffError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
                      />
                    </div>
                  )}
                </div>

                {staffError && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-red-500 text-xs mb-3">
                    <AlertCircle size={13} />{staffError}
                  </motion.div>
                )}

                {/* Credentials hint */}
                <div className={`${isDark ? 'bg-white/3' : 'bg-gray-50'} rounded-xl p-3 mb-4`}>
                  <div className={`text-xs ${sub} mb-1 font-medium`}>Тестовые данные:</div>
                  <div className={`text-xs ${sub} space-y-0.5`}>
                    <div>admin / <span className="font-mono">admin</span></div>
                    <div>ivan или oleg / <span className="font-mono">master</span></div>
                    <div>owner / <span className="font-mono">owner</span></div>
                  </div>
                </div>

                <button
                  onClick={handleStaffLogin}
                  disabled={!staffLogin || !staffPassword || authLoading || (needsTwoFactor && staffTwoFactorCode.length !== 6)}
                  className="w-full py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: primary }}
                >
                  <LogIn size={16} />
                  {authLoading ? 'Вход...' : 'Войти'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppContent() {
  const { isDark, session, logout, loading } = useApp();

  if (loading) {
    return <div className={`${isDark ? 'dark bg-[#0B1226] text-[#E6EEF8]' : 'bg-[#F6F7FA] text-[#0B1226]'} min-h-screen flex items-center justify-center text-sm`}>Загрузка...</div>;
  }

  if (!session) {
    return <WelcomeScreen />;
  }

  return (
    <div className={`${isDark ? 'dark' : ''} relative`}>
      {/* Logout pill — for non-clients it shows role info */}
      <div className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none">
        <motion.button
          initial={{ y: -40 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300 }}
          onClick={logout}
          className="pointer-events-auto mt-1 px-3 py-1 rounded-full text-xs text-white/80 bg-black/30 backdrop-blur-sm"
        >
          ← {session.role === 'client' ? 'Сменить данные' : 'Выйти'}
        </motion.button>
      </div>
      <AnimatePresence mode="wait">
        {session.role === 'client' && (
          <motion.div key="client" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
            <ClientApp />
          </motion.div>
        )}
        {session.role === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
            <AdminApp />
          </motion.div>
        )}
        {session.role === 'worker' && (
          <motion.div key="worker" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
            <WorkerApp />
          </motion.div>
        )}
        {session.role === 'owner' && (
          <motion.div key="owner" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
            <OwnerApp />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <SpeedInsights />
    </AppProvider>
  );
}
