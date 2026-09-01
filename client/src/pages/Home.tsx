// Arena Pop — page concours : scène bleu nuit, signal citron, accents corail, cartes de score et composition en ruban.
import { FormEvent, ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Menu,
  Phone,
  Shield,
  Sparkles,
  Trophy,
  Users,
  X,
  Zap,
  RefreshCw,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

// -------- CONSTANTES & UTILS (inchangés) --------
const HERO = "/images/just_dance.jpeg";
const CROWD = "/images/just_dance.jpeg";
const CROWN = "/images/just_dance.jpeg";
const MARK = "../images/just_dance.png";
const EVENT_DATE = new Date("2026-09-05T12:00:00+01:00");
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "0509";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_CONNECTED = Boolean(SUPABASE_URL && SUPABASE_KEY);
const TROPHY_IMG = "/images/just_dance.jpeg"; // ou votre chemin


type Participant = { id: string; pseudo: string; phone: string; photo_url?: string; status: "active" | "eliminated" | "winner"; seed: number; created_at?: string };
type Match = { id: string; p1: string | null; p2: string | null; winner: string | null };
type Bracket = { r16?: Match[]; qf?: Match[]; sf?: Match[]; final: Match };

const emptyMatch = (id: string): Match => ({ id, p1: null, p2: null, winner: null });

function createBracket(list: Participant[] = []): Bracket {
  const safeList = Array.isArray(list) ? list : [];
  const count = safeList.length;
  const ordered = [...safeList]
    .sort((a, b) => (a.seed || 0) - (b.seed || 0))
    .map((p) => p.id);

  if (count <= 2) {
    return { final: { id: "final-0", p1: ordered[0] || null, p2: ordered[1] || null, winner: null } };
  }
  if (count <= 4) {
    return {
      sf: Array.from({ length: 2 }, (_, i) => ({
        id: `sf-${i}`,
        p1: ordered[i * 2] || null,
        p2: ordered[i * 2 + 1] || null,
        winner: null,
      })),
      final: emptyMatch("final-0"),
    };
  }
  if (count <= 8) {
    return {
      qf: Array.from({ length: 4 }, (_, i) => ({
        id: `qf-${i}`,
        p1: ordered[i * 2] || null,
        p2: ordered[i * 2 + 1] || null,
        winner: null,
      })),
      sf: Array.from({ length: 2 }, (_, i) => emptyMatch(`sf-${i}`)),
      final: emptyMatch("final-0"),
    };
  }
  return {
    r16: Array.from({ length: 8 }, (_, i) => ({
      id: `r16-${i}`,
      p1: ordered[i * 2] || null,
      p2: ordered[i * 2 + 1] || null,
      winner: null,
    })),
    qf: Array.from({ length: 4 }, (_, i) => emptyMatch(`qf-${i}`)),
    sf: Array.from({ length: 2 }, (_, i) => emptyMatch(`sf-${i}`)),
    final: emptyMatch("final-0"),
  };
}

const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
};

function fillOpenSlots(bracket: Bracket, list: Participant[] = []): Bracket {
  const safeList = Array.isArray(list) ? list : [];
  if (safeList.length === 0) return createBracket([]);
  const startRoundKey = bracket?.r16 ? "r16" : bracket?.qf ? "qf" : bracket?.sf ? "sf" : "final";
  const maxCapacity = startRoundKey === "r16" ? 16 : startRoundKey === "qf" ? 8 : startRoundKey === "sf" ? 4 : 2;
  if (safeList.length > maxCapacity) return createBracket(safeList);

  const next = structuredClone(bracket) as Bracket;
  const startMatches = startRoundKey === "final" ? [next.final] : (next[startRoundKey as keyof Bracket] as Match[]) || [];
  const placed = new Set([...startMatches.flatMap((m) => [m?.p1, m?.p2])].filter(Boolean));
  const waiting = [...safeList]
    .sort((a, b) => (a.seed || 0) - (b.seed || 0))
    .map((p) => p.id)
    .filter((id) => !placed.has(id));

  startMatches.forEach((m) => {
    if (!m.p1 && waiting.length) m.p1 = waiting.shift()!;
    if (!m.p2 && waiting.length) m.p2 = waiting.shift()!;
  });
  return next;
}

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
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }
  return response.status === 204 ? null : response.json();
}

async function uploadParticipantPhoto(file: File) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return URL.createObjectURL(file);
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${generateUUID()}.${extension}`;
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/participant-photos/${objectPath}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type || "image/jpeg", "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.log(errorText);
    throw new Error(errorText);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/participant-photos/${objectPath}`;
}

// -------- CUSTOM HOOK (légèrement modifié pour ajouter un refresh manuel) --------
function useContestData() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showRanking, setShowRanking] = useState<boolean>(false);
  const [bracket, setBracket] = useState<Bracket>(() => createBracket([]));

  const refresh = async () => {
    try {
      const rows = await supabaseRequest("participants?select=*&order=seed.asc");
      if (Array.isArray(rows)) setParticipants(rows);
      const stateRows = await supabaseRequest("contest_state?select=*&id=eq.1");
      if (stateRows?.[0]) {
        if (stateRows[0].bracket) setBracket(stateRows[0].bracket);
        setShowRanking(Boolean(stateRows[0].show_ranking));
      }
    } catch (err) {
      console.error("Erreur de synchronisation BD", err);
    }
  };

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10000);
    return () => clearInterval(timer);
  }, []);

  const saveContestState = async (newBracket: Bracket, rankingVisible: boolean) => {
    if (SUPABASE_CONNECTED) {
      try {
        await supabaseRequest("contest_state", {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({ id: 1, show_ranking: rankingVisible, bracket: newBracket }),
        });
      } catch (e) {
        console.error("Erreur de sauvegarde de l'état", e);
      }
    }
  };

  const addParticipant = async (entry: Omit<Participant, "id" | "status" | "seed">) => {
    const newEntry: Participant = { ...entry, id: generateUUID(), status: "active", seed: (participants?.length || 0) + 1 };
    try {
      const rows = await supabaseRequest("participants", { method: "POST", body: JSON.stringify(newEntry) });
      if (rows?.[0]) newEntry.id = rows[0].id;
    } catch (e) {
      console.error("Erreur d'ajout participante", e);
    }
    const updatedList = [...participants, newEntry];
    setParticipants(updatedList);
    const updatedBracket = fillOpenSlots(bracket, updatedList);
    setBracket(updatedBracket);
    await saveContestState(updatedBracket, showRanking);
  };

  const updateStatus = async (id: string, status: Participant["status"]) => {
    try {
      await supabaseRequest(`participants?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
    } catch (e) {
      console.error("Erreur mise à jour statut", e);
    }
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  };

  const chooseWinner = async (round: "r16" | "qf" | "sf" | "final", index: number, id: string) => {
    const source = round === "final" ? bracket.final : bracket[round]?.[index];
    const loserId = source?.p1 === id ? source.p2 : source?.p2 === id ? source.p1 : null;
    const nextBracket = structuredClone(bracket) as Bracket;
    const matches = round === "final" ? [nextBracket.final] : nextBracket[round];
    const match = matches?.[index];
    if (!match || (match.p1 !== id && match.p2 !== id)) return;
    match.winner = id;
    const advance = (target: Match | undefined, slot: "p1" | "p2") => {
      if (target) target[slot] = id;
    };
    if (round === "r16") advance(nextBracket.qf?.[Math.floor(index / 2)], index % 2 === 0 ? "p1" : "p2");
    if (round === "qf") advance(nextBracket.sf?.[Math.floor(index / 2)], index % 2 === 0 ? "p1" : "p2");
    if (round === "sf") advance(nextBracket.final, index === 0 ? "p1" : "p2");
    setBracket(nextBracket);
    await saveContestState(nextBracket, showRanking);
    await updateStatus(id, round === "final" ? "winner" : "active");
    if (loserId) await updateStatus(loserId, "eliminated");
  };

  const toggleRanking = async () => {
    const nextShow = !showRanking;
    setShowRanking(nextShow);
    await saveContestState(bracket, nextShow);
  };

  return { participants, showRanking, toggleRanking, addParticipant, updateStatus, bracket, chooseWinner, refresh };
}

// -------- COMPOSANT BRACKET (amélioré) --------
function TournamentBracket({
  bracket,
  participants = [],
  onWinner,
  adminMode = false,
}: {
  bracket: Bracket;
  participants: Participant[];
  onWinner?: (round: "r16" | "qf" | "sf" | "final", index: number, id: string) => void;
  adminMode?: boolean;
}) {
  const safeParticipants = Array.isArray(participants) ? participants : [];
  const byId = (id: string | null) => (id ? safeParticipants.find((p) => p.id === id) : undefined);

  // Gagnante finale
  const winner = safeParticipants.find((p) => p.status === "winner");

  // Rendu d'un slot participant
  const renderParticipantSlot = (id: string | null, isWinner: boolean, onClick?: () => void) => {
    const p = byId(id);
    const hasPhoto = p?.photo_url && p.photo_url.trim() !== "";
    const initiales = p?.pseudo ? p.pseudo.slice(0, 2).toUpperCase() : "?";

    const content = (
      <div className="bracket-player-content">
        <div className="player-avatar-circle">
          {hasPhoto ? (
            <img src={p.photo_url} alt={p.pseudo} />
          ) : (
            <span className="avatar-placeholder">{initiales}</span>
          )}
          {isWinner && <Check size={16} className="winner-icon" />}
        </div>
        <span className="bracket-player-name">{p?.pseudo || "En attente"}</span>
      </div>
    );

    if (adminMode && p && onClick) {
      return (
        <button
          type="button"
          className={`bracket-player selectable ${isWinner ? "won" : ""}`}
          onClick={onClick}
          title={`Déclarer ${p.pseudo} gagnante`}
        >
          {content}
        </button>
      );
    }
    return <div className={`bracket-player ${isWinner ? "won" : ""}`}>{content}</div>;
  };

  // Carte d'un match
  const matchCard = (match: Match, round: "r16" | "qf" | "sf" | "final", index: number) => {
    if (!match) return null;
    const choose = (id: string | null) => id && onWinner?.(round, index, id);
    return (
      <div className={`bracket-match ${match.winner ? "decided" : ""}`} key={match.id || `${round}-${index}`}>
        <div className="match-code">MATCH {String(index + 1).padStart(2, "0")}</div>
        {renderParticipantSlot(match.p1, match.winner !== null && match.winner === match.p1, () => choose(match.p1))}
        <div className="match-divider" />
{renderParticipantSlot(match.p2, match.winner !== null && match.winner === match.p2, () => choose(match.p2))}      </div>
    );
  };

  // Rendu d'un round
  const round = (label: string, matches: Match[] = [], name: "r16" | "qf" | "sf") => (
    <div className={`bracket-round ${name}`} key={name}>
      <div className="round-title">{label}</div>
      <div className="round-matches">
        {(Array.isArray(matches) ? matches : []).map((m, i) => matchCard(m, name, i))}
      </div>
    </div>
  );

  return (
    <div className="tournament-wrap">
      <div className="bracket-note">
        <Trophy size={17} /> TABLEAU À ÉLIMINATION DIRECTE{" "}
        <span>({safeParticipants.length} inscrite{safeParticipants.length > 1 ? "s" : ""})</span>
      </div>

      {/* Bannière de la gagnante */}
      {winner && (
        <div className="winner-display">
          <div className="winner-avatar">
            {winner.photo_url ? (
              <img src={winner.photo_url} alt={winner.pseudo} />
            ) : (
              <Crown size={32} />
            )}
          </div>
          <div className="winner-info">
            <h3>🏆 {winner.pseudo}</h3>
            <p>Grand Champion du concours !</p>
          </div>
        </div>
      )}

      <div className="tournament-scroll">
        <div className="tournament-bracket">
          {bracket?.r16 && round("8ES DE FINALE", bracket.r16, "r16")}
          {bracket?.qf && round("QUARTS DE FINALE", bracket.qf, "qf")}
          {bracket?.sf && round("DEMI-FINALES", bracket.sf, "sf")}
          {bracket?.final && (
            <div className="bracket-round final" key="final">
              <div className="round-title">GRANDE FINALE</div>
              <div className="round-matches">
                {matchCard(bracket.final, "final", 0)}
                <div className="trophy-slot">
                  <img src={TROPHY_IMG} alt="" />
                  <span>GRAND<br />CHAMPION</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {adminMode && (
        <p className="bracket-admin-hint">
          <Zap size={14} /> Clique sur le nom de la gagnante de chaque match pour la faire avancer.
        </p>
      )}
    </div>
  );
}

// -------- COMPOSANT PRINCIPAL --------
export default function Home() {
  const [now, setNow] = useState(Date.now());
  const [page, setPage] = useState<"home" | "register" | "admin">(
    () => (typeof window !== "undefined" && window.location.pathname === "/admin" ? "admin" : "home")
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { participants, showRanking, toggleRanking, addParticipant, updateStatus, bracket, chooseWinner, refresh } =
    useContestData();
  const countdown = formatCountdown(EVENT_DATE.getTime() - now);
  const isEventStarted = EVENT_DATE.getTime() - now <= 0;

  const safeParticipants = Array.isArray(participants) ? participants : [];
  const active = useMemo(() => safeParticipants.filter((p) => p.status === "active"), [safeParticipants]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const go = (target: "home" | "register" | "admin") => {
    setPage(target);
    setMobileOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo trop lourde", { description: "La photo doit faire moins de 5 Mo." });
        event.target.value = "";
        setPhotoPreview(null);
        return;
      }
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consentAccepted) return;
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const pseudo = String(form.get("pseudo") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const photo = form.get("photo") as File | null;
    if (!pseudo || !phone) {
      setSubmitting(false);
      return;
    }
    let photo_url = "";
    if (photo && photo.size > 0) {
      try {
        photo_url = await uploadParticipantPhoto(photo);
      } catch {
        toast.error("Photo non envoyée", { description: "Vérifiez le bucket participant-photos dans Supabase." });
        setSubmitting(false);
        return;
      }
    }
    await addParticipant({ pseudo, phone, photo_url });
    toast.success("Inscription enregistrée", { description: `${pseudo} entre dans la compétition !` });
    setPhotoPreview(null);
    setConsentAccepted(false);
    setSubmitting(false);
    go("home");
  };

  const unlock = (event: FormEvent) => {
    event.preventDefault();
    if (pin === ADMIN_PIN) {
      setAdminUnlocked(true);
      toast.success("Mode admin activé");
    } else {
      toast.error("Code incorrect");
    }
  };

  // ---- Rendu du compteur ----
  const renderCountdown = () => {
    if (isEventStarted) {
      return <div className="countdown-done">🎉 C'est l'heure !</div>;
    }
    return (
      <div className="countdown">
        <div>
          <b>{String(countdown.days).padStart(2, "0")}</b>
          <span>jours</span>
        </div>
        <i>:</i>
        <div>
          <b>{String(countdown.hours).padStart(2, "0")}</b>
          <span>heures</span>
        </div>
        <i>:</i>
        <div>
          <b>{String(countdown.minutes).padStart(2, "0")}</b>
          <span>minutes</span>
        </div>
        <i>:</i>
        <div className="seconds">
          <b>{String(countdown.seconds).padStart(2, "0")}</b>
          <span>secondes</span>
        </div>
      </div>
    );
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => go("home")}>
          <img src={MARK} alt="" />
          <span>OTAKU<span>ALL STAR</span></span>
        </button>
        <nav className={mobileOpen ? "nav-links open" : "nav-links"}>
          <button onClick={() => go("home")}>Le programme</button>
          <button onClick={() => document.getElementById("ranking")?.scrollIntoView({ behavior: "smooth" })}>Classement</button>
          <button onClick={() => go("admin")} className="admin-link">
            <Shield size={15} /> Admin
          </button>
        </nav>
        <button className="menu-btn" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          <Menu size={22} />
        </button>
      </header>

      {page === "home" && (
        <>
          <main>
            <section className="hero-section">
              <div
                className="hero-art"
                style={{
                  backgroundImage: `linear-gradient(90deg, rgba(8,14,44,.98) 0%, rgba(8,14,44,.82) 42%, rgba(8,14,44,.12) 100%), url(${HERO})`,
                }}
              />
              <div className="hero-copy">
                <div className="eyebrow">
                  <span className="live-dot" /> Samedi 05 septembre · entrée libre
                </div>
                <div className={SUPABASE_CONNECTED ? "connection-badge connected" : "connection-badge"}>
                  <span /> {SUPABASE_CONNECTED ? "Données synchronisées" : "Base de données non connectée"}
                </div>
                <h1>
                  La piste<br />
                  <em>est à vous.</em>
                </h1>
                <p>Un concours Just Dance, des films, du challenge et un trophée pour la danseuse qui ira jusqu’au bout.</p>
                {/* Masquer le bouton d'inscription si le classement est visible */}
                {!showRanking && (
                  <button className="primary-btn" onClick={() => go("register")}>
                    Je m’inscris <ArrowRight size={18} />
                  </button>
                )}
              </div>
              <div className="hero-stamp">
                <span>SAISON</span>
                <strong>01</strong>
                <small>Douala · 2026</small>
              </div>
              <div className="hero-bottom-note">
                <Zap size={16} /> Les participantes au Just Dance doivent impérativement être présentes à 12h20.
              </div>
            </section>

            <section className="countdown-section">
              <div>
                <div className="section-kicker">PROCHAIN RENDEZ-VOUS</div>
                <h2>Le show commence dans</h2>
              </div>
              {renderCountdown()}
              <div className="date-chip">
                <CalendarDays size={18} />
                <span>
                  Samedi<br />
                  <b>05.09.26</b>
                </span>
              </div>
            </section>

            <section className="program-section">
              <div className="section-intro">
                <div className="section-kicker">LE PROGRAMME</div>
                <h2>
                  Une journée,<br />
                  <span>six temps forts.</span>
                </h2>
                <p>Viens pour danser. Reste pour l’énergie. Tout est pensé pour vivre le concours comme un vrai match.</p>
                <a href="https://wa.me/237697684439" target="_blank" rel="noreferrer" className="help-link">
                  <Phone size={16} /> Besoin d’aide ? WhatsApp
                </a>
              </div>
              <div className="schedule-list">
                {schedule.map(([time, title, desc], i) => (
                  <div className={i === 0 ? "schedule-row featured" : "schedule-row"} key={time}>
                    <div className="time">{time}</div>
                    <div className="schedule-marker">{i + 1}</div>
                    <div className="schedule-copy">
                      <strong>{title}</strong>
                      <span>{desc}</span>
                    </div>
                    {i === 0 && <Sparkles className="row-spark" size={20} />}
                  </div>
                ))}
              </div>
            </section>

            <section className="ranking-section" id="ranking">
              <div className="ranking-header">
                <div>
                  <div className="section-kicker">TABLEAU DE LA COMPÉTITION</div>
                  <h2>
                    Qui prendra<br />
                    <span>la couronne ?</span>
                  </h2>
                </div>
                <div className="ranking-status">
                  <span className="pulse" /> {showRanking ? "Classement en direct" : "Inscriptions ouvertes"}
                </div>
              </div>
              {showRanking ? (
                <TournamentBracket bracket={bracket} participants={safeParticipants} />
              ) : (
                <div className="locked-ranking">
                  <div className="lock-icon">
                    <Users size={28} />
                  </div>
                  <h3>Le classement arrive bientôt</h3>
                  <p>
                    Inscris-toi maintenant. Quand le tableau sera ouvert, les participantes apparaîtront ici selon le nombre
                    d'inscrites.
                  </p>
                  <button className="text-btn" onClick={() => go("register")}>
                    Rejoindre la compétition <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>

            <section className="cta-section">
              <div
                className="cta-image"
                style={{ backgroundImage: `linear-gradient(90deg, rgba(8,14,44,.95), rgba(8,14,44,.25)), url(${CROWD})` }}
              />
              <div className="cta-content">
                <div className="section-kicker">TON MOMENT COMMENCE ICI</div>
                <h2>
                  Prête à faire<br />
                  <span>vibrer la salle ?</span>
                </h2>
                {!showRanking && (
                  <button className="primary-btn" onClick={() => go("register")}>
                    S’inscrire au concours <ArrowRight size={18} />
                  </button>
                )}
              </div>
              <div className="cta-number">02</div>
            </section>
          </main>
          <footer>
            <div className="footer-brand">
              <img src={MARK} alt="" />
              <span>JUST DANCE ALL STAR</span>
            </div>
            <p>Une journée de danse, de cinéma et de compétition.</p>
            <a href="https://wa.me/237697684439" target="_blank" rel="noreferrer">
              <Phone size={15} /> +237 697 684 439
            </a>
            <small>© 2026 · Organisé avec énergie.</small>
          </footer>
        </>
      )}

      {page === "register" && (
        <main className="inner-page">
          <button className="back-link" onClick={() => go("home")}>← Retour au programme</button>
          <div className="register-layout">
            <div className="register-intro">
              <div className="section-kicker">MANCHE 01 · INSCRIPTIONS</div>
              <h1>
                Entre dans<br />
                <em>la danse.</em>
              </h1>
              <p>Ton pseudo, ton numéro et une photo. Le reste, c’est ton énergie.</p>
              <div className="register-note">
                <Clock3 size={19} />
                <span>
                  <b>Présence obligatoire à 12h20</b>
                  <br />
                  Le concours commence à 12h00 précises.
                </span>
              </div>
            </div>
            <form className="register-card" onSubmit={handleRegister}>
              <div className="form-step">
                <span>01</span>
                <label htmlFor="pseudo">Ton pseudo</label>
                <input id="pseudo" name="pseudo" placeholder="Ex. Luna Beat" required />
              </div>
              <div className="form-step">
                <span>02</span>
                <label htmlFor="phone">Numéro de téléphone</label>
                <input id="phone" name="phone" type="tel" placeholder="+237 6XX XXX XXX" required />
              </div>
              <div className="form-step">
                <span>03</span>
                <label htmlFor="photo">
                  Ta photo <small>(facultatif)</small>
                </label>
                <label className={`photo-drop ${photoPreview ? "has-preview" : ""}`} htmlFor="photo">
                  {photoPreview ? (
                    <div className="photo-preview-box">
                      <img src={photoPreview} alt="Aperçu participante" className="photo-preview-img" />
                      <div className="photo-preview-badge">
                        <RefreshCw size={14} />
                        <span>Changer la photo</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Camera size={24} />
                      <span>Ajouter une photo</span>
                      <small>JPG ou PNG · 5 Mo max.</small>
                    </>
                  )}
                </label>
                <input id="photo" name="photo" type="file" accept="image/png,image/jpeg" onChange={handlePhotoSelect} hidden />
              </div>

              <label className="consent">
                <input type="checkbox" checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} required />
                <span>J’accepte que mon pseudo et ma photo apparaissent dans le classement du concours.</span>
              </label>

              <button className="primary-btn full" type="submit" disabled={!consentAccepted || submitting}>
                {submitting ? "Enregistrement..." : "Valider mon inscription"} <Check size={18} />
              </button>

              <p className="form-help">
                Une question ? <a href="https://wa.me/237697684439" target="_blank" rel="noreferrer">
                  Écris-nous sur WhatsApp
                </a>
              </p>
            </form>
          </div>
        </main>
      )}

      {page === "admin" && (
        <main className="inner-page admin-page">
          <button className="back-link" onClick={() => go("home")}>← Retour au site</button>
          {!adminUnlocked ? (
            <form className="admin-login" onSubmit={unlock}>
              <Shield size={34} />
              <div className="section-kicker">ESPACE ORGANISATION</div>
              <h1>
                Tableau<br />
                <em>de contrôle.</em>
              </h1>
              <p>Entre le code organisateur pour gérer les manches et les participantes.</p>
              <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Code admin" autoFocus />
              <button className="primary-btn full" type="submit">
                Ouvrir le tableau <ArrowRight size={18} />
              </button>
              <small>Mode privé · non visible du public</small>
            </form>
          ) : (
            <div className="admin-dashboard">
              <div className="admin-heading">
                <div>
                  <div className="section-kicker">ORGANISATION · EN DIRECT</div>
                  <h1>
                    Le tableau<br />
                    <em>de la piste.</em>
                  </h1>
                </div>
                <button className={showRanking ? "toggle active" : "toggle"} onClick={toggleRanking}>
                  <span /> {showRanking ? "Classement visible" : "Classement masqué"}
                </button>
              </div>
              <div className="admin-stats">
                <div>
                  <span>PARTICIPANTES</span>
                  <b>{safeParticipants.length}</b>
                </div>
                <div>
                  <span>EN PISTE</span>
                  <b>{active.length}</b>
                </div>
                <div>
                  <span>ÉLIMINÉES</span>
                  <b>{safeParticipants.filter((p) => p.status === "eliminated").length}</b>
                </div>
              </div>
              <TournamentBracket bracket={bracket} participants={safeParticipants} adminMode onWinner={chooseWinner} />
              <div className="admin-list">
                <div className="admin-list-head">
                  <span>PARTICIPANTE</span>
                  <span>STATUT</span>
                  <span>ACTION</span>
                </div>
                {safeParticipants.map((p, i) => (
                  <div className="admin-row" key={p.id}>
                    <div className="admin-person">
                      <span className="admin-rank">{String(i + 1).padStart(2, "0")}</span>
                      <div className="avatar small">{p.photo_url ? <img src={p.photo_url} alt="" /> : p.pseudo.slice(0, 1)}</div>
                      <strong>{p.pseudo}</strong>
                    </div>
                    <span className={`status-pill ${p.status}`}>
                      {p.status === "active" ? "En course" : p.status === "winner" ? "Championne" : "Éliminée"}
                    </span>
                    <div className="admin-actions">
                      {p.status !== "winner" && (
                        <button title="Déclarer gagnante" onClick={() => updateStatus(p.id, "winner")}>
                          <Trophy size={16} />
                        </button>
                      )}
                      {p.status === "active" && (
                        <button className="danger" title="Éliminer" onClick={() => updateStatus(p.id, "eliminated")}>
                          <X size={16} />
                        </button>
                      )}
                      {p.status === "eliminated" && (
                        <button title="Réintégrer" onClick={() => updateStatus(p.id, "active")}>
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}