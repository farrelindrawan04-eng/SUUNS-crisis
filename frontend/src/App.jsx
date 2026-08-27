import { useEffect, useState } from 'react';
import { Activity, Archive, ArrowLeft, Bell, ChevronDown, ChevronUp, Database, Globe2, Inbox, LogOut, MessageSquare, Plus,
  RefreshCw, RotateCcw, Route, Send, ShieldCheck, StepForward, Trash2, TrendingDown, TrendingUp, UserPlus, Users, Zap } from 'lucide-react';
import { advanceTick, createSession, createStaffAccount, createTrack, getCurrentUser, getSession,
  initializeAuth, listStaff, listTracks, listSessions, login, logout, listDelegates, createDelegate, listDirectives,
  respondToDirective, updateDirectiveStatus, getDelegateProfile, listMyDirectives, createDirective,
  replyAsDelegate, listPublicFeed, listStaffFeed, createFeedCard, updateFeedCard,
  subscribeToPublicFeed, getDelegateSituation, submitDirectiveAction, deleteStaffAccount, deleteDelegate } from './api/simulationApi.js';

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
  const [tracks, setTracks] = useState([]);
  const [causal, setCausal] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showStaff, setShowStaff] = useState(false);
  const [showOperations, setShowOperations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    initializeAuth().then(() => getCurrentUser()).then(setUser).catch(() => setUser(null)).finally(() => setAuthReady(true));
  }, []);
  useEffect(() => { if (user && user.role !== 'DELEGATE') loadInitial(); }, [user]);

  async function loadInitial() {
    setLoading(true); setError('');
    try {
      const catalog = await listTracks(); setTracks(catalog);
      const savedId = localStorage.getItem('clec-session-id');
      if (savedId) {
        try {
          const saved = await getSession(savedId);
          if (saved.track) setSession(saved); else localStorage.removeItem('clec-session-id');
        } catch {
          localStorage.removeItem('clec-session-id');
          const existing = await listSessions(); const latest = existing.find((item) => item.track);
          if (latest) { localStorage.setItem('clec-session-id', latest.id); setSession(latest); }
        }
      } else {
        const existing = await listSessions();
        const latest = existing.find((item) => item.track);
        if (latest) { localStorage.setItem('clec-session-id', latest.id); setSession(latest); }
      }
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }
  async function beginTrack(trackId) {
    setLoading(true); setError('');
    try {
      const next = await createSession('Browser Crisis Session', trackId);
      localStorage.setItem('clec-session-id', next.id); setCausal([]); setSession(next);
    } catch (caught) { setError(caught.message); }
    finally { setLoading(false); }
  }
  async function step() {
    if (!session) return;
    setLoading(true); setError('');
    try { const result = await advanceTick(session.id); setSession(result.session); setCausal(result.causalRecords); }
    catch (caught) { setError(caught.message); } finally { setLoading(false); }
  }
  function reset() { localStorage.removeItem('clec-session-id'); setSession(null); setCausal([]); }
  async function signOut() {
    await logout(); setUser(null); setSession(null); setShowStaff(false); setShowOperations(false);
  }
  async function openStaff() {
    setError('');
    try { setStaff(await listStaff()); setShowStaff(true); } catch (caught) { setError(caught.message); }
  }
  async function addTrack(input) {
    const created = await createTrack(input); setTracks((items) => [...items, created]); return created;
  }

  if (!authReady) return <main className="login-shell"><div className="login-status">Connecting...</div></main>;
  if (!user) return <LoginScreen onLogin={setUser} />;
  if (user.role === 'DELEGATE') return <DelegatePortal user={user} onLogout={signOut} />;
  if (!session) return <TrackSetup user={user} tracks={tracks} loading={loading} error={error}
    onBegin={beginTrack} onCreate={addTrack} onLogout={signOut} />;

  const state = session.state;
  return <main className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">SUUNS / CRISIS ENGINE</span><h1>{session.name}</h1>
        <p>Tick {state.tick} · {state.simulationTimeMinutes} simulated minutes · {session.status}</p></div>
      <div className="user-actions">
        <div className="identity"><strong>{user.displayName}</strong><span>{user.role}</span></div>
        {user.role === 'MASTER' && <button className="icon-button" onClick={openStaff} title="Manage staff"><Users size={18} /></button>}
        <button className="icon-button" onClick={() => setShowOperations(true)} title="Directive management"><Inbox size={18} /></button>
        <button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={18} /></button>
        <button className="icon-button" onClick={reset} disabled={loading} title="Choose another track"><RotateCcw size={18} /></button>
        <button className="primary-button" onClick={step} disabled={loading}><StepForward size={18} />Advance tick</button>
      </div>
    </header>
    {error && <div className="error">{error}</div>}
    {showStaff && <StaffPanel staff={staff} onClose={() => setShowStaff(false)} onCreated={(created) => setStaff((items) => [...items, created])} onDeleted={(id)=>setStaff((items)=>items.filter((item)=>item.id!==id))} />}
    {showOperations && <OperationsWorkspace session={session} onClose={() => setShowOperations(false)} />}
    <section className="active-track"><Route size={18} /><div><span>ACTIVE TRACK</span><strong>{session.track.name}</strong><p>{session.track.description}</p></div><b>{session.track.direction.replaceAll('_', ' ')}</b></section>
    <section className="section-block"><div className="section-heading"><Activity size={18} /><h2>Public indicators</h2></div>
      <div className="indicator-grid">{Object.entries(PUBLIC_LABELS).map(([key, label]) => <Indicator key={key} label={label} value={state.publicIndicators[key]} inverse={key === 'civilUnrest' || key === 'pricePressure'} />)}</div></section>
    <section className="lower-grid">
      <div className="section-block"><div className="section-heading"><Database size={18} /><h2>Hidden state</h2><span className="staff-badge">STAFF</span></div>
        <dl className="hidden-list">{Object.entries(HIDDEN_LABELS).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{format(state.hiddenVariables[key])}</dd></div>)}</dl></div>
      <div className="section-block causal-panel"><div className="section-heading"><h2>Causal ledger</h2><span>{causal.length} entries</span></div>
        <ol className="causal-list">{causal.length === 0 && <li className="empty">Advance a tick to generate the causal record.</li>}
          {causal.map((entry, index) => <li key={`${entry.stage}-${index}`}><span>{entry.sourceType} / {entry.stage.replaceAll('_', ' ')}</span><p>{entry.message}</p></li>)}</ol></div>
    </section>
  </main>;
}

function TrackSetup({ user, tracks, loading, error, onBegin, onCreate, onLogout }) {
  const [showCreate, setShowCreate] = useState(false);
  return <main className="app-shell"><header className="topbar"><div><span className="eyebrow">SUUNS / SESSION SETUP</span><h1>Choose an economic track</h1><p>The track defines the economy's path before individual macro actions.</p></div>
    <div className="user-actions"><div className="identity"><strong>{user.displayName}</strong><span>{user.role}</span></div><button className="icon-button" onClick={onLogout} title="Sign out"><LogOut size={18} /></button></div></header>
    {error && <div className="error">{error}</div>}
    <section className="track-grid">{tracks.map((track) => <article className="track-card" key={track.id}>
      <div className={`track-icon ${track.direction === 'ADVERSE_SPIRAL' ? 'adverse' : 'healthy'}`}>{track.direction === 'ADVERSE_SPIRAL' ? <TrendingDown /> : <TrendingUp />}</div>
      <span>{track.builtIn ? 'PRESET TRACK' : 'STAFF TRACK'}</span><h2>{track.name}</h2><p>{track.description}</p>
      <dl><div><dt>Direction</dt><dd>{track.direction.replaceAll('_', ' ')}</dd></div><div><dt>Intensity</dt><dd>{track.intensity.toFixed(2)}×</dd></div><div><dt>Duration</dt><dd>{track.durationTicks} ticks</dd></div></dl>
      <button className="primary-button" disabled={loading} onClick={() => onBegin(track.id)}>Start track</button></article>)}</section>
    <section className="create-track-section"><button className="secondary-button" onClick={() => setShowCreate((value) => !value)}><Plus size={17} />Create new track</button>
      {showCreate && <CreateTrackForm onCreate={async (input) => { await onCreate(input); setShowCreate(false); }} />}</section>
  </main>;
}

function CreateTrackForm({ onCreate }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget);
    try { await onCreate({ name: data.get('name'), description: data.get('description'), direction: data.get('direction'), intensity: Number(data.get('intensity')), durationTicks: Number(data.get('durationTicks')) }); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  return <form className="create-track-form" onSubmit={submit}><h2>New staff track</h2>
    <label>Track name<input name="name" required /></label><label>Description<input name="description" required /></label>
    <label>Direction<select name="direction"><option value="ADVERSE_SPIRAL">Adverse spiral</option><option value="RELATIVELY_HEALTHY">Relatively healthy</option></select></label>
    <label>Intensity<input name="intensity" type="number" min="0.25" max="3" step="0.25" defaultValue="1" required /></label>
    <label>Duration in ticks<input name="durationTicks" type="number" min="6" max="120" defaultValue="36" required /></label>
    {error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? 'Creating...' : 'Create track'}</button></form>;
}

function LoginScreen({ onLogin }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); const data = new FormData(event.currentTarget);
    try { onLogin(await login(data.get('username'), data.get('password'))); } catch (caught) { setError(caught.message); } finally { setBusy(false); } }
  return <main className="login-shell"><form className="login-panel" onSubmit={submit}><span className="eyebrow">SUUNS / SECURE ACCESS</span><h1>Operations sign in</h1>
    <label>Username<input name="username" autoComplete="username" required autoFocus /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button></form></main>;
}

function StaffPanel({ staff, onClose, onCreated, onDeleted }) {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); const form = event.currentTarget; const data = new FormData(form);
    try { onCreated(await createStaffAccount({ username: data.get('username'), displayName: data.get('displayName'), password: data.get('password') })); form.reset(); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); } }
  return <section className="staff-panel"><div className="section-heading"><Users size={18} /><h2>Staff accounts</h2><button className="text-button" onClick={onClose}>Close</button></div>
    <div className="staff-layout"><div className="staff-list">{staff.map((item) => <div key={item.id}><span><strong>{item.displayName}</strong><small>{item.username}</small></span><b>{item.role}</b>{item.role==='STAFF'&&<button className="delete-account" title="Deactivate staff account" onClick={async()=>{await deleteStaffAccount(item.id);onDeleted(item.id);}}><Trash2 size={14}/></button>}</div>)}</div>
      <form className="staff-form" onSubmit={submit}><h3>Create staff account</h3><label>Display name<input name="displayName" required /></label><label>Username<input name="username" required autoComplete="off" /></label>
        <label>Temporary password<input name="password" type="password" minLength="10" required autoComplete="new-password" /></label>{error && <div className="form-error">{error}</div>}<button className="primary-button" disabled={busy}><UserPlus size={17} />Create staff</button></form></div></section>;
}

function OperationsWorkspace({ session, onClose }) {
  const [delegates, setDelegates] = useState([]); const [directives, setDirectives] = useState([]);
  const [showCreate, setShowCreate] = useState(false); const [directiveTab,setDirectiveTab]=useState('FRESH'); const [error, setError] = useState('');
  async function refresh() { try { const [people, cards] = await Promise.all([listDelegates(session.id), listDirectives(session.id)]); setDelegates(people); setDirectives(cards); } catch (caught) { setError(caught.message); } }
  useEffect(() => { refresh(); const timer = setInterval(refresh, 4000); return () => clearInterval(timer); }, [session.id]);
  return <section className="operations-page">
    <header className="operations-header"><button className="icon-button" onClick={onClose} title="Back to simulation"><ArrowLeft size={18} /></button><div><span className="eyebrow">STAFF OPERATIONS</span><h2>Directive and action management</h2><p>{session.name} · live refresh every 4 seconds</p></div><button className="secondary-button" onClick={refresh}><RefreshCw size={16} />Refresh</button></header>
    {error && <div className="error">{error}</div>}
    <div className="operations-summary"><div><strong>{directives.length}</strong><span>Total directives</span></div><div><strong>{directives.filter((d) => !['COMPLETED','DECLINED'].includes(d.status)).length}</strong><span>Open actions</span></div><div><strong>{delegates.length}</strong><span>Delegates</span></div></div>
    <div className="operations-toolbar"><h3><Bell size={17} />Live action feed</h3><button className="primary-button" onClick={() => setShowCreate((value) => !value)}><UserPlus size={16} />New delegate</button></div>
    {showCreate && <DelegateForm sessionId={session.id} onCreated={(person) => { setDelegates((items) => [...items, person]); setShowCreate(false); }} />}
    <PublicFeed sessionId={session.id} staff />
    <div className="operations-layout"><DirectiveQueue directives={directives} tab={directiveTab} onTab={setDirectiveTab} onChange={refresh}/>
      <aside className="delegate-roster"><h3>Delegate profiles</h3>{delegates.map((person) => <article key={person.id}><span>{person.organization}</span><strong>{person.displayName}</strong><p>{person.title}</p><small>@{person.username}</small><button className="delete-account" title="Deactivate delegate account" onClick={async()=>{await deleteDelegate(person.id);setDelegates((items)=>items.filter((item)=>item.id!==person.id));}}><Trash2 size={14}/></button></article>)}</aside></div>
  </section>;
}

function DirectiveQueue({ directives,tab,onTab,onChange }) {
  const fresh=directives.filter((item)=>!['COMPLETED','DECLINED'].includes(item.status));
  const actioned=directives.filter((item)=>['COMPLETED','DECLINED'].includes(item.status));
  return <section className="directive-queue"><div className="queue-tabs" role="tablist"><button className={tab==='FRESH'?'active':''} onClick={()=>onTab('FRESH')}><Inbox size={15}/>Fresh <b>{fresh.length}</b></button><button className={tab==='ACTIONED'?'active':''} onClick={()=>onTab('ACTIONED')}><Archive size={15}/>Actioned archive <b>{actioned.length}</b></button></div>
    {tab==='FRESH'&&<div className="action-grid">{fresh.length===0&&<div className="empty-state">No fresh directives require staff action.</div>}{fresh.map((item)=><DirectiveCard key={item.id} directive={item} staff onChange={onChange}/>)}</div>}
    {tab==='ACTIONED'&&<div className="archive-list">{actioned.length===0&&<div className="empty-state">No actioned directives in the archive.</div>}{actioned.map((item)=><ArchivedDirective key={item.id} directive={item} onChange={onChange}/>)}</div>}
  </section>;
}

function ArchivedDirective({ directive,onChange }) {
  const [expanded,setExpanded]=useState(false);
  return <div className={`archive-item ${expanded?'expanded':''}`}><button className="archive-summary" onClick={()=>setExpanded((value)=>!value)} aria-expanded={expanded}><span className={`archive-priority priority-dot-${directive.priority.toLowerCase()}`}/><span><strong>{directive.title}</strong><small>{directive.delegateName} · {new Date(directive.updatedAt).toLocaleString()}</small>{directive.lastActionBy&&<em className="staff-tag">{directive.lastActionBy}</em>}</span><b className={`status status-${directive.status.toLowerCase()}`}>{directive.status.replaceAll('_',' ')}</b>{expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</button>{expanded&&<DirectiveCard directive={directive} staff onChange={onChange}/>}</div>;
}

function DelegateForm({ sessionId, onCreated }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event) { event.preventDefault(); const form=event.currentTarget; const data=new FormData(form); setBusy(true); setError('');
    try { const created=await createDelegate(sessionId, Object.fromEntries(data.entries())); onCreated(created); form.reset(); } catch(caught){setError(caught.message);} finally{setBusy(false);} }
  return <form className="delegate-form" onSubmit={submit}><h3>Create delegate profile</h3><label>Display name<input name="displayName" required /></label><label>Username<input name="username" required /></label><label>Temporary password<input name="password" type="password" minLength="10" required /></label><label>Role / title<input name="title" required /></label><label>Organization<input name="organization" required /></label><label className="wide">Private brief<textarea name="brief" rows="2" /></label>{error && <div className="form-error wide">{error}</div>}<button className="primary-button" disabled={busy}>{busy ? 'Creating...' : 'Create delegate'}</button></form>;
}

function DirectiveCard({ directive, staff, onChange }) {
  const [reply, setReply] = useState(''); const [busy, setBusy] = useState(false); const [showAction,setShowAction]=useState(false);
  async function send(event) { event.preventDefault(); if(!reply.trim())return; setBusy(true); try { if(staff) await respondToDirective(directive.id,reply); else await replyAsDelegate(directive.id,reply); setReply(''); await onChange(); } finally { setBusy(false); } }
  async function status(value) { setBusy(true); try { await updateDirectiveStatus(directive.id,value); await onChange(); } finally { setBusy(false); } }
  return <article className={`directive-card priority-${directive.priority.toLowerCase()}`}><header><div><span>{directive.priority}</span><h3>{directive.title}</h3><small>{directive.delegateName} · {new Date(directive.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small>{directive.lastActionBy&&<em className="staff-tag">Actioned by {directive.lastActionBy}</em>}</div><b className={`status status-${directive.status.toLowerCase()}`}>{directive.status.replaceAll('_',' ')}</b></header><p className="directive-body">{directive.body}</p>
    {staff && <label className="status-control">Action status<select value={directive.status} disabled={busy} onChange={(event) => status(event.target.value)}>{['SUBMITTED','ACKNOWLEDGED','IN_PROGRESS','COMPLETED','DECLINED'].map((value)=><option key={value}>{value}</option>)}</select></label>}
    {staff&&<div className="engine-action-zone"><button className="secondary-button" onClick={()=>setShowAction((value)=>!value)}><Zap size={15}/>{showAction?'Close action controls':'Action in engine'}</button>{showAction&&<EngineActionForm directive={directive} onExecuted={async()=>{setShowAction(false);await onChange();}}/>}{directive.engineActions?.map((action)=><div className="executed-action" key={action.id}><ShieldCheck size={15}/><span><strong>{action.actionType.replaceAll('_',' ')}</strong><small>Ticks {action.activationTick}-{action.endTick} · {action.submittedBy||action.authority}</small></span></div>)}</div>}
    <div className="message-thread">{directive.messages.map((message)=><div key={message.id} className={message.direction === 'STAFF_TO_DELEGATE' ? 'staff-message' : 'delegate-message'}><span>{message.authorName}</span><p>{message.body}</p></div>)}</div>
    <form className="inline-reply" onSubmit={send}><input value={reply} onChange={(event)=>setReply(event.target.value)} placeholder={staff ? 'Send response to delegate' : 'Add response to staff'} /><button className="icon-button" disabled={busy || !reply.trim()} title="Send message"><Send size={16} /></button></form></article>;
}

function EngineActionForm({ directive,onExecuted }) {
  const [armed,setArmed]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function submit(event){event.preventDefault();if(!armed)return;const form=event.currentTarget;const data=new FormData(form);setBusy(true);setError('');
    try{await submitDirectiveAction(directive.sessionId,{actionType:data.get('actionType'),authority:data.get('authority'),scale:Number(data.get('scale')),resourceCommitment:Number(data.get('resourceCommitment')),credibility:Number(data.get('credibility')),coverage:Number(data.get('coverage')),implementationDelay:Number(data.get('implementationDelay')),duration:Number(data.get('duration')),conditions:data.get('conditions'),sourceDirectiveId:directive.id});await onExecuted();}
    catch(caught){setError(caught.message);}finally{setBusy(false);}}
  return <form className="engine-action-form" onSubmit={submit}><div className="action-warning"><ShieldCheck size={16}/><span><strong>Controlled engine action</strong><small>This command becomes part of the causal ledger and cannot be deleted.</small></span></div><label>Policy action<select name="actionType">{['LIQUIDITY_SUPPORT','CAPITAL_INJECTION','FX_INTERVENTION','FISCAL_SUPPORT','IMPORT_SUPPORT','PUBLIC_COMMUNICATION'].map((value)=><option key={value}>{value.replaceAll('_',' ')}</option>)}</select></label><label>Authority<input name="authority" defaultValue="Crisis staff" required/></label><label>Scale<input name="scale" type="number" min="0.1" step="0.1" defaultValue="1" required/></label><label>Resources<input name="resourceCommitment" type="number" min="0" step="0.1" defaultValue="1" required/></label><label>Credibility<input name="credibility" type="number" min="0" max="1" step="0.05" defaultValue="0.8" required/></label><label>Coverage<input name="coverage" type="number" min="0" max="1" step="0.05" defaultValue="0.8" required/></label><label>Delay ticks<input name="implementationDelay" type="number" min="0" defaultValue="0" required/></label><label>Duration ticks<input name="duration" type="number" min="1" defaultValue="1" required/></label><label className="wide">Conditions<textarea name="conditions" rows="2" placeholder="Operational conditions or constraints"/></label><label className="arm-control"><input type="checkbox" checked={armed} onChange={(event)=>setArmed(event.target.checked)}/><span>I have reviewed this impulse and authorize its engine effects.</span></label>{error&&<div className="form-error wide">{error}</div>}<button className="primary-button" disabled={!armed||busy}><Zap size={15}/>{busy?'Executing...':'Execute action'}</button></form>;
}

function DelegatePortal({ user, onLogout }) {
  const [profile,setProfile]=useState(null); const [situation,setSituation]=useState(null); const [directives,setDirectives]=useState([]); const [showCreate,setShowCreate]=useState(false); const [error,setError]=useState('');
  async function refresh(){try{const [person,publicState,cards]=await Promise.all([getDelegateProfile(),getDelegateSituation(),listMyDirectives()]);setProfile(person);setSituation(publicState);setDirectives(cards);}catch(caught){setError(caught.message);}}
  useEffect(()=>{refresh();const timer=setInterval(refresh,4000);return()=>clearInterval(timer);},[]);
  if(!profile)return <main className="login-shell"><div className="login-status">Loading delegate desk...</div></main>;
  return <main className="delegate-shell"><header className="delegate-topbar"><div><span className="eyebrow">SUUNS / DELEGATE DESK</span><h1>{profile.organization}</h1><p>{profile.displayName} · {profile.title}</p></div><button className="icon-button" onClick={onLogout} title="Sign out"><LogOut size={18}/></button></header>
    {profile.brief && <section className="delegate-brief"><span>YOUR BRIEF</span><p>{profile.brief}</p></section>}{error&&<div className="error">{error}</div>}
    {situation&&<PublicSituationReport situation={situation}/>}
    <PublicFeed sessionId={profile.sessionId} />
    <div className="operations-toolbar"><h2><MessageSquare size={18}/>Directives and responses</h2><button className="primary-button" onClick={()=>setShowCreate((value)=>!value)}><Plus size={16}/>New directive</button></div>
    {showCreate&&<DirectiveForm onCreated={async()=>{setShowCreate(false);await refresh();}}/>}<section className="action-grid delegate-actions">{directives.length===0&&<div className="empty-state">No directives submitted. Create one when you are ready to act.</div>}{directives.map((item)=><DirectiveCard key={item.id} directive={item} onChange={refresh}/>)}</section>
  </main>;
}

function PublicSituationReport({ situation }) {
  return <section className="situation-report"><header><div><span className="eyebrow">BASELINE PUBLIC SITUATION</span><h2>Current situation report</h2><p>Verified public indicators available to all delegates.</p></div><b>Tick {situation.tick} · {situation.simulationTimeMinutes} min</b></header><div className="situation-metrics">{Object.entries(PUBLIC_LABELS).map(([key,label])=><div key={key}><span>{label}</span><strong>{format(situation.publicIndicators[key])}</strong></div>)}</div></section>;
}

function PublicFeed({ sessionId, staff=false }) {
  const [cards,setCards]=useState([]); const [showCreate,setShowCreate]=useState(false); const [connected,setConnected]=useState(false); const [error,setError]=useState('');
  async function load(){try{setCards(await (staff?listStaffFeed(sessionId):listPublicFeed(sessionId)));}catch(caught){setError(caught.message);}}
  function merge(card){setCards((items)=>{const visible=staff||card.status==='PUBLISHED';const without=items.filter((item)=>item.id!==card.id);return visible?[card,...without]:without;});}
  useEffect(()=>{load();const close=subscribeToPublicFeed(sessionId,merge,setConnected);return close;},[sessionId,staff]);
  async function change(card,status){const updated=await updateFeedCard(card.id,{headline:card.headline,summary:card.summary,category:card.category,severity:card.severity,status});merge(updated);}
  return <section className="public-feed"><div className="operations-toolbar"><h2><Globe2 size={18}/>Public situation feed <i className={connected?'live-on':'live-wait'}>{connected?'LIVE':'CONNECTING'}</i></h2>{staff&&<button className="secondary-button" onClick={()=>setShowCreate((value)=>!value)}><Plus size={16}/>Create public post</button>}</div>
    {error&&<div className="form-error">{error}</div>}{showCreate&&<FeedCardForm sessionId={sessionId} onCreated={(card)=>{merge(card);setShowCreate(false);}}/>}
    <div className="feed-card-row">{cards.length===0&&<div className="empty-state">No public updates yet.</div>}{cards.map((card)=><article key={card.id} className={`feed-card severity-${card.severity.toLowerCase()}`}><header><span>{card.category}</span><b>{card.severity}</b></header><h3>{card.headline}</h3><p>{card.summary}</p><div className="post-attribution"><span className="staff-tag">Posted by {card.authorName}</span>{card.updatedByName&&card.updatedByName!==card.authorName&&<span className="staff-tag">Edited by {card.updatedByName}</span>}</div><footer><span>{new Date(card.publishedAt||card.updatedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>{staff&&<div><button onClick={()=>change(card,'PUBLISHED')} disabled={card.status==='PUBLISHED'} title="Publish card">Publish</button><button onClick={()=>change(card,'ARCHIVED')} disabled={card.status==='ARCHIVED'} title="Archive card">Archive</button></div>}<em>{card.status}</em></footer></article>)}</div>
  </section>;
}

function FeedCardForm({ sessionId,onCreated }) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  async function submit(event){event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setError('');try{const input=Object.fromEntries(data.entries());onCreated(await createFeedCard(sessionId,input));form.reset();}catch(caught){setError(caught.message);}finally{setBusy(false);}}
  return <form className="feed-card-form" onSubmit={submit}><label>Post headline<input name="headline" required/></label><label>Category<input name="category" placeholder="Markets, security, services..." required/></label><label>Severity<select name="severity"><option>INFORMATION</option><option>ADVISORY</option><option>WARNING</option><option>CRITICAL</option></select></label><label>Publication<select name="status"><option>DRAFT</option><option>PUBLISHED</option></select></label><label className="wide">Public report<textarea name="summary" rows="4" placeholder="Write the narrative update delegates should receive..." required/></label>{error&&<div className="form-error wide">{error}</div>}<button className="primary-button" disabled={busy}>{busy?'Saving...':'Create post'}</button></form>;
}

function DirectiveForm({ onCreated }) {
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(event){event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setError('');try{await createDirective(Object.fromEntries(data.entries()));form.reset();await onCreated();}catch(caught){setError(caught.message);}finally{setBusy(false);}}
  return <form className="directive-form" onSubmit={submit}><label>Directive title<input name="title" required/></label><label>Priority<select name="priority"><option>ROUTINE</option><option>URGENT</option><option>CRITICAL</option></select></label><label className="wide">Requested action<textarea name="body" rows="4" required/></label>{error&&<div className="form-error wide">{error}</div>}<button className="primary-button" disabled={busy}><Send size={16}/>{busy?'Submitting...':'Submit directive'}</button></form>;
}

function Indicator({ label, value, inverse }) { const numeric = value ?? 0; const tone = inverse ? 100 - numeric : numeric;
  return <article className="indicator"><div><span>{label}</span><strong>{format(value)}</strong></div><div className="meter"><i style={{ width: `${numeric}%`, background: tone < 35 ? '#c84c3f' : tone < 65 ? '#d39a32' : '#25866a' }} /></div></article>; }
function format(value) { return value == null ? '-' : Number(value).toFixed(1); }
