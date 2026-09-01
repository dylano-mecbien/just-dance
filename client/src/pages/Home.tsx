/* Arena Pop — page concours : scène bleu nuit, signal citron, accents corail, cartes de score et composition en ruban. */
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Camera, Check, ChevronDown, Clock3, Crown, ExternalLink, Instagram, Menu, Phone, Shield, Sparkles, Trophy, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";

const HERO = "/manus-storage/just-dance-hero_30ce79f4.png";
const CROWD = "/manus-storage/just-dance-crowd_cc81beee.png";
const CROWN = "/manus-storage/just-dance-crown_7f70f5a3.png";
const MARK = "/manus-storage/just-dance-mark_81f5cc49.png";
const EVENT_DATE = new Date("2026-09-05T12:00:00+01:00");
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "0509";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Participant = { id: string; pseudo: string; phone: string; photo_url?: string; status: "active" | "eliminated" | "winner"; seed: number; created_at?: string };

const seedParticipants: Participant[] = [
  { id: "demo-1", pseudo: "Luna Beat", phone: "", status: "active", seed: 1 },
  { id: "demo-2", pseudo: "Naya Groove", phone: "", status: "active", seed: 2 },
  { id: "demo-3", pseudo: "Mimi Flash", phone: "", status: "active", seed: 3 },
  { id: "demo-4", pseudo: "Krys Motion", phone: "", status: "active", seed: 4 },
];

const schedule = [
  ["12h00", "Grand Concours de Just Dance", "La piste s’allume"],
  ["12h20", "Présence obligatoire", "Toutes les participantes doivent être présentes"],
  ["13h30", "Déjeuner d’exception", "Plat d’ERU accompagné de boissons"],
  ["14h00", "Première projection de film", "Place aux émotions"],
  ["16h00", "Séance de Mortal Kombat 11", "Le combat continue"],
  ["17h00", "Deuxième séance de film", "Dernier rendez-vous de la journée"],
];

function formatCountdown(ms: number) {
  const safe = Math.max(0, ms);
  const days = Math.floor(safe / 86400000);
  const hours = Math.floor((safe % 86400000) / 3600000);
  const minutes = Math.floor((safe % 3600000) / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) },
  });
  if (!response.ok) throw new Error(await response.text());
  return response.status === 204 ? null : response.json();
}

function useContestData() {
  const [participants, setParticipants] = useState<Participant[]>(() => {
    try { return JSON.parse(localStorage.getItem("jd-participants") || "null") || seedParticipants; } catch { return seedParticipants; }
  });
  const [showRanking, setShowRanking] = useState(() => localStorage.getItem("jd-show-ranking") === "true");

  const refresh = async () => {
    try {
      const rows = await supabaseRequest("participants?select=*&order=seed.asc");
      if (rows) { setParticipants(rows); return; }
    } catch { /* fallback local pour une démo sans clés */ }
    const local = JSON.parse(localStorage.getItem("jd-participants") || "null");
    if (local) setParticipants(local);
  };
  useEffect(() => { refresh(); const timer = setInterval(refresh, 12000); return () => clearInterval(timer); }, []);
  useEffect(() => { localStorage.setItem("jd-participants", JSON.stringify(participants)); }, [participants]);
  useEffect(() => { localStorage.setItem("jd-show-ranking", String(showRanking)); }, [showRanking]);

  const addParticipant = async (entry: Omit<Participant, "id" | "status" | "seed">) => {
    const newEntry: Participant = { ...entry, id: crypto.randomUUID(), status: "active", seed: participants.length + 1 };
    try { const rows = await supabaseRequest("participants", { method: "POST", body: JSON.stringify(newEntry) }); if (rows?.[0]) newEntry.id = rows[0].id; } catch { /* fallback local */ }
    setParticipants((prev) => [...prev, newEntry]);
  };
  const updateStatus = async (id: string, status: Participant["status"]) => {
    try { await supabaseRequest(`participants?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) }); } catch { /* fallback local */ }
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };
  return { participants, showRanking, setShowRanking, addParticipant, updateStatus };
}

export default function Home() {
  const [now, setNow] = useState(Date.now());
  const [page, setPage] = useState<"home" | "register" | "admin">(() => window.location.pathname === "/admin" ? "admin" : "home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const { participants, showRanking, setShowRanking, addParticipant, updateStatus } = useContestData();
  const countdown = formatCountdown(EVENT_DATE.getTime() - now);
  const active = useMemo(() => participants.filter((p) => p.status === "active"), [participants]);
  const winner = participants.find((p) => p.status === "winner");

  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);

  const go = (target: "home" | "register" | "admin") => { setPage(target); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const pseudo = String(form.get("pseudo") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const photo = form.get("photo") as File | null;
    if (!pseudo || !phone) return;
    let photo_url = "";
    if (photo && photo.size) photo_url = URL.createObjectURL(photo);
    await addParticipant({ pseudo, phone, photo_url });
    toast.success("Inscription enregistrée", { description: `${pseudo} entre dans la compétition.` });
    go("home");
  };
  const unlock = (event: FormEvent) => { event.preventDefault(); if (pin === ADMIN_PIN) { setAdminUnlocked(true); toast.success("Mode admin activé"); } else toast.error("Code incorrect"); };

  return <div className="site-shell">
    <header className="topbar"><button className="brand" onClick={() => go("home")}><img src={MARK} alt="" /><span>JD<span>CONTEST</span></span></button><nav className={mobileOpen ? "nav-links open" : "nav-links"}><button onClick={() => go("home")}>Le programme</button><button onClick={() => document.getElementById("ranking")?.scrollIntoView({ behavior: "smooth" })}>Classement</button><button onClick={() => go("admin")} className="admin-link"><Shield size={15} /> Admin</button></nav><button className="menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu"><Menu size={22} /></button></header>

    {page === "home" && <>
      <main>
        <section className="hero-section"><div className="hero-art" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,14,44,.98) 0%, rgba(8,14,44,.82) 42%, rgba(8,14,44,.12) 100%), url(${HERO})` }} /><div className="hero-copy"><div className="eyebrow"><span className="live-dot" /> Samedi 05 septembre · entrée libre</div><h1>La piste<br /><em>est à vous.</em></h1><p>Un concours Just Dance, des films, du challenge et un trophée pour la danseuse qui ira jusqu’au bout.</p><button className="primary-btn" onClick={() => go("register")}>Je m’inscris <ArrowRight size={18} /></button></div><div className="hero-stamp"><span>SAISON</span><strong>01</strong><small>Yaoundé · 2026</small></div><div className="hero-bottom-note"><Zap size={16} /> Les participantes au Just Dance doivent impérativement être présentes à 12h20.</div></section>

        <section className="countdown-section"><div><div className="section-kicker">PROCHAIN RENDEZ-VOUS</div><h2>Le show commence dans</h2></div><div className="countdown"><div><b>{String(countdown.days).padStart(2, "0")}</b><span>jours</span></div><i>:</i><div><b>{String(countdown.hours).padStart(2, "0")}</b><span>heures</span></div><i>:</i><div><b>{String(countdown.minutes).padStart(2, "0")}</b><span>minutes</span></div><i>:</i><div className="seconds"><b>{String(countdown.seconds).padStart(2, "0")}</b><span>secondes</span></div></div><div className="date-chip"><CalendarDays size={18} /><span>Samedi<br /><b>05.09.26</b></span></div></section>

        <section className="program-section"><div className="section-intro"><div className="section-kicker">LE PROGRAMME</div><h2>Une journée,<br /><span>six temps forts.</span></h2><p>Viens pour danser. Reste pour l’énergie. Tout est pensé pour vivre le concours comme un vrai match.</p><a href="https://wa.me/237697684439" target="_blank" rel="noreferrer" className="help-link"><Phone size={16} /> Besoin d’aide ? WhatsApp</a></div><div className="schedule-list">{schedule.map(([time, title, desc], i) => <div className={i === 0 ? "schedule-row featured" : "schedule-row"} key={time}><div className="time">{time}</div><div className="schedule-marker">{i + 1}</div><div className="schedule-copy"><strong>{title}</strong><span>{desc}</span></div>{i === 0 && <Sparkles className="row-spark" size={20} />}</div>)}</div></section>

        <section className="ranking-section" id="ranking"><div className="ranking-header"><div><div className="section-kicker">TABLEAU DE LA COMPÉTITION</div><h2>Qui prendra<br /><span>la couronne ?</span></h2></div><div className="ranking-status"><span className="pulse" /> {showRanking ? "Classement en direct" : "Inscriptions ouvertes"}</div></div>{showRanking ? <div className="bracket"><div className="bracket-label">MANCHE EN COURS <span>{active.length} en piste</span></div><div className="bracket-grid">{participants.filter((p) => p.status !== "eliminated").map((p, i) => <div className={p.status === "winner" ? "contestant winner-card" : "contestant"} key={p.id}><div className="rank-no">{p.status === "winner" ? <Crown size={18} /> : String(i + 1).padStart(2, "0")}</div><div className="avatar">{p.photo_url ? <img src={p.photo_url} alt="" /> : p.pseudo.slice(0, 1).toUpperCase()}</div><div className="contestant-name"><strong>{p.pseudo}</strong><span>{p.status === "winner" ? "Championne" : "Toujours en course"}</span></div>{p.status === "winner" && <img className="mini-crown" src={CROWN} alt="" />}</div>)}</div>{winner && <div className="winner-banner"><img src={CROWN} alt="" /><div><span>CHAMPIONNE</span><strong>{winner.pseudo}</strong></div><Trophy size={28} /></div>}</div> : <div className="locked-ranking"><div className="lock-icon"><Users size={28} /></div><h3>Le classement arrive bientôt</h3><p>Inscris-toi maintenant. Quand le tableau sera ouvert, les participantes apparaîtront ici comme dans un vrai match.</p><button className="text-btn" onClick={() => go("register")}>Rejoindre la compétition <ArrowRight size={16} /></button></div>}</section>

        <section className="cta-section"><div className="cta-image" style={{ backgroundImage: `linear-gradient(90deg, rgba(8,14,44,.95), rgba(8,14,44,.25)), url(${CROWD})` }} /><div className="cta-content"><div className="section-kicker">TON MOMENT COMMENCE ICI</div><h2>Prête à faire<br /><span>vibrer la salle ?</span></h2><button className="primary-btn" onClick={() => go("register")}>S’inscrire au concours <ArrowRight size={18} /></button></div><div className="cta-number">02</div></section>
      </main><footer><div className="footer-brand"><img src={MARK} alt="" /><span>JD CONTEST</span></div><p>Une journée de danse, de cinéma et de compétition.</p><a href="https://wa.me/237697684439" target="_blank" rel="noreferrer"><Phone size={15} /> +237 697 684 439</a><small>© 2026 · Organisé avec énergie.</small></footer>
    </>}

    {page === "register" && <main className="inner-page"><button className="back-link" onClick={() => go("home")}>← Retour au programme</button><div className="register-layout"><div className="register-intro"><div className="section-kicker">MANCHE 01 · INSCRIPTIONS</div><h1>Entre dans<br /><em>la danse.</em></h1><p>Ton pseudo, ton numéro et une photo. Le reste, c’est ton énergie.</p><div className="register-note"><Clock3 size={19} /><span><b>Présence obligatoire à 12h20</b><br />Le concours commence à 12h00 précises.</span></div></div><form className="register-card" onSubmit={handleRegister}><div className="form-step"><span>01</span><label htmlFor="pseudo">Ton pseudo</label><input id="pseudo" name="pseudo" placeholder="Ex. Luna Beat" required /></div><div className="form-step"><span>02</span><label htmlFor="phone">Numéro de téléphone</label><input id="phone" name="phone" type="tel" placeholder="+237 6XX XXX XXX" required /></div><div className="form-step"><span>03</span><label htmlFor="photo">Ta photo <small>(facultatif)</small></label><label className="photo-drop" htmlFor="photo"><Camera size={24} /><span>Ajouter une photo</span><small>JPG ou PNG · 5 Mo max.</small></label><input id="photo" name="photo" type="file" accept="image/png,image/jpeg" hidden /></div><label className="consent"><input type="checkbox" required /><span>J’accepte que mon pseudo et ma photo apparaissent dans le classement du concours.</span></label><button className="primary-btn full" type="submit">Valider mon inscription <Check size={18} /></button><p className="form-help">Une question ? <a href="https://wa.me/237697684439" target="_blank" rel="noreferrer">Écris-nous sur WhatsApp</a></p></form></div></main>}

    {page === "admin" && <main className="inner-page admin-page"><button className="back-link" onClick={() => go("home")}>← Retour au site</button>{!adminUnlocked ? <form className="admin-login" onSubmit={unlock}><Shield size={34} /><div className="section-kicker">ESPACE ORGANISATION</div><h1>Tableau<br /><em>de contrôle.</em></h1><p>Entre le code organisateur pour gérer les manches et les participantes.</p><input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Code admin" autoFocus /><button className="primary-btn full" type="submit">Ouvrir le tableau <ArrowRight size={18} /></button><small>Mode privé · non visible du public</small></form> : <div className="admin-dashboard"><div className="admin-heading"><div><div className="section-kicker">ORGANISATION · EN DIRECT</div><h1>Le tableau<br /><em>de la piste.</em></h1></div><button className={showRanking ? "toggle active" : "toggle"} onClick={() => setShowRanking(!showRanking)}><span /> {showRanking ? "Classement visible" : "Classement masqué"}</button></div><div className="admin-stats"><div><span>PARTICIPANTES</span><b>{participants.length}</b></div><div><span>EN PISTE</span><b>{active.length}</b></div><div><span>ÉLIMINÉES</span><b>{participants.filter((p) => p.status === "eliminated").length}</b></div></div><div className="admin-list"><div className="admin-list-head"><span>PARTICIPANTE</span><span>STATUT</span><span>ACTION</span></div>{participants.map((p, i) => <div className="admin-row" key={p.id}><div className="admin-person"><span className="admin-rank">{String(i + 1).padStart(2, "0")}</span><div className="avatar small">{p.photo_url ? <img src={p.photo_url} alt="" /> : p.pseudo.slice(0, 1)}</div><strong>{p.pseudo}</strong></div><span className={`status-pill ${p.status}`}>{p.status === "active" ? "En course" : p.status === "winner" ? "Championne" : "Éliminée"}</span><div className="admin-actions">{p.status !== "winner" && <button title="Déclarer gagnante" onClick={() => updateStatus(p.id, "winner")}><Trophy size={16} /></button>}{p.status === "active" && <button className="danger" title="Éliminer" onClick={() => updateStatus(p.id, "eliminated")}><X size={16} /></button>}{p.status === "eliminated" && <button title="Réintégrer" onClick={() => updateStatus(p.id, "active")}><Check size={16} /></button>}</div></div>)}</div></div>}</main>}
  </div>;
}
