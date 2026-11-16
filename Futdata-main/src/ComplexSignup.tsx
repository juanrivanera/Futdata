import React, {useRef, useState} from 'react';
import {addDoc, collection, serverTimestamp} from 'firebase/firestore';
import {db} from './lib/firebase';
import {ArrowLeft, Eye, CalendarClock, ClipboardList, NotebookPen, LayoutGrid, CheckCircle2, Building2} from 'lucide-react';

// Pantalla pública "Quiero registrar mi complejo". Solo guarda una solicitud en la colección
// complexRequests: no crea cuentas ni da permisos. La aprobación sigue siendo manual.
const field = 'w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none focus:border-[#238636]';
const benefits = [
  {icon: Eye, text: 'Mayor visibilidad frente a jugadores que buscan canchas.'},
  {icon: CalendarClock, text: 'Gestión de horarios y disponibilidad.'},
  {icon: ClipboardList, text: 'Administración de reservas.'},
  {icon: NotebookPen, text: 'Registro de reservas externas.'},
  {icon: LayoutGrid, text: 'Organización centralizada de las canchas del complejo.'},
];
const EMPTY = {complexName: '', managerName: '', email: '', phone: '', zone: '', courts: '', message: ''};
// Protección básica contra envíos abusivos desde el navegador (las reglas de Firestore validan el resto).
const COOLDOWN_MS = 10 * 60 * 1000;
const MIN_FILL_MS = 4000;
const COOLDOWN_KEY = 'futdata-solicitud-complejo';
const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
const PHONE_RE = /^[0-9 +()-]{6,25}$/;

function lastSent() {
  try { return Number(localStorage.getItem(COOLDOWN_KEY)) || 0; } catch { return 0; }
}

export function ComplexSignup({onBack}: {onBack: () => void}) {
  const [form, setForm] = useState(EMPTY);
  const [website, setWebsite] = useState(''); // campo trampa: invisible para personas
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const openedAt = useRef(Date.now());
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({...form, [k]: e.target.value});

  function validate() {
    const courts = Number(form.courts);
    if (!form.complexName.trim() || !form.managerName.trim() || !form.email.trim() || !form.phone.trim() || !form.zone.trim() || !form.courts) return 'Completá todos los campos obligatorios.';
    if (!EMAIL_RE.test(form.email.trim().toLowerCase())) return 'Revisá el correo electrónico.';
    if (!PHONE_RE.test(form.phone.trim())) return 'Revisá el teléfono de contacto.';
    if (!Number.isInteger(courts) || courts < 1 || courts > 50) return 'La cantidad de canchas debe ser un número entre 1 y 50.';
    return '';
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const problem = validate();
    if (problem) { setError(problem); return; }
    if (Date.now() - lastSent() < COOLDOWN_MS) { setError('Ya enviaste una solicitud hace pocos minutos. Si necesitás corregir algo, esperá un momento y volvé a intentarlo.'); return; }
    if (Date.now() - openedAt.current < MIN_FILL_MS) { setError('Revisá los datos y volvé a presionar «Solicitar registro».'); return; }
    // Un robot que completa el campo oculto recibe la misma respuesta, pero no se guarda nada.
    if (website) { setSent(true); return; }
    setBusy(true); setError('');
    try {
      await addDoc(collection(db, 'complexRequests'), {
        complexName: form.complexName.trim().slice(0, 100),
        managerName: form.managerName.trim().slice(0, 100),
        email: form.email.trim().toLowerCase().slice(0, 100),
        phone: form.phone.trim().slice(0, 25),
        zone: form.zone.trim().slice(0, 100),
        courts: Number(form.courts),
        message: form.message.trim().slice(0, 1000),
        status: 'pendiente',
        createdAt: serverTimestamp(),
      });
      try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* sin almacenamiento local */ }
      setSent(true); setForm(EMPTY);
    } catch (err) {
      console.error('[FutData] No se pudo guardar la solicitud del complejo:', err);
      setError('No pudimos enviar la solicitud. Intentá nuevamente en unos minutos.');
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E1E4E8] px-6 py-8 max-md:px-4 max-md:pt-[calc(1.5rem+env(safe-area-inset-top))] max-md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-10 max-md:mb-8">
          <button onClick={onBack} className="text-sm text-[#7ee2a3] flex items-center gap-1 max-md:py-2"><ArrowLeft size={15}/>Volver</button>
          <div className="flex items-center gap-2"><div className="w-8 h-8 bg-[#238636] rounded-lg flex items-center justify-center font-black">F</div><span className="font-black uppercase tracking-tight">FutData <span className="text-[#7ee2a3]">Complejos</span></span></div>
        </div>

        <header className="mb-10 max-md:mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7ee2a3] font-mono mb-3">Quiero registrar mi complejo</p>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight leading-[0.95] max-md:text-4xl">Sumá tu complejo a FutData</h1>
          <p className="text-[#8B949E] text-lg mt-4 max-w-2xl max-md:text-base">Gestioná tus canchas, organizá tus reservas y llegá a más jugadores desde un solo lugar.</p>
        </header>

        <div className="grid md:grid-cols-[1fr_1.1fr] gap-6 items-start">
          <div className="space-y-6">
            <section className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 max-md:p-5">
              <h2 className="font-black uppercase text-lg mb-4">Beneficios</h2>
              <ul className="space-y-3">{benefits.map(({icon: Icon, text}) => <li key={text} className="flex items-start gap-3 text-sm"><span className="w-8 h-8 shrink-0 rounded-lg bg-[#238636]/15 text-[#7ee2a3] flex items-center justify-center"><Icon size={16}/></span><span className="pt-1.5">{text}</span></li>)}</ul>
            </section>
            <section className="bg-[#161B22] border border-[#238636]/60 rounded-2xl p-6 max-md:p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[#8B949E] mb-2">Plan para complejos</p>
              <p className="text-4xl font-black max-md:text-3xl">$29.900 <span className="text-base font-bold text-[#8B949E]">ARS por mes</span></p>
              <p className="text-xs text-[#8B949E] mt-3">Precio de lanzamiento propuesto. Sujeto a ajustes.</p>
            </section>
          </div>

          <section className="bg-[#161B22] border border-[#30363D] rounded-2xl p-6 max-md:p-5">
            {sent ? (
              <div className="text-center py-8" role="status">
                <CheckCircle2 size={40} className="text-[#7ee2a3] mx-auto mb-4"/>
                <h2 className="text-2xl font-black mb-2">Solicitud enviada</h2>
                <p className="text-sm text-[#8B949E]">Gracias. El equipo de FutData revisará los datos y se comunicará con vos para habilitar el acceso del complejo.</p>
                <button onClick={onBack} className="mt-6 px-5 py-3 bg-[#238636] hover:bg-[#2ea043] rounded-xl font-bold text-sm">Volver al inicio</button>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="space-y-3">
                <h2 className="font-black uppercase text-lg flex items-center gap-2 mb-1"><Building2 size={18} className="text-[#7ee2a3]"/>Solicitud de registro</h2>
                <input className={field} maxLength={100} placeholder="Nombre del complejo" aria-label="Nombre del complejo" value={form.complexName} onChange={set('complexName')}/>
                <input className={field} maxLength={100} autoComplete="name" placeholder="Nombre y apellido del responsable" aria-label="Nombre y apellido del responsable" value={form.managerName} onChange={set('managerName')}/>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className={field} maxLength={100} type="email" autoComplete="email" placeholder="Correo electrónico" aria-label="Correo electrónico" value={form.email} onChange={set('email')}/>
                  <input className={field} maxLength={25} type="tel" autoComplete="tel" placeholder="Teléfono de contacto" aria-label="Teléfono de contacto" value={form.phone} onChange={set('phone')}/>
                  <input className={field} maxLength={100} placeholder="Localidad o zona" aria-label="Localidad o zona" value={form.zone} onChange={set('zone')}/>
                  <input className={field} type="number" min={1} max={50} inputMode="numeric" placeholder="Cantidad de canchas" aria-label="Cantidad de canchas" value={form.courts} onChange={set('courts')}/>
                </div>
                <textarea className={field + ' min-h-[96px] resize-y'} maxLength={1000} placeholder="Mensaje (opcional)" aria-label="Mensaje (opcional)" value={form.message} onChange={set('message')}/>
                <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden"><label>No completar<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)}/></label></div>
                {error && <p role="alert" className="text-sm text-[#f85149]">{error}</p>}
                <button type="submit" disabled={busy} className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded-xl py-3 font-bold">{busy ? 'Enviando...' : 'Solicitar registro'}</button>
                <p className="text-xs text-[#8B949E]">Los datos se usan solo para contactarte. Las cuentas de complejos se habilitan manualmente después de revisar cada solicitud.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
