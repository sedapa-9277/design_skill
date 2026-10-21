// ===== 설정 =====
const TIERS = {
  easy:   { name: "슬라임",  label: "쉬움",   emoji: "🟢", sprites: ["🐌", "🦇", "🐀", "🕷️"], xp: 15,  gold: 5,   hits: 1, color: "var(--t1)" },
  normal: { name: "고블린",  label: "보통",   emoji: "👺", sprites: ["👺", "🧟", "🐺", "🦂"], xp: 35,  gold: 12,  hits: 2, color: "var(--t2)" },
  hard:   { name: "오우거",  label: "어려움", emoji: "👹", sprites: ["👹", "🦍", "🦖", "👻"], xp: 70,  gold: 25,  hits: 3, color: "var(--t3)" },
  boss:   { name: "드래곤",  label: "보스",   emoji: "🐉", sprites: ["🐉", "💀", "🐙", "😈"], xp: 150, gold: 60,  hits: 5, color: "var(--t4)" },
};

const TITLES = [
  [1,  "견습 모험가", "🧙"],
  [3,  "초보 전사",   "🧑‍🦱"],
  [5,  "숙련 기사",   "🛡️"],
  [8,  "몬스터 헌터", "🏹"],
  [12, "왕국의 용사", "⚔️"],
  [17, "전설의 영웅", "🦸"],
  [25, "신화 속 존재", "👑"],
];

const CRIT_CHANCE = 0.15;
const STORAGE_KEY = "todo-quest-v1";

const xpToNext = (level) => Math.round(100 * Math.pow(level, 1.35));

// ===== 상태 =====
const defaultState = () => ({
  hero: { level: 1, xp: 0, kills: 0, gold: 0, streak: 0, lastKillDay: null },
  monsters: [],
  log: [],
});

let state = load();
let currentFilter = "all";
let selectedTier = "easy";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) { /* 저장소 사용 불가 */ }
  return defaultState();
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
}

// ===== DOM =====
const $ = (id) => document.getElementById(id);
const els = {
  heroAvatar: $("heroAvatar"), heroTitle: $("heroTitle"), heroLevel: $("heroLevel"),
  xpFill: $("xpFill"), xpText: $("xpText"), xpBar: $("xpBar"),
  kills: $("statKills"), gold: $("statGold"), streak: $("statStreak"),
  form: $("summonForm"), input: $("taskInput"), due: $("dueInput"), tierPicker: $("tierPicker"),
  grid: $("monsterGrid"), empty: $("emptyState"), count: $("monsterCount"), filters: $("filters"),
  logList: $("logList"), resetBtn: $("resetBtn"),
  levelUp: $("levelUp"), luLevel: $("luLevel"), luTitle: $("luTitle"), luClose: $("luClose"),
  toastWrap: $("toastWrap"),
};

// ===== 유틸 =====
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function titleFor(level) {
  let t = TITLES[0];
  for (const row of TITLES) if (level >= row[0]) t = row;
  return { title: t[1], avatar: t[2] };
}

function dueInfo(due) {
  if (!due) return null;
  const diff = Math.round((new Date(due + "T00:00:00") - new Date(todayStr() + "T00:00:00")) / 86400000);
  if (diff < 0) return { text: `${-diff}일 지남`, enraged: true };
  if (diff === 0) return { text: "오늘까지", enraged: false };
  return { text: `D-${diff}`, enraged: false };
}

// ===== 렌더링 =====
function renderTierPicker() {
  els.tierPicker.innerHTML = Object.entries(TIERS).map(([key, t]) => `
    <button type="button" class="tier-option" role="radio" data-tier="${key}"
      aria-checked="${key === selectedTier}" style="--tier-color:${t.color}">
      <span class="t-emoji">${t.emoji}</span>
      <span class="t-name">${t.label}</span>
      <span class="t-xp">+${t.xp} XP</span>
    </button>`).join("");

  els.filters.innerHTML = `<button class="chip ${currentFilter === "all" ? "active" : ""}" data-filter="all">전체</button>` +
    Object.entries(TIERS).map(([key, t]) =>
      `<button class="chip ${currentFilter === key ? "active" : ""}" data-filter="${key}">${t.emoji} ${t.label}</button>`).join("");
}

function renderHero() {
  const h = state.hero;
  const need = xpToNext(h.level);
  const { title, avatar } = titleFor(h.level);
  els.heroLevel.textContent = h.level;
  els.heroTitle.textContent = title;
  els.heroAvatar.textContent = avatar;
  els.xpFill.style.width = `${Math.min(100, (h.xp / need) * 100)}%`;
  els.xpText.textContent = `${h.xp} / ${need} XP`;
  els.xpBar.setAttribute("aria-valuenow", h.xp);
  els.xpBar.setAttribute("aria-valuemax", need);
  els.kills.textContent = h.kills;
  els.gold.textContent = h.gold;
  els.streak.textContent = h.streak;
}

function monsterHTML(m) {
  const t = TIERS[m.tier];
  const due = dueInfo(m.due);
  const hpPct = ((t.hits - m.damage) / t.hits) * 100;
  return `
    <article class="monster ${due?.enraged ? "enraged" : ""}" data-id="${m.id}" style="--tier-color:${t.color}">
      <div class="monster-top">
        <span class="tier-badge">${t.label} · ${t.name}</span>
        <button class="btn-flee" data-action="flee" title="도망치기 (삭제)" aria-label="삭제">✕</button>
      </div>
      <div class="monster-sprite">${m.sprite}</div>
      <p class="monster-name">${escapeHtml(m.name)}</p>
      <div class="monster-meta">
        <span>⭐ ${t.xp} XP</span>
        <span>💰 ${t.gold}</span>
        ${due ? `<span class="${due.enraged ? "rage-tag" : ""}">${due.enraged ? "😡 분노 · " : "⏳ "}${due.text}</span>` : ""}
      </div>
      <div class="hp-bar" title="HP ${t.hits - m.damage}/${t.hits}"><div class="hp-fill" style="width:${hpPct}%"></div></div>
      <button class="btn btn-attack" data-action="attack">⚔️ 공격 (${t.hits - m.damage}/${t.hits})</button>
    </article>`;
}

function renderMonsters() {
  const list = state.monsters.filter((m) => currentFilter === "all" || m.tier === currentFilter);
  els.grid.innerHTML = list.map(monsterHTML).join("");
  els.empty.hidden = list.length > 0;
  els.count.textContent = state.monsters.length;
}

function renderLog() {
  if (!state.log.length) {
    els.logList.innerHTML = `<li class="log-empty">아직 처치한 몬스터가 없습니다.</li>`;
    return;
  }
  els.logList.innerHTML = state.log.slice(0, 50).map((l) => {
    const d = new Date(l.at);
    const time = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    return `<li>
      <span class="log-emoji">${l.sprite}</span>
      <span class="log-name">${escapeHtml(l.name)}</span>
      <span class="log-xp">+${l.xp} XP${l.crit ? " 💥" : ""}</span>
      <span class="log-time">${time}</span>
    </li>`;
  }).join("");
}

function renderAll() {
  renderHero();
  renderMonsters();
  renderLog();
}

// ===== 이펙트 =====
function floatText(x, y, text, cls, delay = 0) {
  setTimeout(() => {
    const el = document.createElement("div");
    el.className = `float-text ${cls}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }, delay);
}

function sparks(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const s = document.createElement("div");
    s.className = "spark";
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const dist = 40 + Math.random() * 60;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.background = color;
    s.style.boxShadow = `0 0 8px ${color}`;
    s.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
    s.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }
}

function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  els.toastWrap.appendChild(t);
  setTimeout(() => t.remove(), 2900);
}

// ===== 게임 로직 =====
function summon(name, tier, due) {
  const t = TIERS[tier];
  state.monsters.unshift({
    id: uid(), name, tier, due: due || null,
    sprite: pick(t.sprites), damage: 0, createdAt: Date.now(),
  });
  save();
  if (currentFilter !== "all" && currentFilter !== tier) currentFilter = "all";
  renderTierPicker();
  renderMonsters();
  toast(`${t.emoji} 야생의 ${t.name}「${name}」이(가) 나타났다!`);
}

function attack(id, card) {
  const m = state.monsters.find((x) => x.id === id);
  if (!m) return;
  const t = TIERS[m.tier];

  const rect = card.querySelector(".monster-sprite").getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  retrigger(els.heroAvatar, "attack");
  retrigger(card, "hit");
  const slash = document.createElement("div");
  slash.className = "slash";
  card.appendChild(slash);
  slash.addEventListener("animationend", () => slash.remove());

  m.damage++;
  const remaining = t.hits - m.damage;

  if (remaining > 0) {
    floatText(cx, cy - 20, `-${Math.round(100 / t.hits)}%`, "dmg");
    sparks(cx, cy, "#fff", 8);
    card.querySelector(".hp-fill").style.width = `${(remaining / t.hits) * 100}%`;
    card.querySelector('[data-action="attack"]').textContent = `⚔️ 공격 (${remaining}/${t.hits})`;
    save();
    return;
  }

  defeat(m, card, cx, cy);
}

function defeat(m, card, cx, cy) {
  const t = TIERS[m.tier];
  const crit = Math.random() < CRIT_CHANCE;
  const due = dueInfo(m.due);
  const early = m.due && !due.enraged;

  let xp = t.xp;
  if (early) xp = Math.round(xp * 1.2);
  if (crit) xp *= 2;
  const gold = t.gold + Math.floor(Math.random() * t.gold * 0.5);

  card.querySelector(".hp-fill").style.width = "0%";
  card.querySelector('[data-action="attack"]').disabled = true;
  card.classList.add("dying");
  document.querySelector(".app").classList.remove("shake");
  if (m.tier === "boss" || crit) retrigger(document.querySelector(".app"), "shake");

  sparks(cx, cy, crit ? "#ffcc4d" : "#5ee6a8", crit ? 24 : 16);
  if (crit) floatText(cx, cy - 50, "CRITICAL!", "crit");
  floatText(cx, cy - 10, `+${xp} XP`, "xp", crit ? 150 : 0);
  floatText(cx + 30, cy + 20, `+${gold} 💰`, "gold", 250);
  if (early) floatText(cx - 30, cy + 40, "기한 내 처치 +20%", "gold", 400);

  // 상태 갱신
  const h = state.hero;
  const today = todayStr();
  if (h.lastKillDay !== today) {
    const yesterday = new Date(Date.now() - 86400000);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    h.streak = h.lastKillDay === yStr ? h.streak + 1 : 1;
    h.lastKillDay = today;
  }
  h.kills++;
  h.gold += gold;
  state.monsters = state.monsters.filter((x) => x.id !== m.id);
  state.log.unshift({ name: m.name, sprite: m.sprite, tier: m.tier, xp, crit, at: Date.now() });
  state.log = state.log.slice(0, 100);

  const levelsGained = gainXp(xp);
  save();

  setTimeout(() => {
    renderAll();
    if (levelsGained > 0) showLevelUp();
  }, 700);
}

function gainXp(amount) {
  const h = state.hero;
  h.xp += amount;
  let gained = 0;
  while (h.xp >= xpToNext(h.level)) {
    h.xp -= xpToNext(h.level);
    h.level++;
    gained++;
  }
  return gained;
}

function showLevelUp() {
  const { title } = titleFor(state.hero.level);
  const prevTitle = titleFor(state.hero.level - 1).title;
  els.luLevel.textContent = state.hero.level;
  els.luTitle.textContent = title !== prevTitle ? `🎖️ 새로운 칭호 획득: ${title}` : `다음 레벨까지 ${xpToNext(state.hero.level)} XP`;
  els.levelUp.hidden = false;
  els.luClose.focus();

  const r = els.levelUp.querySelector(".levelup-card").getBoundingClientRect();
  const colors = ["#ffcc4d", "#5ee6a8", "#a57bff", "#ff5d73", "#5cb8ff"];
  for (let i = 0; i < 5; i++) {
    setTimeout(() => sparks(r.left + Math.random() * r.width, r.top + Math.random() * r.height, pick(colors), 16), i * 180);
  }
}

function flee(id, card) {
  const m = state.monsters.find((x) => x.id === id);
  if (!m) return;
  card.classList.add("dying");
  state.monsters = state.monsters.filter((x) => x.id !== id);
  save();
  setTimeout(renderMonsters, 600);
  toast(`🏃 「${m.name}」에게서 도망쳤다... (경험치 없음)`);
}

// ===== 이벤트 =====
els.tierPicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".tier-option");
  if (!btn) return;
  selectedTier = btn.dataset.tier;
  els.tierPicker.querySelectorAll(".tier-option").forEach((b) =>
    b.setAttribute("aria-checked", b.dataset.tier === selectedTier));
});

els.filters.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  currentFilter = chip.dataset.filter;
  els.filters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
  renderMonsters();
});

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = els.input.value.trim();
  if (!name) return;
  summon(name, selectedTier, els.due.value);
  els.input.value = "";
  els.due.value = "";
  els.input.focus();
});

els.grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const card = btn.closest(".monster");
  if (btn.dataset.action === "attack") attack(card.dataset.id, card);
  if (btn.dataset.action === "flee") flee(card.dataset.id, card);
});

els.luClose.addEventListener("click", () => { els.levelUp.hidden = true; });
els.levelUp.addEventListener("click", (e) => { if (e.target === els.levelUp) els.levelUp.hidden = true; });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") els.levelUp.hidden = true; });

els.resetBtn.addEventListener("click", () => {
  if (!confirm("모든 레벨, 몬스터, 기록이 사라집니다. 정말 초기화할까요?")) return;
  state = defaultState();
  save();
  renderAll();
  toast("🌅 새로운 모험이 시작됩니다.");
});

// ===== 시작 =====
els.due.min = todayStr();
renderTierPicker();
renderAll();
