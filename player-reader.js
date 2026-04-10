/**
 * player-reader.js
 * Lit le localStorage de LvLup et retourne le profil joueur courant.
 */

function getPlayerProfile() {
  function jParse(key, def) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) {
      return def;
    }
  }

  // ── Données brutes ────────────────────────────────────────────
  const xp      = jParse('lvlup_xp',      { totalXP: 0, level: 1, lastSessionDate: null });
  const journal  = jParse('lvlup_journal', []);
  const sessions = jParse('lvlup_sessions', []);
  const weightCur = localStorage.getItem('lvlup_weight_current');

  // ── Muscles : index sessionName → noms de blocs ───────────────
  const musclesBySession = {};
  for (const s of sessions) {
    if (!s.name || !Array.isArray(s.blocks)) continue;
    const warmupRe = /^(echauff|échauff|mobilit|étirement|etirement|warmup|warm.up)/i;
    const blockNames = s.blocks
      .map(b => (b.name || '').trim())
      .filter(n => n && !warmupRe.test(n));
    musclesBySession[s.name] = blockNames.length ? blockNames : [s.name];
  }

  // ── 5 dernières séances ───────────────────────────────────────
  const last5 = journal.slice(0, 5).map(e => ({
    date:     e.date,
    duration: e.totalDuration,           // secondes
    muscles:  musclesBySession[e.sessionName] || [e.sessionName]
  }));

  // ── Jours d'inactivité ────────────────────────────────────────
  let inactivityDays = null;
  if (xp.lastSessionDate) {
    inactivityDays = Math.floor(
      (Date.now() - new Date(xp.lastSessionDate).getTime()) / 86400000
    );
  }

  // ── Streak (jours consécutifs avec ≥ 1 séance) ───────────────
  function toDateStr(isoStr) {
    return new Date(isoStr).toISOString().slice(0, 10); // YYYY-MM-DD
  }

  let streak = 0;
  if (journal.length > 0) {
    const sessionDates = new Set(journal.map(e => toDateStr(e.date)));
    const today = new Date();
    let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Si aujourd'hui pas de séance, on commence à vérifier hier
    if (!sessionDates.has(toDateStr(cursor.toISOString()))) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (sessionDates.has(toDateStr(cursor.toISOString()))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // ── Résultat ──────────────────────────────────────────────────
  return {
    level:          xp.level,
    totalXP:        xp.totalXP,
    weight:         weightCur ? parseFloat(weightCur) : null,
    lastSessions:   last5,
    inactivityDays: inactivityDays,
    streak:         streak
  };
}
