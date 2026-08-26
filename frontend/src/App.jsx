import { useEffect, useState } from 'react';
import { Activity, Database, LogOut, RotateCcw, StepForward, UserPlus, Users } from 'lucide-react';
import { advanceTick, createSession, createStaffAccount, getCurrentUser, getSession,
  initializeAuth, listStaff, login, logout } from './api/simulationApi.js';

const PUBLIC_LABELS = {
  bankingStability: 'Banking stability', currencyStrength: 'Currency strength', economicActivity: 'Economic activity',
  essentialSupplySecurity: 'Supply security', sovereignCreditworthiness: 'Sovereign credit',
  publicConfidence: 'Public confidence', civilUnrest: 'Civil unrest', pricePressure: 'Price pressure',
  householdPurchasingPower: 'Purchasing power'
};
const HIDDEN_LABELS = {
  bankLiquidity: 'Bank liquidity', bankCapital: 'Bank capital', foreignReserves: 'Foreign reserves',
  fiscalCapacity: 'Fiscal capacity', infrastructureLoanHealth: 'Infrastructure loans',
  importDistributionCapacity: 'Import capacity', externalFinancingAccess: 'External financing',
  depositWithdrawalPressure: 'Withdrawal pressure'
};

export function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState(null);
  const [causal, setCausal] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showStaff, setShowStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeAuth().then(() => getCurrentUser()).then(setUser).catch(() => setUser(null)).finally(() => setAuthReady(true));
  }, []);
  useEffect(() => { if (user) loadInitial(); }, [user]);

  async function loadInitial() {
    setLoading(true); setError('');
    try {
      const savedId = localStorage.getItem('clec-session-id');
      setSession(savedId ? await getSession(savedId) : await createFresh());
    } catch {
      try { setSession(await createFresh()); } catch (caught) { setError(caught.message); }
    } finally { setLoading(false); }
  }
  async function createFresh() {
    const next = await createSession('Browser Crisis Session');
    localStorage.setItem('clec-session-id', next.id); setCausal([]); return next;
  }
  async function step() {
    if (!session) return;
    setLoading(true); setError('');
    try { const result = await advanceTick(session.id); setSession(result.session); setCausal(result.causalRecords); }
    catch (caught) { setError(caught.message); } finally { setLoading(false); }
  }
  async function reset() {
    setLoading(true); setError('');
    try { setSession(await createFresh()); } catch (caught) { setError(caught.message); } finally { setLoading(false); }
  }
  async function signOut() {
    await logout(); setUser(null); setSession(null); setShowStaff(false); localStorage.removeItem('clec-session-id');
  }
  async function openStaff() {
    setError('');
    try { setStaff(await listStaff()); setShowStaff(true); } catch (caught) { setError(caught.message); }
  }

  if (!authReady) return <main className="login-shell"><div className="login-status">Connecting...</div></main>;
  if (!user) return <LoginScreen onLogin={setUser} />;

  const state = session?.state;
  return <main className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">SUUNS / CRISIS ENGINE</span><h1>{session?.name ?? 'Starting crisis session'}</h1>
        <p>Tick {state?.tick ?? 0} · {state?.simulationTimeMinutes ?? 0} simulated minutes · {session?.status ?? 'CONNECTING'}</p></div>
      <div className="user-actions">
        <div className="identity"><strong>{user.displayName}</strong><span>{user.role}</span></div>
        {user.role === 'MASTER' && <button className="icon-button" onClick={openStaff} title="Manage staff"><Users size={18} /></button>}
        <button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={18} /></button>
        <button className="icon-button" onClick={reset} disabled={loading} title="New session"><RotateCcw size={18} /></button>
        <button className="primary-button" onClick={step} disabled={loading || !session}><StepForward size={18} />Advance tick</button>
      </div>
    </header>
    {error && <div className="error">{error}</div>}
    {showStaff && <StaffPanel staff={staff} onClose={() => setShowStaff(false)} onCreated={(created) => setStaff((items) => [...items, created])} />}
    <section className="section-block"><div className="section-heading"><Activity size={18} /><h2>Public indicators</h2></div>
      <div className="indicator-grid">{Object.entries(PUBLIC_LABELS).map(([key, label]) => <Indicator key={key} label={label} value={state?.publicIndicators?.[key]} inverse={key === 'civilUnrest' || key === 'pricePressure'} />)}</div></section>
    <section className="lower-grid">
      <div className="section-block"><div className="section-heading"><Database size={18} /><h2>Hidden state</h2><span className="staff-badge">STAFF</span></div>
        <dl className="hidden-list">{Object.entries(HIDDEN_LABELS).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{format(state?.hiddenVariables?.[key])}</dd></div>)}</dl></div>
      <div className="section-block causal-panel"><div className="section-heading"><h2>Causal ledger</h2><span>{causal.length} entries</span></div>
        <ol className="causal-list">{causal.length === 0 && <li className="empty">Advance a tick to generate the causal record.</li>}
          {causal.map((entry, index) => <li key={`${entry.stage}-${index}`}><span>{entry.stage.replaceAll('_', ' ')}</span><p>{entry.message}</p></li>)}</ol></div>
    </section>
  </main>;
}

function LoginScreen({ onLogin }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try { onLogin(await login(data.get('username'), data.get('password'))); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  return <main className="login-shell"><form className="login-panel" onSubmit={submit}>
    <span className="eyebrow">SUUNS / SECURE ACCESS</span><h1>Staff sign in</h1>
    <label>Username<input name="username" autoComplete="username" required autoFocus /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <div className="form-error">{error}</div>}
    <button className="primary-button" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
  </form></main>;
}

function StaffPanel({ staff, onClose, onCreated }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); const form = event.currentTarget; const data = new FormData(form);
    try { onCreated(await createStaffAccount({ username: data.get('username'), displayName: data.get('displayName'), password: data.get('password') })); form.reset(); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  return <section className="staff-panel"><div className="section-heading"><Users size={18} /><h2>Staff accounts</h2><button className="text-button" onClick={onClose}>Close</button></div>
    <div className="staff-layout"><div className="staff-list">{staff.map((item) => <div key={item.id}><span><strong>{item.displayName}</strong><small>{item.username}</small></span><b>{item.role}</b></div>)}</div>
      <form className="staff-form" onSubmit={submit}><h3>Create staff account</h3>
        <label>Display name<input name="displayName" required /></label><label>Username<input name="username" required autoComplete="off" /></label>
        <label>Temporary password<input name="password" type="password" minLength="10" required autoComplete="new-password" /></label>
        {error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={busy}><UserPlus size={17} />Create staff</button></form></div>
  </section>;
}

function Indicator({ label, value, inverse }) {
  const numeric = value ?? 0; const tone = inverse ? 100 - numeric : numeric;
  return <article className="indicator"><div><span>{label}</span><strong>{format(value)}</strong></div><div className="meter"><i style={{ width: `${numeric}%`, background: tone < 35 ? '#c84c3f' : tone < 65 ? '#d39a32' : '#25866a' }} /></div></article>;
}
function format(value) { return value == null ? '–' : Number(value).toFixed(1); }
