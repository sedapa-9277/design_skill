(() => {
  // 내 폰 저장판: 모든 기록은 이 기기의 IndexedDB에만 저장한다 (서버 없음)
  // 온라인 출석부와 같은 주소(origin)를 쓰므로 localStorage 키가 겹치지 않게 따로 둔다
  const TEAM_KEY = "soccer-local-team";
  const DB_NAME = "soccer-attendance-local";
  const BACKUP_APP = "soccer-attendance-local";
  const BACKUP_REMIND_DAYS = 14;

  // [팀 이름, 주소 뒤 # 링크]
  const TEAMS = [["믿음", "faith"], ["소망", "hope"], ["사랑", "love"]];
  // 삭제한(쓰지 않는) 팀 링크는 null — 첫 번째 사용 중인 팀으로 간다
  const teamFromHash = () => TEAMS.find(([t, h]) => "#" + h === location.hash && isActiveTeam(t))?.[0] || null;

  const GAMES = [1, 2, 3, 4, 5, 6];
  const WD_KO = ["일", "월", "화", "수", "목", "금", "토"];
  const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const $ = (id) => document.getElementById(id);

  // ---------- 설정: 언어(기본 영어)와 화면 모드 ----------
  const LANG_KEY = "soccer-local-lang";
  const THEME_KEY = "soccer-local-theme";
  let lang = "en";
  try { if (localStorage.getItem(LANG_KEY) === "ko") lang = "ko"; } catch (e) { /* 저장 불가 시 기본값 */ }
  // 한국어/영어 문구 고르기: 소스에는 한국어를 먼저 쓰고 영어를 옆에 둔다
  const L = (ko, en) => (lang === "ko" ? ko : en);
  const wd = (i) => (lang === "ko" ? WD_KO : WD_EN)[i];
  const monthName = (m) => L(`${m + 1}월`, MON_EN[m]); // m: 0~11
  // 기본 팀 이름(영어): 회원 관리에서 바꾼 이름이 있으면 그 이름을 쓴다
  const TEAM_EN = { 믿음: "Faith", 소망: "Hope", 사랑: "Love" };

  // 포메이션: [포지션, x%, y%] — 위쪽이 상대 골문, 첫 번째는 항상 GK
  const FORMATIONS = {
    "4-4-2": [["GK", 50, 91], ["LB", 14, 72], ["CB", 38, 75], ["CB", 62, 75], ["RB", 86, 72],
              ["LM", 14, 47], ["CM", 38, 51], ["CM", 62, 51], ["RM", 86, 47], ["ST", 37, 22], ["ST", 63, 22]],
    "4-3-3": [["GK", 50, 91], ["LB", 14, 72], ["CB", 38, 75], ["CB", 62, 75], ["RB", 86, 72],
              ["CM", 24, 50], ["CM", 50, 54], ["CM", 76, 50], ["LW", 16, 23], ["ST", 50, 18], ["RW", 84, 23]],
    "4-2-3-1": [["GK", 50, 91], ["LB", 14, 73], ["CB", 38, 76], ["CB", 62, 76], ["RB", 86, 73],
                ["DM", 36, 57], ["DM", 64, 57], ["LW", 15, 36], ["CAM", 50, 38], ["RW", 85, 36], ["ST", 50, 15]],
    "3-5-2": [["GK", 50, 91], ["CB", 24, 74], ["CB", 50, 77], ["CB", 76, 74],
              ["LWB", 11, 49], ["CM", 31, 53], ["CM", 50, 45], ["CM", 69, 53], ["RWB", 89, 49], ["ST", 37, 21], ["ST", 63, 21]],
  };
  const DEFAULT_FORMATION = "4-4-2";

  // ---------- 상태 ----------
  const S = {
    mode: "loading",          // loading | live | offline (저장소를 못 열었을 때)
    team: "믿음",
    members: new Map(),       // id -> {name, active, team, created_at}
    days: new Map(),          // "YYYY-MM-DD" -> {att: {memberId: {g1:true,...}}, lineup: {팀: {g1: {formation, pos: {s0: memberId}}}}}
    lastBackup: null,         // 마지막 백업 시각 (ISO 문자열)
    persisted: null,          // 브라우저가 저장소를 지우지 않도록 보호되는지
    lineupGame: 1,
    pickSlot: null,
    date: ymd(new Date()),
    period: "month",
    rankSort: "rate",         // rate | name
    rankOpen: null,           // 통계에서 최근 10경기를 펼친 회원 id
    shownGames: new Map(),    // "date|팀" -> 출석판에 직접 늘려 둔 경기 수
    confirmDeleteDay: null,   // "date|팀": 날짜 기록 삭제 확인 중
    confirmClearGame: null,   // "date|팀|gN": 경기 참석 초기화 확인 중
    teamNames: {},            // 팀 구분값 -> 화면에 보이는 팀 이름
    teamActive: { 믿음: true, 소망: true, 사랑: true }, // 팀 구분값 -> 사용 중인지 (최소 1팀)
    addingTeam: false,        // 회원 관리에서 새 팀 이름 입력 중
    confirmTeamDel: null,     // 팀 삭제 확인 중인 팀
    confirmTeamPurge: null,   // 팀 회원 전체 삭제 확인 중인 팀
    editTeamName: false,      // 회원 관리에서 팀 이름 고치는 중
    confirmDel: null,
    confirmPurge: null,
    editId: null,
    editDraft: null,
    editTeam: null,
    unlockDate: null,         // "수정"을 눌러 잠금을 푼 지난 날짜 (날짜를 바꾸면 다시 잠긴다)
    recentShown: 5,           // 상단 "최근 모임"에 보이는 날짜 수 (설정에서 1~7)
    absentN: 3,             // 포지션 회원 고르기에서 "최근 N번 모임 불참"으로 나누는 N (설정에서 1~5)
  };

  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function parseYmd(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function label(s, short) {
    const d = parseYmd(s);
    return short ? `${d.getMonth() + 1}/${d.getDate()}(${wd(d.getDay())})`
                 : L(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${wd(d.getDay())})`,
                     `${wd(d.getDay())}, ${MON_EN[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
  }
  function shiftDate(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }

  function attended(date, mid, g) {
    return S.days.get(date)?.att?.[mid]?.[`g${g}`] === true;
  }
  // 지금 고른 팀의 회원만 (명단에서 뺀 회원 포함 여부 선택)
  function teamMembers(includeInactive) {
    return [...S.members.entries()]
      .filter(([, m]) => m.team === S.team && (includeInactive || m.active !== false))
      .sort((a, b) => a[1].name.localeCompare(b[1].name, "ko"));
  }
  function activeMembers() { return teamMembers(false); }
  function nameTakenBy(name, exceptId) {
    for (const [id, m] of S.members) if (id !== exceptId && m.active && m.name === name) return m;
    return null;
  }
  function memberName(id) { return S.members.get(id)?.name || L("(삭제된 회원)", "(deleted member)"); }
  // 화면에 보이는 팀 이름 (회원 관리에서 바꿀 수 있음). 저장된 이름이 없으면 "믿음팀"/"Faith"처럼 기본값
  function tn(team) { return S.teamNames[team] || L(`${team}팀`, TEAM_EN[team] || team); }
  function isActiveTeam(t) { return S.teamActive[t] !== false; }
  function activeTeams() { return TEAMS.filter(([t]) => isActiveTeam(t)); }

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  // msg는 문자열 또는 문구를 돌려주는 함수 (함수면 언어를 바꿀 때 다시 그린다)
  let noticeMsg = "";
  function showNotice(msg) {
    noticeMsg = msg;
    const text = typeof msg === "function" ? msg() : msg;
    const n = $("notice"); n.textContent = text; n.hidden = !text;
  }

  // ---------- 저장소 (IndexedDB, 못 쓰면 localStorage) ----------
  // 키 "data" 하나에 회원·출석·포지션 전체를 통째로 저장한다. 동호회 한 곳 분량이라 충분히 작다
  let idb = null;
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("no_idb")); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore("kv");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("blocked"));
    });
  }
  function kvGet(key) {
    if (!idb) {
      try {
        const v = localStorage.getItem(`${DB_NAME}:${key}`);
        return Promise.resolve(v ? JSON.parse(v) : undefined);
      } catch (e) { return Promise.reject(e); }
    }
    return new Promise((resolve, reject) => {
      try {
        const r = idb.transaction("kv").objectStore("kv").get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      } catch (e) { reject(e); }
    });
  }
  function kvSet(key, val) {
    if (!idb) {
      try { localStorage.setItem(`${DB_NAME}:${key}`, JSON.stringify(val)); return Promise.resolve(); }
      catch (e) { return Promise.reject(e); }
    }
    return new Promise((resolve, reject) => {
      try {
        const tx = idb.transaction("kv", "readwrite");
        tx.objectStore("kv").put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("abort"));
      } catch (e) { reject(e); }
    });
  }

  // ---------- 저장·백업 형식 <-> 메모리 상태 ----------
  function snapshot() {
    const days = {};
    for (const [d, v] of [...S.days].sort((a, b) => a[0].localeCompare(b[0]))) days[d] = v;
    return {
      app: BACKUP_APP,
      version: 1,
      savedAt: new Date().toISOString(),
      members: [...S.members].map(([id, m]) => ({ id, name: m.name, active: m.active !== false, team: m.team, injured: !!m.injured, ...(m.healedOn ? { healedOn: m.healedOn } : {}), created_at: m.created_at || null })),
      teamNames: { ...S.teamNames },
      teamActive: Object.fromEntries(TEAMS.map(([t]) => [t, isActiveTeam(t)])),
      days,
    };
  }

  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  const RESERVED_IDS = new Set(["__proto__", "constructor", "prototype"]);
  const MAX_MEMBERS = 2000;
  const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  const OPP_MAX = 20; // 상대팀 이름 최대 글자 수

  // 저장소·백업 파일에서 읽은 값을 검사해 메모리 형식으로 바꾼다. 형식이 아니면 null
  function parseData(o) {
    if (!o || typeof o !== "object" || !Array.isArray(o.members) || !o.days || typeof o.days !== "object") return null;
    const teams = new Set(TEAMS.map(([t]) => t));
    const members = new Map();
    for (const m of o.members) {
      // id는 객체 키로도 쓰이므로 형식을 제한한다 ("__proto__" 등으로 Object.prototype이 오염되는 것을 막음)
      if (!m || typeof m.id !== "string" || !SAFE_ID.test(m.id) || RESERVED_IDS.has(m.id)) continue;
      if (typeof m.name !== "string" || !m.name.trim() || !teams.has(m.team)) continue;
      if (members.size >= MAX_MEMBERS) break;
      const mem = { name: m.name.trim().slice(0, 40), active: m.active !== false, team: m.team, injured: m.injured === true, created_at: m.created_at || null };
      if (typeof m.healedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(m.healedOn)) mem.healedOn = m.healedOn;
      members.set(m.id, mem);
    }
    const days = new Map();
    for (const [d, v] of Object.entries(o.days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !v || typeof v !== "object") continue;
      const day = { att: {}, lineup: {} };
      for (const [mid, gs] of Object.entries(v.att || {})) {
        if (!members.has(mid) || !gs) continue;
        for (const g of GAMES) if (gs[`g${g}`] === true) (day.att[mid] ||= {})[`g${g}`] = true;
      }
      for (const [t, games] of Object.entries(v.lineup || {})) {
        if (!teams.has(t) || !games) continue;
        for (const g of GAMES) {
          const lu = games[`g${g}`];
          if (!lu) continue;
          const out = { pos: {} };
          if (FORMATIONS[lu.formation]) out.formation = lu.formation;
          if (typeof lu.opp === "string" && lu.opp.trim()) out.opp = lu.opp.trim().slice(0, OPP_MAX);
          for (let i = 0; i < 11; i++) {
            const mid = lu.pos?.[`s${i}`];
            if (members.has(mid)) out.pos[`s${i}`] = mid;
          }
          (day.lineup[t] ||= {})[`g${g}`] = out;
        }
      }
      if (Object.keys(day.att).length || Object.keys(day.lineup).length) days.set(d, day);
    }
    // 팀 이름 (예전 백업 파일에는 없을 수 있다)
    const teamNames = {};
    for (const [t, n] of Object.entries(o.teamNames || {})) {
      if (teams.has(t) && typeof n === "string" && n.trim()) teamNames[t] = n.trim().slice(0, 12);
    }
    // 사용 중인 팀 (예전 백업에는 없으니 모두 사용 중으로)
    const teamActive = Object.fromEntries(TEAMS.map(([t]) => [t, o.teamActive?.[t] !== false]));
    if (!Object.values(teamActive).some(Boolean)) TEAMS.forEach(([t]) => { teamActive[t] = true; });
    return { members, days, teamNames, teamActive };
  }

  function applyData(parsed) {
    S.members = parsed ? parsed.members : new Map();
    S.days = parsed ? parsed.days : new Map();
    S.teamNames = parsed ? parsed.teamNames : {};
    S.teamActive = parsed ? parsed.teamActive : Object.fromEntries(TEAMS.map(([t]) => [t, true]));
    S.addingTeam = false;
    S.confirmTeamDel = null;
    S.confirmTeamPurge = null;
    if (!isActiveTeam(S.team)) switchToTeam(activeTeams()[0][0]);
  }

  function countData(data) {
    let att = 0;
    for (const d of data.days.values()) for (const gs of Object.values(d.att)) att += Object.keys(gs).length;
    return { members: data.members.size, days: data.days.size, att };
  }
  const countText = (c) => L(`회원 ${c.members}명 · 모임 ${c.days}일 · 출석 ${c.att}건`,
    `${c.members} member${c.members === 1 ? "" : "s"} · ${c.days} day${c.days === 1 ? "" : "s"} · ${c.att} check-in${c.att === 1 ? "" : "s"}`);

  function dayOf(map, d) {
    if (!map.has(d)) map.set(d, { att: {}, lineup: {} });
    return map.get(d);
  }

  // ---------- 불러오기 ----------
  async function load() {
    try {
      try { idb = await openDb(); } catch (e) { idb = null; }
      const parsed = parseData(await kvGet("data"));
      applyData(parsed);
      try { S.lastBackup = (await kvGet("lastBackup")) || null; } catch (e) { S.lastBackup = null; }
      S.mode = "live";
      showNotice(idb ? "" : () => L("이 브라우저는 IndexedDB를 쓸 수 없어 임시 저장소에 저장합니다. 백업 파일을 자주 저장해 주세요.",
        "This browser can't use IndexedDB, so records are kept in temporary storage. Save a backup file often."));
    } catch (e) {
      S.mode = "offline";
      showNotice(() => L("이 기기의 저장소를 열 수 없습니다. 시크릿(비공개) 창이라면 일반 창에서 열어 주세요.",
        "Can't open this device's storage. If this is a private window, open the app in a normal window."));
    }
    renderAll();
  }

  // 저장에 실패하면 마지막으로 저장된 내용으로 되돌린다
  async function revert() {
    try {
      const parsed = parseData(await kvGet("data"));
      applyData(parsed);
    } catch (e) { /* 그대로 둔다 */ }
    renderAll();
  }

  // ---------- 저장 (이 폰의 저장소에) ----------
  let saveChain = Promise.resolve();
  function persistData() {
    const data = snapshot(); // 지금 상태를 바로 떠 두고, 저장은 순서대로 한 번에 하나씩
    const p = saveChain.then(() => kvSet("data", data));
    saveChain = p.catch(() => {});
    return p;
  }

  function fail(code) { throw new Error(code); }

  function handleErr(e) {
    const msg = String(e?.message || "");
    if (msg.includes("last_team")) {
      toast(L("마지막 남은 팀은 삭제할 수 없습니다.", "You can't delete the last remaining team."));
    } else if (msg.includes("max_teams")) {
      toast(L("팀은 최대 3개까지 만들 수 있습니다.", "You can have up to 3 teams."));
    } else if (msg.includes("duplicate_team_name")) {
      toast(L("다른 팀이 이미 쓰는 이름입니다.", "Another team already uses that name."));
    } else if (msg.includes("duplicate_name")) {
      toast(L("같은 이름의 회원이 이미 명단에 있습니다.", "A member with the same name is already on the roster."));
    } else if (msg.includes("wrong_team")) {
      toast(L("다른 팀 회원은 이 팀 포지션에 넣을 수 없습니다.", "Members of another team can't be placed in this team's lineup."));
    } else if (msg.includes("empty_name")) {
      toast(L("이름을 입력해 주세요.", "Please enter a name."));
    } else if (msg.includes("not_inactive")) {
      toast(L("명단에서 뺀 회원만 완전히 삭제할 수 있습니다.", "Only members removed from the roster can be permanently deleted."));
    } else {
      toast(L("이 폰에 저장하지 못했습니다. 저장 공간이 부족한지 확인해 주세요.", "Couldn't save on this phone. Check that there is enough storage space."));
    }
  }

  // change(): 규칙을 검사한 뒤 메모리 상태를 고친다. 성공하면 저장하고 okMsg를 띄우고 true를 돌려준다
  async function write(change, okMsg) {
    if (S.mode !== "live") { toast(L("저장소를 열지 못해 수정할 수 없습니다.", "Storage couldn't be opened, so changes can't be made.")); return false; }
    let r;
    try { r = change(); } catch (e) { handleErr(e); renderAll(); return false; }
    renderAll();
    try {
      await persistData();
    } catch (e) {
      handleErr(e);
      await revert();
      return false;
    }
    const okText = typeof okMsg === "function" ? okMsg(r) : okMsg;
    if (okText) toast(okText);
    return true;
  }

  // ---------- 규칙 (온라인판 DB 함수와 같은 규칙을 이 폰에서) ----------
  // 빈 칸 정리: 출석이 없는 회원, 포지션이 없는 팀, 아무 기록 없는 날짜를 지운다
  function tidyDay(date) {
    const day = S.days.get(date);
    if (!day) return;
    for (const [mid, gs] of Object.entries(day.att)) if (!Object.keys(gs).length) delete day.att[mid];
    for (const [t, games] of Object.entries(day.lineup)) if (!Object.keys(games).length) delete day.lineup[t];
    if (!Object.keys(day.att).length && !Object.keys(day.lineup).length) S.days.delete(date);
  }

  function slotsOf(day, team, g) {
    return day.lineup[team]?.[`g${g}`]?.pos || {};
  }

  // 출석 체크로 부상 표시를 풀 때, 어느 날짜 체크로 풀었는지 기억해 둔다 (그 체크를 되돌리면 부상 표시도 되돌린다)
  function healInjury(m, date) {
    if (!m.injured) return;
    m.injured = false;
    m.healedOn = date;
  }
  // 이 날짜 체크로 부상이 풀렸는데, 그날 출석이 하나도 남지 않으면 아직 뛰지 않은 것이므로 다시 부상으로
  function restoreInjuryIfUnplayed(m, mid, date) {
    if (m.healedOn !== date) return false;
    if (GAMES.some((g) => attended(date, mid, g))) return false;
    m.injured = true;
    delete m.healedOn;
    return true;
  }

  // 출석 해제 시 그 경기 포지션에서도 함께 뺀다. 출석 체크하면 부상 표시를 푼다
  function dbSetAttendance(date, mid, games, on) {
    const m = S.members.get(mid);
    if (!m) fail("no_member");
    if (on) healInjury(m, date);
    const day = dayOf(S.days, date);
    for (const g of games) {
      if (on) { (day.att[mid] ||= {})[`g${g}`] = true; continue; }
      if (day.att[mid]) delete day.att[mid][`g${g}`];
      for (const [t] of TEAMS) {
        const pos = slotsOf(day, t, g);
        for (const [s, v] of Object.entries(pos)) if (v === mid) delete pos[s];
      }
    }
    tidyDay(date);
    return !on && restoreInjuryIfUnplayed(m, mid, date);
  }

  function lineupEntry(date, team, g, formation) {
    const lu = ((dayOf(S.days, date).lineup[team] ||= {})[`g${g}`] ||= { pos: {} });
    if (!FORMATIONS[lu.formation]) lu.formation = formation;
    return lu;
  }

  // 포지션에 넣으면 그 경기 출석도 체크하고 부상 표시를 푼다. 한 경기에서 한 회원은 한 자리에만
  function dbPlace(date, team, g, slot, mid, formation) {
    if (mid && S.members.get(mid)?.team !== team) fail("wrong_team");
    const lu = lineupEntry(date, team, g, formation);
    if (mid) {
      healInjury(S.members.get(mid), date);
      for (const [s, v] of Object.entries(lu.pos)) if (v === mid) delete lu.pos[s];
      lu.pos[`s${slot}`] = mid;
      (S.days.get(date).att[mid] ||= {})[`g${g}`] = true;
    } else {
      delete lu.pos[`s${slot}`];
    }
    tidyDay(date);
  }

  function dbSetFormation(date, team, g, f) {
    if (!FORMATIONS[f]) fail("bad_formation");
    lineupEntry(date, team, g, f).formation = f;
  }

  // 상대팀 이름 (선택 입력): 그날 그 팀 그 경기에 붙는다. 비우면 지운다
  function dbSetOpponent(date, team, g, name, formation) {
    const lu = lineupEntry(date, team, g, formation);
    if (name) lu.opp = name;
    else delete lu.opp;
  }

  function newId() {
    try { return crypto.randomUUID(); } catch (e) { return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`; }
  }

  // 명단에 있는 회원끼리는 (팀이 달라도) 이름이 겹치면 안 된다
  function dbAddMembers(team, names) {
    let n = 0;
    for (const raw of names) {
      const name = String(raw).trim().slice(0, 40);
      if (!name || nameTakenBy(name)) continue;
      S.members.set(newId(), { name, active: true, team, created_at: new Date().toISOString() });
      n++;
    }
    return n;
  }

  function dbRename(id, name) {
    const m = S.members.get(id);
    if (!m) fail("no_member");
    if (!name) fail("empty_name");
    if (m.active !== false && nameTakenBy(name, id)) fail("duplicate_name");
    m.name = name;
  }

  // 팀을 옮기면 다른 팀 포지션에 들어가 있던 자리는 모두 뺀다 (출석 기록은 그대로)
  function dbSetTeam(id, team) {
    const m = S.members.get(id);
    if (!m) fail("no_member");
    m.team = team;
    for (const [date, day] of S.days) {
      for (const [t, games] of Object.entries(day.lineup)) {
        if (t === team) continue;
        for (const lu of Object.values(games)) {
          for (const [s, v] of Object.entries(lu.pos || {})) if (v === id) delete lu.pos[s];
        }
      }
      tidyDay(date);
    }
  }

  function dbSetActive(id, active) {
    const m = S.members.get(id);
    if (!m) fail("no_member");
    if (active && nameTakenBy(m.name, id)) fail("duplicate_name");
    m.active = active;
  }

  function dbSetInjured(id, injured) {
    const m = S.members.get(id);
    if (!m) fail("no_member");
    m.injured = injured;
    delete m.healedOn; // 직접 바꾸면 출석 체크와의 연결은 끊는다
  }

  // 완전 삭제: 명단에서 뺀 회원만. 출석·포지션 기록까지 모두 지운다
  function dbPurge(id) {
    const m = S.members.get(id);
    if (!m) fail("no_member");
    if (m.active !== false) fail("not_inactive");
    wipeMembers(new Set([id]));
  }

  // 회원 정보와 그 회원들의 출석·포지션 기록을 모두 지운다
  function wipeMembers(ids) {
    for (const id of ids) S.members.delete(id);
    for (const [date, day] of [...S.days]) {
      for (const id of ids) delete day.att[id];
      for (const games of Object.values(day.lineup)) {
        for (const lu of Object.values(games)) {
          for (const [s, v] of Object.entries(lu.pos || {})) if (ids.has(v)) delete lu.pos[s];
        }
      }
      tidyDay(date);
    }
  }

  // 팀 회원 전체 삭제 (명단에서 뺀 회원 포함). 팀은 남는다. 지운 회원 수를 돌려준다
  function dbPurgeTeamMembers(team) {
    const ids = new Set([...S.members].filter(([, m]) => m.team === team).map(([id]) => id));
    wipeMembers(ids);
    return ids.size;
  }

  // 팀 삭제: 회원·출석·포지션을 모두 지우고 팀을 쉬게 한다 (이름은 기본값으로). 마지막 한 팀은 지울 수 없다
  function dbDeleteTeam(team) {
    if (!isActiveTeam(team) || activeTeams().length <= 1) fail("last_team");
    dbPurgeTeamMembers(team);
    for (const [date, day] of [...S.days]) {
      delete day.lineup[team];
      tidyDay(date);
    }
    S.teamActive[team] = false;
    delete S.teamNames[team];
  }

  // 팀 추가: 쉬고 있는 첫 번째 팀 자리를 새 이름으로 다시 쓴다. 그 팀 구분값을 돌려준다
  function dbAddTeam(name) {
    if (!name) fail("empty_name");
    const free = TEAMS.find(([t]) => !isActiveTeam(t));
    if (!free) fail("max_teams");
    if (activeTeams().some(([t]) => tn(t).toLowerCase() === name.toLowerCase())) fail("duplicate_team_name");
    const t = free[0];
    S.teamActive[t] = true;
    if (name === `${t}팀` || name === TEAM_EN[t]) delete S.teamNames[t]; // 기본 이름이면 언어에 따라 바뀌게 둔다
    else S.teamNames[t] = name;
    return t;
  }

  // 날짜 기록 삭제: 그날 이 팀 회원의 출석과 이 팀 포지션만 지운다
  function dbDeleteTeamDay(date, team) {
    const day = S.days.get(date);
    if (!day) return;
    for (const mid of Object.keys(day.att)) if (S.members.get(mid)?.team === team) delete day.att[mid];
    delete day.lineup[team];
    tidyDay(date);
  }

  // 한 경기 초기화: 그날 그 경기의 이 팀 출석과 포지션 자리를 지운다 (포메이션은 남긴다). 지운 출석 수를 돌려준다
  function dbClearTeamGame(date, team, g) {
    const day = S.days.get(date);
    if (!day) return 0;
    let n = 0;
    for (const [mid, gs] of Object.entries(day.att)) {
      if (S.members.get(mid)?.team === team && gs[`g${g}`]) { delete gs[`g${g}`]; n++; }
    }
    const lu = day.lineup[team]?.[`g${g}`];
    if (lu) lu.pos = {};
    tidyDay(date);
    return n;
  }

  // 팀 이름: 화면에 보이는 이름만 바꾼다 (기록은 믿음·소망·사랑 구분값으로 남는다)
  function dbRenameTeam(team, name) {
    if (!name) fail("empty_name");
    if (activeTeams().some(([t]) => t !== team && tn(t).toLowerCase() === name.toLowerCase())) fail("duplicate_team_name");
    if (name === `${team}팀` || name === TEAM_EN[team]) delete S.teamNames[team];
    else S.teamNames[team] = name;
  }

  // ---------- 지난 날짜 잠금: 오늘보다 이전 기록은 상단 "수정" 버튼을 눌러야 고칠 수 있다 ----------
  function isPastDate(d) { return d < ymd(new Date()); }
  function pastLocked() { return isPastDate(S.date) && S.unlockDate !== S.date; }
  // 잠겨 있으면 안내하고 true (호출한 곳은 수정을 멈춘다)
  function guardPast() {
    if (!pastLocked()) return false;
    toast(L("지난 날짜의 기록입니다. 위의 '수정' 버튼을 누른 뒤 고쳐 주세요.", "This is a past date. Tap the 'Edit' button above to make changes."));
    document.querySelectorAll("[data-edit-lock]").forEach((b) => {
      b.classList.remove("nudge");
      void b.offsetWidth; // 애니메이션을 처음부터 다시
      b.classList.add("nudge");
    });
    return true;
  }
  function toggleEditLock() {
    S.unlockDate = pastLocked() ? S.date : null;
    renderEditLock();
    toast(S.unlockDate ? L("지난 기록을 수정할 수 있습니다. 다 고치면 '완료'를 눌러 주세요.", "You can now edit this past record. Tap 'Done' when finished.")
                       : L("지난 기록을 다시 잠갔습니다.", "Past record locked again."));
  }
  function renderEditLock() {
    const past = isPastDate(S.date);
    const locked = pastLocked();
    document.body.classList.toggle("past-locked", locked);
    document.querySelectorAll("[data-edit-lock]").forEach((b) => {
      b.hidden = !past;
      b.setAttribute("aria-pressed", !locked);
      b.classList.toggle("open", !locked);
      const icon = locked
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-1.9"/></svg>';
      b.innerHTML = `${icon}<span>${locked ? L("수정", "Edit") : L("완료", "Done")}</span>`;
      b.title = locked ? L("지난 날짜 기록 수정하기", "Edit this past record") : L("수정을 마치고 다시 잠그기", "Finish and lock again");
    });
  }

  // ---------- 출석 ----------
  function setGames(mid, games, on) {
    if (guardPast()) return Promise.resolve(false);
    const date = S.date;
    const fromLineup = !on && games.some((g) => lineupOf(date, g).slots.includes(mid));
    const healed = on && isInjured(mid);
    const base = fromLineup ? L(`${memberName(mid)} 님을 포지션에서도 뺐습니다.`, `${memberName(mid)} was also removed from the lineup.`)
      : healed ? L(`${memberName(mid)} 님의 부상 표시를 풀었습니다.`, `${memberName(mid)} is no longer marked injured.`) : null;
    // 해제로 부상 표시가 되돌아오면 그 안내를 보여 준다 (dbSetAttendance가 true를 돌려줌)
    const msg = (reinjured) => reinjured
      ? L(`${memberName(mid)} 님은 아직 경기에 나오지 않아 다시 부상으로 표시했습니다.`, `${memberName(mid)} hasn't played yet, so they're marked injured again.`)
      : base;
    return write(() => dbSetAttendance(date, mid, games, on), msg);
  }

  function isInjured(id) {
    return !!S.members.get(id)?.injured;
  }

  function toggleInjured(id) {
    const on = !isInjured(id);
    write(() => dbSetInjured(id, on),
      on ? L(`${memberName(id)} 님을 부상으로 표시했습니다.`, `${memberName(id)} marked as injured.`)
         : L(`${memberName(id)} 님의 부상 표시를 풀었습니다.`, `${memberName(id)} is no longer marked injured.`));
  }

  function toggleCell(mid, g) {
    return setGames(mid, [g], !attended(S.date, mid, g));
  }

  // ---------- 포지션 배치 ----------
  function lineupOf(date, g) {
    const t = S.team;
    const base = S.days.get(date)?.lineup?.[t]?.[`g${g}`] || {};
    let formation = base.formation;
    if (!FORMATIONS[formation]) formation = DEFAULT_FORMATION;
    const slots = FORMATIONS[formation].map((_, i) => {
      const v = base.pos?.[`s${i}`];
      return v && S.members.get(v)?.team === t ? v : null;
    });
    return { formation, slots, opp: base.opp || "" };
  }

  function setOpponent(raw) {
    const name = String(raw || "").trim().slice(0, OPP_MAX);
    const date = S.date, g = S.lineupGame, t = S.team;
    const lu = lineupOf(date, g);
    if (name === lu.opp) return;
    if (guardPast()) { renderLineup(); return; } // 입력한 글자를 원래대로 되돌린다
    write(() => dbSetOpponent(date, t, g, name, lu.formation),
      name ? L(`${g}경기 상대팀: ${name}`, `Game ${g} opponent: ${name}`) : L(`${g}경기 상대팀을 지웠습니다.`, `Cleared game ${g} opponent.`));
  }

  function placeMember(slotIdx, mid) {
    if (guardPast()) return;
    const date = S.date, g = S.lineupGame, t = S.team;
    const lu = lineupOf(date, g);
    const pos = FORMATIONS[lu.formation][slotIdx][0];
    // 사람을 넣을 때는 안내 없이 바로 반영한다 (자리를 비울 때만 안내)
    const msg = mid ? null
                    : L(`${pos} 자리를 비웠습니다. 출석은 출석판에서 해제할 수 있습니다.`,
                        `${pos} cleared. Attendance can be unchecked on the attendance board.`);
    // 다 채워도 시트를 닫지 않는다 (닫히면 휴대폰에서 화면이 맨 위로 돌아감) — 닫기는 "닫기" 버튼으로
    S.pickSlot = mid ? nextEmptySlot(lu.slots, slotIdx, mid) ?? slotIdx : slotIdx;
    write(() => dbPlace(date, t, g, slotIdx, mid || null, lu.formation), msg);
  }

  function nextEmptySlot(slots, from, mid) {
    const after = slots.map((v, i) => (i === from ? mid : v));
    for (let k = 1; k <= after.length; k++) {
      const i = (from + k) % after.length;
      if (!after[i]) return i;
    }
    return null;
  }

  // 그 경기에서 이 회원이 맡은 포지션 이름 (출석판 동그라미에 표시), 없으면 null
  function posLabel(date, mid, g) {
    const lu = lineupOf(date, g);
    const i = lu.slots.indexOf(mid);
    return i < 0 ? null : FORMATIONS[lu.formation][i][0];
  }

  // 포지션 구분 (색상용): 골키퍼 · 수비(…B) · 공격(ST·LW·RW) · 나머지는 미드필더
  function posRole(pos) {
    if (pos === "GK") return "gk";
    if (/B$/.test(pos)) return "def";
    if (/^(ST|LW|RW|CF)$/.test(pos)) return "fwd";
    return "mid";
  }

  function setFormation(f) {
    if (guardPast()) { renderLineup(); return; } // 고르던 포메이션을 원래대로 되돌린다
    const date = S.date, g = S.lineupGame, t = S.team;
    write(() => dbSetFormation(date, t, g, f));
  }

  // ---------- 포지션 배치를 그림(PNG)으로 저장 ----------
  // 그림(포지션·출석)에 쓰는 글꼴
  const BODY = '"IBM Plex Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
  // 한 줄에 들어가는 가장 큰 글자 크기 (min까지만 줄인다). 고른 크기로 c.font를 맞춰 둔다
  function fitFont(c, text, maxW, max, min) {
    let size = max;
    c.font = `700 ${size}px ${BODY}`;
    while (size > min && c.measureText(text).width > maxW) { size -= 2; c.font = `700 ${size}px ${BODY}`; }
    return size;
  }
  // 현재 c.font 기준으로 maxW에 맞게 줄을 나눈다 (띄어쓰기에서 먼저, 안 되면 글자 단위로)
  function wrapText(c, text, maxW) {
    const lines = [];
    let line = "";
    for (const word of text.split(/(\s+)/)) {
      if (c.measureText(line + word).width <= maxW) { line += word; continue; }
      if (line.trim()) { lines.push(line.trim()); line = ""; }
      for (const ch of word.trimStart()) {
        if (c.measureText(line + ch).width > maxW && line) { lines.push(line); line = ""; }
        line += ch;
      }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  }
  async function loadImgFonts() {
    try { await Promise.all([document.fonts.load(`500 30px ${BODY}`), document.fonts.load(`700 30px ${BODY}`)]); } catch (e) { /* 기본 글꼴로 그린다 */ }
  }

  async function drawLineupImage() {
    const g = S.lineupGame;
    const { formation, slots } = lineupOf(S.date, g);
    const spots = FORMATIONS[formation];

    const W = 1080, PAD = 22, TW = W - PAD * 2;
    const cv = document.createElement("canvas");
    const c = cv.getContext("2d");
    await loadImgFonts();

    // 제목 줄 나누기: 1줄 "팀 · 1경기", 상대팀이 있으면 다음 줄에 "VS 상대팀" (VS는 빨강).
    // 길면 글자를 줄이고, 그래도 넘치면 두 줄까지 나눈다
    const opp = lineupOf(S.date, g).opp;
    const title = `${tn(S.team)} · ${L(`${g}경기`, `Game ${g}`)}`;
    const tSize = fitFont(c, title, TW, 60, 40);
    const VS = "VS ";
    let oSize = 52, oppLines = [];
    if (opp) {
      oSize = fitFont(c, VS + opp, TW, 52, 40);
      c.font = `700 ${oSize}px ${BODY}`;
      oppLines = wrapText(c, opp, TW - c.measureText(VS).width).slice(0, 2);
    }
    const tY = 84;
    const oY = tY + 14 + oSize;
    const metaY = (opp ? oY + (oppLines.length - 1) * (oSize + 10) : tY) + 56;
    const HEAD = metaY + 44;

    const PW = W - PAD * 2, PH = Math.round(PW * 100 / 68);
    const H = HEAD + PH + PAD + 50;
    cv.width = W;
    cv.height = H;

    const round = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };

    // 배경과 제목
    c.fillStyle = "#0f1f15";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#ffffff";
    c.textBaseline = "alphabetic";
    c.font = `700 ${tSize}px ${BODY}`;
    c.fillText(title, PAD, tY, TW);
    if (opp) {
      c.font = `700 ${oSize}px ${BODY}`;
      const vsW = c.measureText(VS).width;
      c.fillStyle = "#ff5a4e";
      c.fillText(VS.trim(), PAD, oY);
      c.fillStyle = "#ffffff";
      oppLines.forEach((t, n) => c.fillText(t, PAD + vsW, oY + n * (oSize + 10), TW - vsW));
    }
    c.font = `500 32px ${BODY}`;
    c.fillStyle = "#b9d7c2";
    c.fillText(`${label(S.date)}  ·  ${formation}  ·  ${slots.filter(Boolean).length}/11${L("명", "")}`, PAD, metaY, TW);

    // 구장: 잔디 줄무늬와 라인
    const X = PAD, Y = HEAD;
    round(X, Y, PW, PH, 22);
    c.save();
    c.clip();
    for (let i = 0; i < 10; i++) {
      c.fillStyle = i % 2 ? "#2a7d43" : "#2f8a4a";
      c.fillRect(X, Y + (PH / 10) * i, PW, PH / 10 + 1);
    }
    c.strokeStyle = "rgba(255,255,255,.7)";
    c.lineWidth = 4;
    const line = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    line(X, Y + PH / 2, X + PW, Y + PH / 2);
    c.beginPath();
    c.arc(X + PW / 2, Y + PH / 2, PW * 0.135, 0, Math.PI * 2);
    c.stroke();
    c.strokeRect(X + PW * 0.2, Y - 2, PW * 0.6, PH * 0.16);
    c.strokeRect(X + PW * 0.37, Y - 2, PW * 0.26, PH * 0.06);
    c.strokeRect(X + PW * 0.2, Y + PH * 0.84 + 2, PW * 0.6, PH * 0.16);
    c.strokeRect(X + PW * 0.37, Y + PH * 0.94 + 2, PW * 0.26, PH * 0.06);
    c.restore();
    round(X, Y, PW, PH, 22);
    c.lineWidth = 5;
    c.stroke();

    // 선수 (설정의 포지션 색상이 컬러면 화면과 같은 색으로)
    const colored = posColorMode() === "color";
    const css = getComputedStyle(document.documentElement);
    const roleColor = (role) => css.getPropertyValue(`--pos-${role}`).trim();
    const darkText = { gk: "#2b2100", def: css.getPropertyValue("--pos-def-fg").trim() || "#17320a" };
    c.textAlign = "center";
    spots.forEach(([pos, px, py], i) => {
      const cx = X + (PW * px) / 100, cy = Y + (PH * py) / 100;
      const mid = slots[i];
      const role = posRole(pos);
      const R = 62;
      c.beginPath();
      c.arc(cx, cy, R, 0, Math.PI * 2);
      if (mid && colored) {
        c.fillStyle = roleColor(role);
        c.fill();
        c.strokeStyle = "#ffffff";
        c.lineWidth = 4;
        c.stroke();
        c.fillStyle = darkText[role] || "#ffffff";
      } else if (mid) {
        c.fillStyle = i === 0 ? "#ffd23f" : "#ffffff";
        c.fill();
        c.fillStyle = i === 0 ? "#2b2100" : "#174f2b";
      } else if (colored) {
        c.save();
        c.globalAlpha = 0.38;
        c.fillStyle = roleColor(role);
        c.fill();
        c.restore();
        c.setLineDash([10, 8]);
        c.strokeStyle = roleColor(role);
        c.lineWidth = 4;
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#ffffff";
      } else {
        c.fillStyle = "rgba(0,0,0,.22)";
        c.fill();
        c.setLineDash([10, 8]);
        c.strokeStyle = "rgba(255,255,255,.85)";
        c.lineWidth = 3;
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = "#ffffff";
      }
      c.font = `700 ${pos.length > 2 ? 30 : 36}px ${BODY}`;
      c.textBaseline = "middle";
      c.fillText(pos, cx, cy + 1);

      const name = mid ? memberName(mid) : "-";
      c.font = `700 42px ${BODY}`;
      const tw = Math.min(c.measureText(name).width, 250);
      const bw = tw + 34, bh = 60, by = cy + R + 8;
      round(cx - bw / 2, by, bw, bh, 10);
      c.fillStyle = mid ? "rgba(0,0,0,.72)" : "rgba(0,0,0,0)";
      c.fill();
      c.fillStyle = mid ? "#ffffff" : "rgba(255,255,255,.7)";
      c.fillText(name, cx, by + bh / 2 + 2, 250);
    });

    // 바닥 글씨
    c.textAlign = "right";
    c.textBaseline = "alphabetic";
    c.font = `500 24px ${BODY}`;
    c.fillStyle = "#6f8f78";
    c.fillText("Best Line-up", W - PAD, H - 30);

    return new Promise((resolve) => cv.toBlob(resolve, "image/png"));
  }

  // 출석판 그림: 회원별 줄에 출석판에 보이는 경기만큼 동그라미 (포지션이 있으면 포지션 이름)
  async function drawAttendanceImage() {
    const list = activeMembers();
    const games = visibleGames();
    const present = list.filter(([id]) => GAMES.some((g) => attended(S.date, id, g))).length;

    const W = 1080, PAD = 22, HEAD = 190, TH = 70, ROW = 66, FOOT = 70;
    const H = HEAD + TH + ROW * list.length + FOOT;
    const NAME_W = 330;
    const colW = (W - PAD * 2 - NAME_W) / games.length;
    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const c = cv.getContext("2d");
    await loadImgFonts();

    const colored = posColorMode() === "color";
    const css = getComputedStyle(document.documentElement);
    const roleColor = (role) => css.getPropertyValue(`--pos-${role}`).trim();
    const darkText = { gk: "#2b2100", def: css.getPropertyValue("--pos-def-fg").trim() || "#17320a" };

    // 배경과 제목
    c.fillStyle = "#0f1f15";
    c.fillRect(0, 0, W, H);
    c.fillStyle = "#ffffff";
    c.textBaseline = "alphabetic";
    const title = `${tn(S.team)} · ${L("출석", "Attendance")}`;
    fitFont(c, title, W - PAD * 2, 60, 40);
    c.fillText(title, PAD, 92, W - PAD * 2);
    c.font = `500 32px ${BODY}`;
    c.fillStyle = "#b9d7c2";
    c.fillText(`${label(S.date)}  ·  ${L(`참석 ${present}명 / ${list.length}명`, `Present ${present} / ${list.length}`)}`, PAD, 146, W - PAD * 2);

    // 머리줄: 이름, 경기별 인원
    const colX = (i) => PAD + NAME_W + colW * i + colW / 2;
    let y = HEAD;
    c.fillStyle = "#1b3a26";
    c.beginPath();
    c.roundRect(PAD, y, W - PAD * 2, TH, 14);
    c.fill();
    c.textBaseline = "middle";
    c.fillStyle = "#ffffff";
    c.textAlign = "left";
    c.font = `700 30px ${BODY}`;
    c.fillText(L("이름", "Name"), PAD + 22, y + TH / 2);
    c.textAlign = "center";
    games.forEach((g, i) => {
      const n = list.filter(([id]) => attended(S.date, id, g)).length;
      c.font = `700 28px ${BODY}`;
      c.fillStyle = "#ffffff";
      c.fillText(L(`${g}경기`, `G${g}`), colX(i), y + TH / 2 - 11);
      c.font = `500 22px ${BODY}`;
      c.fillStyle = "#b9d7c2";
      c.fillText(L(`${n}명`, `${n}`), colX(i), y + TH / 2 + 18);
    });
    y += TH;

    // 회원 줄
    const R = Math.min(25, colW * 0.32);
    list.forEach(([id, m], r) => {
      if (r % 2) {
        c.fillStyle = "rgba(255,255,255,.04)";
        c.fillRect(PAD, y, W - PAD * 2, ROW);
      }
      const cy = y + ROW / 2;
      const hurt = isInjured(id);
      c.textAlign = "left";
      c.font = `700 32px ${BODY}`;
      c.fillStyle = hurt ? "rgba(255,255,255,.5)" : "#ffffff";
      const nameMax = NAME_W - 30 - (hurt ? 64 : 0);
      c.fillText(m.name, PAD + 22, cy + 1, nameMax);
      if (hurt) {
        const nw = Math.min(c.measureText(m.name).width, nameMax);
        c.font = `700 20px ${BODY}`;
        c.fillStyle = "#ff8a7a";
        c.fillText(L("부상", "Inj."), PAD + 22 + nw + 10, cy + 2);
      }
      c.textAlign = "center";
      games.forEach((g, i) => {
        const cx = colX(i);
        const on = attended(S.date, id, g);
        const pos = on ? posLabel(S.date, id, g) : null;
        c.beginPath();
        c.arc(cx, cy, R, 0, Math.PI * 2);
        if (!on) {
          c.strokeStyle = "rgba(255,255,255,.22)";
          c.lineWidth = 3;
          c.stroke();
          return;
        }
        const role = pos ? posRole(pos) : null;
        c.fillStyle = pos && colored ? roleColor(role) : pos === "GK" ? "#ffd23f" : "#ffffff";
        c.fill();
        if (pos) {
          c.fillStyle = colored ? darkText[role] || "#ffffff" : pos === "GK" ? "#2b2100" : "#174f2b";
          c.font = `700 ${pos.length > 2 ? 17 : 20}px ${BODY}`;
          c.fillText(pos, cx, cy + 1, R * 2 - 4);
        } else {
          // 참석만 체크: 초록 체크 표시
          c.strokeStyle = "#1f7a3e";
          c.lineWidth = 5;
          c.lineCap = "round";
          c.lineJoin = "round";
          c.beginPath();
          c.moveTo(cx - R * 0.42, cy + R * 0.02);
          c.lineTo(cx - R * 0.1, cy + R * 0.34);
          c.lineTo(cx + R * 0.45, cy - R * 0.3);
          c.stroke();
        }
      });
      y += ROW;
      c.strokeStyle = "rgba(255,255,255,.08)";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(PAD, y);
      c.lineTo(W - PAD, y);
      c.stroke();
    });

    // 바닥 글씨
    c.textAlign = "right";
    c.textBaseline = "alphabetic";
    c.font = `500 24px ${BODY}`;
    c.fillStyle = "#6f8f78";
    c.fillText("Best Line-up", W - PAD, H - 26);

    return new Promise((resolve) => cv.toBlob(resolve, "image/png"));
  }

  function safeTeamName() { return tn(S.team).replace(/[\\/:*?"<>|\s]+/g, "_"); }

  function saveLineupImage() {
    const g = S.lineupGame;
    const opp = lineupOf(S.date, g).opp;
    return openShot($("saveLineupBtn"), drawLineupImage,
      `${safeTeamName()}_${S.date}_${L(`${g}경기`, `game${g}`)}.png`,
      `${tn(S.team)} · ${S.date} · ${L(`${g}경기`, `Game ${g}`)}`, opp);
  }

  function saveAttendanceImage() {
    if (S.mode !== "live") { toast(L("기록을 불러온 뒤에 다시 눌러 주세요.", "Please try again after records load.")); return; }
    if (!activeMembers().length) { toast(L("회원을 먼저 추가해 주세요.", "Add members first.")); return; }
    return openShot($("saveAttBtn"), drawAttendanceImage,
      `${safeTeamName()}_${S.date}_${L("출석", "attendance")}.png`,
      `${tn(S.team)} · ${S.date} · ${L("출석", "Attendance")}`);
  }

  // 그림을 화면에 띄운다. 휴대폰은 그림을 길게 눌러 사진에 저장하는 것이 가장 확실하다
  let shot = null; // {blob, name, dataUrl}
  async function openShot(btn, draw, name, title, opp) {
    btn.disabled = true;
    try {
      const blob = await draw();
      if (!blob) throw new Error("no blob");
      const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      shot = { blob, name, dataUrl };
      const touch = window.matchMedia("(pointer: coarse)").matches;
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      $("imgPreview").src = dataUrl;
      $("imgPreview").alt = opp ? `${title} vs ${opp}` : title;
      // 창 제목: 상대팀이 있으면 다음 줄에 "VS 상대팀" (VS는 빨강)
      const head = $("imgModalTitle");
      head.replaceChildren(title);
      if (opp) {
        const line = document.createElement("span");
        line.className = "img-opp";
        const vs = document.createElement("span");
        vs.className = "vs";
        vs.textContent = "VS";
        line.append(vs, ` ${opp}`);
        head.append(line);
      }
      $("imgTip").innerHTML = !touch
        ? L("<b>파일로 저장</b>을 누르면 PNG 파일로 내려받습니다.", "Tap <b>Save file</b> to download a PNG file.")
        : ios
          ? L("그림을 <b>길게 눌러</b> <b>'사진 앱에 저장'</b>을 고르세요.", "<b>Press and hold</b> the image, then choose <b>'Save to Photos'</b>.")
          : L("그림을 <b>길게 눌러</b> <b>'이미지 다운로드'</b>를 고르면 갤러리에 저장됩니다.", "<b>Press and hold</b> the image and choose <b>'Download image'</b> to save it to your gallery.");
      const file = new File([blob], name, { type: "image/png" });
      $("imgShareBtn").hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      $("imgModal").hidden = false;
      document.body.classList.add("modal-open");
      $("imgCloseBtn").focus();
    } catch (e) {
      toast(L("그림을 만들지 못했습니다. 다시 눌러 주세요.", "Couldn't create the image. Please try again."));
    } finally {
      btn.disabled = false;
    }
  }

  function closeImageModal() {
    $("imgModal").hidden = true;
    document.body.classList.remove("modal-open");
    $("imgPreview").removeAttribute("src");
    shot = null;
  }

  function downloadShot() {
    if (!shot) return;
    const url = URL.createObjectURL(shot.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = shot.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast(L("파일로 저장했습니다. 휴대폰은 '다운로드' 또는 '파일' 앱에서 찾을 수 있습니다.", "Saved. On a phone, look in the Downloads or Files app."));
  }

  async function shareShot() {
    if (!shot) return;
    try {
      await navigator.share({ files: [new File([shot.blob], shot.name, { type: "image/png" })], title: shot.name });
      toast(L("그림을 공유했습니다.", "Image shared."));
    } catch (e) {
      if (e?.name !== "AbortError") toast(L("공유하지 못했습니다. 그림을 길게 눌러 저장해 주세요.", "Couldn't share. Press and hold the image to save it."));
    }
  }

  // ---------- 회원 ----------
  function addMembers(names) {
    const taken = names.map((n) => [n, nameTakenBy(n)]).filter(([, m]) => m);
    const fresh = names.filter((n) => !nameTakenBy(n));
    if (taken.length) {
      const [n, m] = taken[0];
      toast(m.team === S.team
        ? L(`${n} 님은 이미 ${tn(m.team)}에 있습니다.`, `${n} is already on ${tn(m.team)}.`)
        : L(`${n} 님은 ${tn(m.team)} 회원입니다. 회원 관리에서 팀을 옮길 수 있습니다.`, `${n} is a member of ${tn(m.team)}. You can move teams in Members.`));
    }
    if (!fresh.length) return;
    const team = S.team;
    write(() => dbAddMembers(team, fresh),
      (n) => L(`${tn(team)}에 ${n ?? fresh.length}명을 추가했습니다${taken.length ? ` (이미 있는 ${taken.length}명 제외)` : ""}.`,
               `Added ${n ?? fresh.length} to ${tn(team)}${taken.length ? ` (${taken.length} already listed)` : ""}.`));
  }

  async function moveMember(id, team) {
    const m = S.members.get(id);
    if (!m || m.team === team) return true;
    return write(() => dbSetTeam(id, team),
      L(`${m.name} 님을 ${tn(team)}으로 옮겼습니다.`, `Moved ${m.name} to ${tn(team)}.`));
  }

  function removeMember(id) {
    const name = memberName(id);
    write(() => dbSetActive(id, false),
      L(`${name} 님을 명단에서 뺐습니다. 지난 기록은 남아 있습니다.`, `Removed ${name} from the roster. Past records are kept.`));
  }

  function restoreMember(id) {
    const m = S.members.get(id);
    if (!m) return;
    const other = nameTakenBy(m.name, id);
    if (other) { toast(L(`같은 이름(${m.name})의 회원이 이미 ${tn(other.team)} 명단에 있습니다.`, `A member named ${m.name} is already on ${tn(other.team)}.`)); return; }
    write(() => dbSetActive(id, true),
      L(`${m.name} 님을 명단에 다시 넣었습니다.`, `${m.name} is back on the roster.`));
  }

  function purgeMember(id) {
    const name = memberName(id);
    write(() => dbPurge(id),
      L(`${name} 님의 회원 정보와 모든 출석·포지션 기록을 완전히 삭제했습니다.`, `Permanently deleted ${name} and all attendance and lineup records.`));
  }

  // 이름 수정과 팀 이동을 함께 저장
  async function saveMember(id, raw, team) {
    const m = S.members.get(id);
    const name = String(raw || "").trim().slice(0, 40);
    if (!m) return;
    if (!name) { toast(L("이름을 입력해 주세요.", "Please enter a name.")); return; }
    if (name !== m.name) {
      const other = nameTakenBy(name, id);
      if (other) { toast(L(`같은 이름(${name})의 회원이 이미 ${tn(other.team)}에 있습니다.`, `A member named ${name} is already on ${tn(other.team)}.`)); return; }
      const ok = await write(() => dbRename(id, name),
        L(`${m.name} → ${name}(으)로 이름을 바꿨습니다.`, `Renamed ${m.name} → ${name}.`));
      if (!ok) return;
    }
    if (team !== m.team && !(await moveMember(id, team))) return;
    S.editId = null;
    S.editDraft = null;
    S.editTeam = null;
    renderMembers();
  }

  // ---------- 팀 이름 변경 (지금 고른 팀) ----------
  function renderTeamName() {
    const row = $("teamNameRow");
    row.replaceChildren();
    if (!S.editTeamName) {
      const label = document.createElement("span");
      label.className = "muted";
      label.textContent = L("팀 이름", "Team name");
      const name = document.createElement("b");
      name.textContent = tn(S.team);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "row-btn";
      btn.textContent = L("변경", "Edit");
      btn.setAttribute("aria-label", L(`${tn(S.team)} 이름 변경`, `Rename ${tn(S.team)}`));
      btn.addEventListener("click", () => {
        S.editTeamName = true;
        renderTeamName();
      });
      row.append(label, name, btn);
      return;
    }
    const input = document.createElement("input");
    input.type = "text";
    input.id = "teamNameInput";
    input.className = "edit-input";
    input.maxLength = 12;
    input.value = tn(S.team);
    input.setAttribute("aria-label", L("새 팀 이름", "New team name"));
    const save = document.createElement("button");
    save.type = "button";
    save.className = "row-btn";
    save.textContent = L("저장", "Save");
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "row-btn";
    cancel.textContent = L("취소", "Cancel");
    const doCancel = () => { S.editTeamName = false; renderTeamName(); };
    const doSave = () => saveTeamName(input.value);
    save.addEventListener("click", doSave);
    cancel.addEventListener("click", doCancel);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSave(); }
      if (e.key === "Escape") doCancel();
    });
    row.append(input, save, cancel);
    setTimeout(() => { input.focus(); input.select(); }, 0);
  }

  async function saveTeamName(raw) {
    const name = String(raw || "").trim().slice(0, 12);
    const team = S.team, before = tn(team);
    if (!name) { toast(L("팀 이름을 입력해 주세요.", "Please enter a team name.")); return; }
    if (name === before) { S.editTeamName = false; renderTeamName(); return; }
    if (activeTeams().some(([t]) => t !== team && tn(t).toLowerCase() === name.toLowerCase())) {
      toast(L("다른 팀이 이미 쓰는 이름입니다.", "Another team already uses that name."));
      return;
    }
    const ok = await write(() => dbRenameTeam(team, name),
      L(`${before} → ${name}(으)로 팀 이름을 바꿨습니다.`, `Renamed team ${before} → ${name}.`));
    if (ok) { S.editTeamName = false; renderAll(); }
  }

  // ---------- 팀 관리: 추가 · 삭제 · 회원 전체 삭제 ----------
  // 두 번 눌러야 실행되는 빨간 버튼 (4초 안에 다시 누르지 않으면 원래대로)
  function teamConfirmButton(text, confirmText, stateKey, disabled, onConfirm) {
    const b = document.createElement("button");
    b.type = "button";
    const confirming = !disabled && S[stateKey] === S.team;
    b.className = "row-btn danger" + (confirming ? " confirm" : "");
    b.textContent = confirming ? confirmText : text;
    b.disabled = disabled;
    b.addEventListener("click", () => {
      const team = S.team;
      if (S[stateKey] === team) { S[stateKey] = null; onConfirm(team); return; }
      S[stateKey] = team;
      renderTeamTools();
      setTimeout(() => { if (S[stateKey] === team) { S[stateKey] = null; renderTeamTools(); } }, 4000);
    });
    return b;
  }

  function renderTeamTools() {
    const box = $("teamTools");
    box.replaceChildren();
    if (S.addingTeam) {
      const input = document.createElement("input");
      input.type = "text";
      input.id = "newTeamInput";
      input.className = "edit-input";
      input.maxLength = 12;
      input.placeholder = L("새 팀 이름", "New team name");
      input.setAttribute("aria-label", L("새 팀 이름", "New team name"));
      const add = document.createElement("button");
      add.type = "button";
      add.className = "row-btn";
      add.textContent = L("추가", "Add");
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "row-btn";
      cancel.textContent = L("취소", "Cancel");
      const doAdd = () => addTeam(input.value);
      const doCancel = () => { S.addingTeam = false; renderTeamTools(); };
      add.addEventListener("click", doAdd);
      cancel.addEventListener("click", doCancel);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); doAdd(); }
        if (e.key === "Escape") doCancel();
      });
      box.append(input, add, cancel);
      setTimeout(() => input.focus(), 0);
      return;
    }
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = L("팀 관리", "Teams");
    box.append(label);
    if (activeTeams().length < TEAMS.length) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "row-btn";
      add.textContent = L("팀 추가", "Add team");
      add.addEventListener("click", () => { S.addingTeam = true; S.confirmTeamDel = null; S.confirmTeamPurge = null; renderTeamTools(); });
      box.append(add);
    }
    const n = teamMembers(true).length;
    box.append(teamConfirmButton(L("회원 전체 삭제", "Delete all members"), L(`정말 ${n}명 모두 삭제할까요?`, `Really delete all ${n}?`), "confirmTeamPurge", n === 0, purgeTeamMembers));
    const last = activeTeams().length <= 1;
    const del = teamConfirmButton(L("팀 삭제", "Delete team"), L("정말 삭제할까요? 회원·기록 모두 삭제", "Really delete? Members and records too"), "confirmTeamDel", last, deleteTeam);
    if (last) del.title = L("마지막 남은 팀은 삭제할 수 없습니다", "You can't delete the last remaining team");
    box.append(del);
  }

  async function addTeam(raw) {
    const name = String(raw || "").trim().slice(0, 12);
    if (!name) { toast(L("팀 이름을 입력해 주세요.", "Please enter a team name.")); return; }
    if (activeTeams().some(([t]) => tn(t).toLowerCase() === name.toLowerCase())) { toast(L("다른 팀이 이미 쓰는 이름입니다.", "Another team already uses that name.")); return; }
    let team = null;
    const ok = await write(() => { team = dbAddTeam(name); }, L(`${name} 팀을 추가했습니다. 회원을 추가해 주세요.`, `Added team ${name}. Now add members.`));
    if (ok) { S.addingTeam = false; setTeam(team); }
  }

  function deleteTeam(team) {
    const name = tn(team);
    write(() => {
      dbDeleteTeam(team);
      switchToTeam(activeTeams()[0][0]);
    }, L(`${name}을(를) 삭제했습니다. 회원과 기록도 모두 지웠습니다.`, `Deleted ${name}, including its members and records.`));
  }

  function purgeTeamMembers(team) {
    const name = tn(team);
    write(() => dbPurgeTeamMembers(team), (n) => L(`${name} 회원 ${n}명과 그 기록을 모두 삭제했습니다.`, `Deleted ${n} members of ${name} and their records.`));
  }

  // 화면을 다시 그리지 않고 지금 팀만 바꾼다 (주소 # 와 마지막 팀 기억도 함께)
  function switchToTeam(team) {
    S.team = team;
    S.editTeamName = false;
    S.addingTeam = false;
    S.confirmTeamDel = null;
    S.confirmTeamPurge = null;
    S.rankOpen = null;
    S.pickSlot = null;
    S.editId = null;
    S.confirmDel = null;
    S.confirmPurge = null;
    try { localStorage.setItem(TEAM_KEY, team); } catch (e) { /* 저장 불가 시 무시 */ }
    const hash = "#" + TEAMS.find(([t]) => t === team)[1];
    // 뒤로가기 막이 기록(history.state)은 그대로 두고 주소만 바꾼다
    if (location.hash !== hash) history.replaceState(history.state, "", hash);
  }

  function setTeam(team) {
    if (!TEAMS.some(([t]) => t === team) || !isActiveTeam(team)) return;
    switchToTeam(team);
    renderAll();
  }

  function renderTeams() {
    const box = $("teamTabs");
    box.replaceChildren();
    const teams = activeTeams();
    // 팀 2개는 줄을 반씩 나눠 이름이 잘리지 않게, 1개면 절반 폭만 차지 (CSS의 .few.one)
    box.style.gridTemplateColumns = `repeat(${teams.length}, 1fr)`;
    box.classList.toggle("few", teams.length < 3);
    box.classList.toggle("one", teams.length === 1);
    // 고른 팀 이름이 길면 (휴대폰) 나머지 팀 글씨를 조금 줄인다
    box.classList.toggle("long", teams.length > 1 && tn(S.team).length > 4);
    for (const [t] of teams) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = `${tn(t)}`;
      b.setAttribute("aria-pressed", t === S.team);
      b.addEventListener("click", () => setTeam(t));
      box.append(b);
    }
  }

  // ---------- 백업 · 복원 ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  function daysSince(iso) { return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000); }

  function markBackedUp() {
    S.lastBackup = new Date().toISOString();
    kvSet("lastBackup", S.lastBackup).catch(() => {});
    renderBackup();
  }

  // 백업 파일을 만들어 저장·공유 창을 띄운다 (그림 저장과 같은 방식)
  let backup = null; // {blob, name, shareFile}
  function openBackup() {
    if (S.mode !== "live") { toast(L("저장소를 열지 못해 백업할 수 없습니다.", "Storage couldn't be opened, so a backup can't be made.")); return; }
    const text = JSON.stringify(snapshot(), null, 1);
    const name = `${L("출석부_백업", "lineup_backup")}_${ymd(new Date())}.json`;
    const blob = new Blob([text], { type: "application/json" });
    // 안드로이드 크롬은 .json 파일 공유를 막으므로, 막히면 같은 내용을 .txt로 공유한다
    let shareFile = null;
    try {
      const asJson = new File([blob], name, { type: "application/json" });
      const asText = new File([text], name.replace(/\.json$/, ".txt"), { type: "text/plain" });
      if (navigator.canShare?.({ files: [asJson] })) shareFile = asJson;
      else if (navigator.canShare?.({ files: [asText] })) shareFile = asText;
    } catch (e) { shareFile = null; }
    backup = { blob, name, shareFile };
    $("backupModalTitle").textContent = name;
    $("backupTip").innerHTML = `${esc(countText(countData(S)))}<br>` +
      (shareFile ? L("<b>파일로 저장</b>하거나 <b>공유하기</b>로 카톡·드라이브에 보내 두세요.", "<b>Save the file</b> or use <b>Share</b> to send it to a chat app or cloud drive.")
                 : L("<b>파일로 저장</b>한 뒤 카톡·드라이브 등에 올려 두세요.", "<b>Save the file</b>, then keep a copy in a chat app or cloud drive.")) +
      L(" 폰을 바꾸거나 앱을 지웠을 때 이 파일로 되살릴 수 있습니다.", " If you change phones or delete the app, you can restore from this file.");
    $("backupShareBtn").hidden = !shareFile;
    $("backupModal").hidden = false;
    document.body.classList.add("modal-open");
    $("backupCloseBtn").focus();
  }

  function closeBackup() {
    $("backupModal").hidden = true;
    document.body.classList.remove("modal-open");
    backup = null;
  }

  function downloadBackup() {
    if (!backup) return;
    const url = URL.createObjectURL(backup.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backup.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    markBackedUp();
    toast(L("백업 파일을 저장했습니다. 휴대폰은 '다운로드' 또는 '파일' 앱에서 찾을 수 있습니다.", "Backup saved. On a phone, look in the Downloads or Files app."));
  }

  async function shareBackup() {
    if (!backup?.shareFile) return;
    try {
      await navigator.share({ files: [backup.shareFile], title: backup.name });
      markBackedUp();
      toast(L("백업 파일을 보냈습니다.", "Backup file sent."));
    } catch (e) {
      if (e?.name !== "AbortError") toast(L("공유하지 못했습니다. '파일로 저장'을 눌러 주세요.", "Couldn't share. Tap 'Save file' instead."));
    }
  }

  // 중요한 작업 확인 창 (confirm()은 앱·웹뷰에서 안 뜨는 경우가 있어 직접 만든다)
  let askResolve = null;
  function askConfirm(title, html, okLabel) {
    if (askResolve) closeAsk(false);
    $("askTitle").textContent = title;
    $("askText").innerHTML = html;
    $("askOk").textContent = okLabel || L("확인", "OK");
    $("askModal").hidden = false;
    document.body.classList.add("modal-open");
    $("askCancel").focus();
    return new Promise((resolve) => { askResolve = resolve; });
  }
  function closeAsk(ok) {
    if (!askResolve) return;
    const r = askResolve;
    askResolve = null;
    $("askModal").hidden = true;
    document.body.classList.remove("modal-open");
    r(ok);
  }

  // 이 폰의 기록 전체를 바꾼다 (백업 불러오기)
  async function replaceAll(parsed, okMsg) {
    applyData(parsed);
    S.editTeamName = false;
    S.shownGames.clear();
    S.pickSlot = null;
    S.rankOpen = null;
    S.editId = null;
    S.confirmDeleteDay = null;
    renderAll();
    try {
      await persistData();
      toast(okMsg);
    } catch (e) {
      handleErr(e);
      await revert();
    }
  }

  function overwriteText(src, incoming) {
    const now = countData(S);
    return `${src}<br><b>${esc(countText(incoming))}</b><br><br>` +
      (now.members || now.days
        ? L(`지금 이 폰의 기록(${esc(countText(now))})을 <b>모두 지우고</b> 이 내용으로 바꿉니다. 되돌릴 수 없으니 필요하면 먼저 백업 파일을 저장하세요.`,
            `This will <b>erase all records</b> on this phone (${esc(countText(now))}) and replace them. This can't be undone, so save a backup first if needed.`)
        : L("이 폰에는 아직 기록이 없습니다. 이 내용으로 시작합니다.", "There are no records on this phone yet. You'll start with this data."));
  }

  async function importBackupFile(file) {
    if (S.mode !== "live") { toast(L("저장소를 열지 못해 불러올 수 없습니다.", "Storage couldn't be opened, so the backup can't be loaded.")); return; }
    if (file.size > MAX_BACKUP_BYTES) { toast(L("백업 파일이 너무 큽니다. 출석부 백업 파일이 맞는지 확인해 주세요.", "This file is too large. Make sure it's a backup from this app.")); return; }
    let parsed = null;
    try { parsed = parseData(JSON.parse(await file.text())); } catch (e) { parsed = null; }
    if (!parsed) { toast(L("출석부 백업 파일이 아닙니다. 백업 파일 저장으로 만든 파일을 골라 주세요.", "Not a backup file. Choose a file made with 'Save backup'.")); return; }
    const c = countData(parsed);
    const ok = await askConfirm(L("백업 불러오기", "Restore backup"), overwriteText(`${L("파일", "File")}: ${esc(file.name)}`, c), L("덮어쓰기", "Replace"));
    if (ok) await replaceAll(parsed, L(`백업을 불러왔습니다. ${countText(c)}`, `Backup restored. ${countText(c)}`));
  }

  // ---------- 저장 공간 보호 (브라우저가 공간 부족 때 임의로 지우지 않도록 요청) ----------
  async function askPersist() {
    try {
      if (!navigator.storage?.persisted) S.persisted = null;
      else {
        let p = await navigator.storage.persisted();
        if (!p && navigator.storage.persist) p = await navigator.storage.persist();
        S.persisted = p;
      }
    } catch (e) { S.persisted = null; }
    renderBackup();
  }

  function renderBackup() {
    const c = countData(S);
    $("dataCount").textContent = S.mode === "live" ? countText(c) : "-";
    const lb = S.lastBackup;
    const ago = lb ? daysSince(lb) : null;
    $("lastBackup").textContent = lb
      ? `${label(ymd(new Date(lb)), true)} (${ago <= 0 ? L("오늘", "today") : L(`${ago}일 전`, `${ago} day${ago === 1 ? "" : "s"} ago`)})`
      : L("아직 없음", "Never");
    $("persistState").textContent = S.persisted === true ? L("보호됨 (브라우저가 임의로 지우지 않음)", "Protected (the browser won't clear it on its own)")
      : S.persisted === false ? L("보호 안 됨 (공간이 부족하면 지워질 수 있음)", "Not protected (may be cleared when space runs low)") : L("확인할 수 없음", "Unknown");
    $("persistState").classList.toggle("warn", S.persisted === false);
    // 기록이 있는데 14일 넘게 백업하지 않았으면 백업 화면의 마지막 백업 날짜만 경고색 (첫 화면 알림줄은 없음)
    const due = S.mode === "live" && c.members > 0 && (!lb || ago >= BACKUP_REMIND_DAYS);
    $("lastBackup").classList.toggle("warn", due);
  }

  // ---------- 렌더 ----------
  // 그날 이 팀 회원 중 출석이 하나라도 있는지
  function hasAny(date) {
    const att = S.days.get(date)?.att || {};
    return Object.entries(att).some(([mid, gs]) =>
      S.members.get(mid)?.team === S.team && Object.values(gs).some((v) => v === true));
  }

  function renderHeader() {
    // 휴대폰에서는 연도를 숨겨 한 줄에 들어가게 한다
    const d = parseYmd(S.date);
    const y = document.createElement("span");
    y.className = "y";
    if (lang === "ko") {
      y.textContent = `${d.getFullYear()}년 `;
      $("dateBig").replaceChildren(y, `${d.getMonth() + 1}월 ${d.getDate()}일 (${wd(d.getDay())})`);
    } else {
      y.textContent = `, ${d.getFullYear()}`;
      $("dateBig").replaceChildren(`${wd(d.getDay())}, ${MON_EN[d.getMonth()]} ${d.getDate()}`, y);
    }
    $("calYear").textContent = d.getFullYear();
    $("calMonth").textContent = monthName(d.getMonth());
    $("calDay").textContent = d.getDate();
    // 달력 버튼 안에 작게 요일 (일요일은 빨강)
    $("calWd").textContent = wd(d.getDay());
    $("calWd").classList.toggle("sun", d.getDay() === 0);
    $("datePick").value = S.date;
    $("calDesk").textContent = `${S.date} (${wd(d.getDay())})`;
    $("calBtn").setAttribute("aria-label", L(`달력 열기, 지금 ${label(S.date)}`, `Open calendar, now ${label(S.date)}`));

    const dates = [...S.days.keys()].filter(hasAny).sort().reverse().slice(0, S.recentShown);
    const box = $("recent");
    box.replaceChildren();
    const lab = document.createElement("span");
    lab.className = "label";
    lab.textContent = L("최근 모임", "Recent");
    box.append(lab);
    // 이 팀에 기록이 없어도 줄은 그대로 두어, 팀을 바꿀 때 상단 높이가 들썩이지 않게 한다
    if (!dates.length) {
      const none = document.createElement("span");
      none.className = "none";
      none.textContent = L("아직 기록 없음", "No meetings yet");
      box.append(none);
      return;
    }
    for (const d of dates) {
      const b = document.createElement("button");
      b.textContent = label(d, true);
      b.setAttribute("aria-pressed", d === S.date);
      b.addEventListener("click", () => setDate(d));
      box.append(b);
    }
  }

  function renderLineup() {
    // 경기 탭도 출석판과 같은 규칙: 기본 4경기, 기록이 있거나 + 로 늘린 경기까지
    const games = visibleGames();
    if (!games.includes(S.lineupGame)) { S.lineupGame = games[games.length - 1]; S.pickSlot = null; }
    const g = S.lineupGame;
    const { formation, slots } = lineupOf(S.date, g);
    const spots = FORMATIONS[formation];

    const tabs = $("gameTabs");
    tabs.replaceChildren();
    for (const n of games) {
      const b = document.createElement("button");
      const filled = lineupOf(S.date, n).slots.filter(Boolean).length;
      b.setAttribute("aria-pressed", n === g);
      b.textContent = L(`${n}경기`, `Game ${n}`);
      if (filled) { const s = document.createElement("small"); s.textContent = `${filled}/11`; b.append(s); }
      b.addEventListener("click", () => { S.lineupGame = n; S.pickSlot = null; renderLineup(); });
      tabs.append(b);
    }
    const canAdd = games.length < GAMES.length;
    const canRemove = games.length > BASE_GAMES && games.length > usedGames();
    if (canAdd) {
      const add = document.createElement("button");
      add.type = "button";
      add.className = "tab-add";
      add.textContent = "+";
      add.title = L(`${games.length + 1}경기 추가`, `Add game ${games.length + 1}`);
      add.setAttribute("aria-label", add.title);
      add.addEventListener("click", () => {
        S.shownGames.set(shownKey(), games.length + 1);
        S.lineupGame = games.length + 1;
        S.pickSlot = null;
        renderAll();
      });
      tabs.append(add);
    }
    if (canRemove) {
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "tab-add minus";
      rm.textContent = "−";
      rm.title = L(`${games.length}경기 닫기`, `Hide game ${games.length}`);
      rm.setAttribute("aria-label", rm.title);
      rm.addEventListener("click", () => {
        S.shownGames.set(shownKey(), games.length - 1);
        S.pickSlot = null;
        renderAll();
      });
      tabs.append(rm);
    }
    tabs.style.setProperty("--tab-count", games.length + (canAdd ? 1 : 0) + (canRemove ? 1 : 0));

    const sel = $("formationSel");
    if (!sel.options.length) Object.keys(FORMATIONS).forEach((f) => sel.add(new Option(f, f)));
    sel.value = formation;
    // 상대팀 칸: 입력 중에는 덮어쓰지 않는다
    const oppIn = $("oppInput");
    if (document.activeElement !== oppIn) oppIn.value = lineupOf(S.date, g).opp;

    const field = $("field");
    field.querySelectorAll(".slot").forEach((el) => el.remove());
    spots.forEach(([pos, x, y], i) => {
      const mid = slots[i];
      const b = document.createElement("button");
      b.className = "slot" + (mid ? " filled" : "") + (i === 0 ? " gk" : "") + ` role-${posRole(pos)}`;
      b.style.left = x + "%";
      b.style.top = y + "%";
      b.setAttribute("aria-pressed", S.pickSlot === i);
      b.setAttribute("aria-label", `${pos} ${mid ? memberName(mid) : L("비어 있음", "empty")}`);
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.textContent = pos;
      const nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = mid ? memberName(mid) : L("선택", "Pick");
      b.append(dot, nm);
      b.addEventListener("click", () => {
        if (S.pickSlot !== i && guardPast()) return; // 지난 날짜는 잠금을 풀어야 회원을 고를 수 있다
        S.pickSlot = S.pickSlot === i ? null : i;
        renderLineup();
      });
      field.append(b);
    });

    const picker = $("picker");
    picker.replaceChildren();
    const picking = S.pickSlot !== null && S.pickSlot < spots.length;
    picker.classList.toggle("sheet", picking);
    // 휴대폰: 고르는 동안 구장을 맨 위로 올려 줄이고, 회원 목록과 한 화면에 보이게 한다
    const wasPicking = document.body.classList.contains("picking");
    document.body.classList.toggle("picking", picking);
    if (picking && !wasPicking && window.matchMedia("(max-width: 860px)").matches) window.scrollTo(0, 0);
    const sum = document.createElement("div");
    sum.className = "lineup-sum";
    const cntB = document.createElement("b");
    cntB.textContent = slots.filter(Boolean).length;
    sum.append(`${tn(S.team)} · ${L(`${g}경기`, `Game ${g}`)} · ${formation} · ${L("배치", "Placed")} `, cntB, L("/11명", "/11"));

    if (S.pickSlot === null || S.pickSlot >= spots.length) {
      S.pickSlot = null;
      const p = document.createElement("div");
      p.className = "picker-empty";
      p.textContent = activeMembers().length
          ? L("구장에서 포지션 동그라미를 누르면 여기서 회원을 고를 수 있습니다. 회원을 넣으면 다음 빈 자리로 자동으로 넘어갑니다.",
              "Tap a position circle on the pitch to pick a member here. After you place someone, it moves on to the next empty spot.")
          : L("먼저 회원 관리에서 회원을 추가해 주세요.", "First add members in the Members tab.");
      picker.append(sum, p);
      return;
    }

    const i = S.pickSlot;
    const cur = slots[i];
    const head = document.createElement("div");
    head.className = "picker-head";
    const title = document.createElement("b");
    title.textContent = L(`${spots[i][0]} 자리에 넣을 회원`, `Choose a member for ${spots[i][0]}`);
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    if (cur) {
      const clr = document.createElement("button");
      clr.className = "btn-ghost";
      clr.textContent = L("자리 비우기", "Clear spot");
      clr.addEventListener("click", () => placeMember(i, null));
      actions.append(clr);
    }
    const close = document.createElement("button");
    close.className = "btn-ghost";
    close.textContent = L("닫기", "Close");
    close.addEventListener("click", () => { S.pickSlot = null; renderLineup(); });
    actions.append(close);
    head.append(title, actions);

    const list = document.createElement("div");
    list.className = "picker-list";
    const placedAt = new Map(slots.map((v, k) => [v, k]).filter(([v]) => v));
    // 최근 N번 모임(보고 있는 날짜까지, N은 설정에서 1~5) 중 한 번도 안 나온 회원은 구분선 아래로 보내고 흐리게
    const recentN = [...S.days.keys()].filter((d) => d <= S.date && hasAny(d)).sort().slice(-S.absentN);
    const cameRecently = (id) => recentN.some((d) => GAMES.some((g) => attended(d, id, g)));
    const order = (a, b) => (placedAt.has(a[0]) - placedAt.has(b[0])) || a[1].name.localeCompare(b[1].name, "ko");
    // 부상자는 맨 아래 따로 (이미 이 경기에 넣은 사람은 제외)
    const hurt = ([id]) => isInjured(id) && !placedAt.has(id);
    const all = activeMembers().filter((e) => !hurt(e));
    const injured = activeMembers().filter(hurt);
    const regulars = recentN.length ? all.filter(([id]) => cameRecently(id) || placedAt.has(id)) : all;
    const rare = recentN.length ? all.filter(([id]) => !cameRecently(id) && !placedAt.has(id)) : [];
    const members = [...regulars.sort(order), ...rare.sort(order), ...injured.sort(order)];
    for (const [id, m] of members) {
      if (rare.length && id === rare[0][0]) {
        const hr = document.createElement("div");
        hr.className = "pick-divider";
        hr.textContent = L(`최근 ${recentN.length}번 모임 불참`,
          recentN.length === 1 ? "Missed the last meeting" : `Missed the last ${recentN.length} meetings`);
        list.append(hr);
      }
      if (injured.length && id === injured[0][0]) {
        const hr = document.createElement("div");
        hr.className = "pick-divider injured";
        hr.textContent = L("부상", "Injured");
        list.append(hr);
      }
      const b = document.createElement("button");
      const at = placedAt.get(id);
      // 이미 넣은 회원은 그 포지션 색(컬러 설정일 때), 지금 자리의 회원은 이 자리 포지션 색
      const role = id === cur ? posRole(spots[i][0]) : at !== undefined ? posRole(spots[at][0]) : null;
      b.className = "pick" + (id === cur ? " current" : at !== undefined ? " placed" : "") + (role ? ` role-${role}` : "")
        + (rare.some(([rid]) => rid === id) ? " rare" : "") + (injured.some(([iid]) => iid === id) ? " injured" : "");
      b.textContent = m.name;
      if (at !== undefined && id !== cur) {
        const s = document.createElement("small");
        s.textContent = spots[at][0];
        b.append(s);
        b.title = L(`${spots[at][0]}에서 이 자리로 옮깁니다`, `Moves from ${spots[at][0]} to this spot`);
      }
      b.addEventListener("click", () => { if (id !== cur) placeMember(i, id); });
      list.append(b);
    }
    if (!members.length) {
      const p = document.createElement("div");
      p.className = "picker-empty";
      p.textContent = L("등록된 회원이 없습니다. 회원 관리에서 회원을 추가해 주세요.", "No members yet. Add members in the Members tab.");
      list.append(p);
    }
    picker.append(sum, head, list);
  }

  // 한 경기의 이 팀 참석을 모두 해제 (그 경기 포지션 배치에서도 빠진다)
  function clearGame(g, key) {
    if (guardPast()) return;
    if (S.confirmClearGame !== key) {
      S.confirmClearGame = key;
      renderGrid();
      setTimeout(() => { if (S.confirmClearGame === key) { S.confirmClearGame = null; renderGrid(); } }, 3000);
      return;
    }
    S.confirmClearGame = null;
    const date = S.date, team = S.team;
    write(() => dbClearTeamGame(date, team, g), (n) => L(`${g}경기 참석 ${n}명을 초기화했습니다.`, `Cleared ${n} check-ins for game ${g}.`));
  }

  // 출석판에 보이는 경기 수: 기본 4경기, 기록이 있거나 직접 추가한 경기까지 (최대 6)
  const BASE_GAMES = 4;
  function shownKey() { return `${S.date}|${S.team}`; }
  function usedGames() {
    const ids = teamMembers(true).map(([id]) => id);
    let max = 0;
    for (const g of GAMES) {
      if (ids.some((id) => attended(S.date, id, g)) || lineupOf(S.date, g).slots.some(Boolean)) max = g;
    }
    return max;
  }
  function visibleGames() {
    const n = Math.max(BASE_GAMES, usedGames(), S.shownGames.get(shownKey()) || 0);
    return GAMES.slice(0, Math.min(n, GAMES.length));
  }

  function renderGrid() {
    const list = activeMembers();
    const games = visibleGames();
    // 보이는 경기 수에 따라 출석 칸 크기를 바꾼다 (4경기면 크게, 6경기면 화면에 맞게)
    $("attTable").dataset.games = games.length;
    const counts = games.map((g) => list.filter(([id]) => attended(S.date, id, g)).length);
    const canAdd = games.length < GAMES.length;
    const canRemove = games.length > BASE_GAMES && games.length > usedGames();
    const head = document.createElement("tr");
    // 영어는 칸이 좁아 "G1"처럼 줄여 쓴다
    head.innerHTML = `<th class="name">${L("이름", "Name")}</th>${games.map((g, i) =>
      `<th>${L(`${g}경기`, `G${g}`)}<span class="cnt num">${counts[i]}</span></th>`).join("")}`;
    // 경기별 참석 초기화: 체크된 사람이 있을 때만 작게 표시, 한 번 더 눌러야 실행
    games.forEach((g, i) => {
      if (!counts[i]) return;
      const key = `${shownKey()}|g${g}`;
      const confirming = S.confirmClearGame === key;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-reset" + (confirming ? " confirm" : "");
      b.textContent = confirming ? L("확인", "OK") : "↺";
      b.title = L(`${g}경기 참석 모두 해제`, `Uncheck everyone in game ${g}`);
      b.setAttribute("aria-label", confirming ? L(`${g}경기 참석 초기화 확인`, `Confirm clearing game ${g}`) : L(`${g}경기 참석 초기화`, `Clear game ${g}`));
      b.addEventListener("click", () => clearGame(g, key));
      head.children[i + 1].append(b);
    });
    if (canAdd || canRemove) {
      const th = document.createElement("th");
      th.className = "add-col";
      if (canAdd) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "game-add";
        add.textContent = "+";
        add.title = L(`${games.length + 1}경기 추가`, `Add game ${games.length + 1}`);
        add.setAttribute("aria-label", add.title);
        add.addEventListener("click", () => {
          S.shownGames.set(shownKey(), games.length + 1);
          renderAll();
        });
        th.append(add);
      }
      if (canRemove) {
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "game-add minus";
        rm.textContent = "−";
        rm.title = L(`${games.length}경기 칸 닫기`, `Hide game ${games.length} column`);
        rm.setAttribute("aria-label", rm.title);
        rm.addEventListener("click", () => {
          S.shownGames.set(shownKey(), games.length - 1);
          renderAll();
        });
        th.append(rm);
      }
      head.append(th);
    }
    $("attHead").replaceChildren(head);

    const body = $("attBody");
    body.replaceChildren();
    const empty = $("attEmpty");
    if (S.mode !== "live" && !list.length) {
      empty.hidden = false;
      $("emptyTitle").textContent = S.mode === "loading" ? L("기록을 불러오는 중입니다", "Loading records") : L("기록을 불러오지 못했습니다", "Couldn't load records");
      $("emptyText").textContent = "";
      return;
    }
    if (!list.length) {
      empty.hidden = false;
      $("emptyTitle").textContent = L(`${tn(S.team)}에 등록된 회원이 없습니다`, `${tn(S.team)} has no members yet`);
      $("emptyText").textContent = L("회원 탭에서 이름을 추가하면 이 팀의 경기별 출석판이 생깁니다.", "Add names in the Members tab to create this team's attendance board.");
      return;
    }
    empty.hidden = true;

    for (const [id, m] of list) {
      const tr = document.createElement("tr");
      const n = GAMES.filter((g) => attended(S.date, id, g)).length;

      // 이름 한 줄 + 아래 작은 줄("3경기 · 전 경기")로 줄 높이를 줄인다
      const tdName = document.createElement("td");
      tdName.className = "name";
      const nm = document.createElement("span");
      nm.className = "nm-main";
      nm.textContent = m.name;
      nm.title = m.name;
      // 부상 중이면 이름을 흐리게 하고 옆에 "부상" 표시
      if (isInjured(id)) {
        tr.classList.add("injured");
        const tag = document.createElement("span");
        tag.className = "inj-tag";
        tag.textContent = L("부상", "Inj.");
        nm.append(tag);
        nm.title = `${m.name} (${L("부상", "injured")})`;
      }
      const sub = document.createElement("span");
      sub.className = "sub";
      // 몇 경기 나왔는지는 동그라미로 보이므로, 아래 줄에는 "전 경기" 버튼만 둔다
      sub.title = n ? L(`${n}경기 출전`, `Played ${n} game${n === 1 ? "" : "s"}`) : L("불참", "Absent");
      // "전 경기"는 지금 보이는 경기만 체크/해제한다
      const all = document.createElement("button");
      all.className = "all-link";
      const full = games.every((g) => attended(S.date, id, g));
      all.textContent = full ? L("전체 해제", "Clear all") : L("전 경기", "All games");
      all.setAttribute("aria-label", `${m.name} ${full ? L("보이는 경기 모두 해제", "uncheck all shown games") : L("보이는 경기 모두 참석", "check all shown games")}`);
      all.addEventListener("click", () => setGames(id, games, !full));
      sub.append(all);
      tdName.append(nm, sub);
      tr.append(tdName);

      for (const g of games) {
        const td = document.createElement("td");
        const b = document.createElement("button");
        const on = attended(S.date, id, g);
        // 포지션에 들어간 경기는 포지션 이름, 참석만 체크한 경기는 축구공 그림
        const pos = on ? posLabel(S.date, id, g) : null;
        b.className = "cell" + (pos ? ` pos role-${posRole(pos)}` : "");
        b.textContent = on ? pos || "" : g;
        b.setAttribute("aria-pressed", on);
        b.setAttribute("aria-label", L(`${m.name} ${g}경기 ${on ? "참석" + (pos ? ` ${pos}` : "") : "미참석"}`,
          `${m.name} game ${g} ${on ? "present" + (pos ? ` ${pos}` : "") : "absent"}`));
        b.addEventListener("click", () => toggleCell(id, g));
        td.append(b);
        tr.append(td);
      }
      if (canAdd || canRemove) tr.append(document.createElement("td"));

      body.append(tr);
    }
  }

  function dayRoster(date) {
    const ids = teamMembers(true).map(([id]) => id);
    // 요약도 출석판과 같은 경기만: 기본 4경기, 기록이 있거나 + 로 늘린 경기까지
    const shown = date === S.date ? visibleGames() : GAMES;
    const games = shown.map((g) => ({
      g,
      people: ids.filter((id) => attended(date, id, g)).map(memberName).sort((a, b) => a.localeCompare(b, "ko")),
    }));
    const people = new Set();
    games.forEach(({ people: p }) => p.forEach((n) => people.add(n)));
    return { games, people };
  }

  function renderSide() {
    const { games, people } = dayRoster(S.date);
    $("sumDate").textContent = label(S.date);
    $("tPeople").textContent = people.size;
    $("tGames").textContent = games.filter((x) => x.people.length).length;
    renderDeleteDay(people.size);

    const r = $("roster");
    r.replaceChildren();
    // 이 팀에 그날 출석 기록이 하나도 없으면 안내만 보여 주고 복사 버튼은 끈다
    const empty = people.size === 0;
    const copy = $("copyBtn");
    copy.disabled = empty || S.mode !== "live";
    copy.title = empty ? L("이날 기록이 없어 복사할 명단이 없습니다", "No records on this day to copy") : "";
    if (empty) {
      $("copyFallback").hidden = true;
      const msg = document.createElement("div");
      msg.className = "roster-empty";
      const strong = document.createElement("strong");
      strong.textContent = L("아직 기록 없음", "No records yet");
      const sub = document.createElement("span");
      sub.textContent = S.mode === "live"
        ? L(`${label(S.date, true)} ${tn(S.team)}의 출석 기록이 아직 없습니다. 출석 탭에서 체크하면 여기에 경기별 명단이 나옵니다.`,
            `No attendance for ${tn(S.team)} on ${label(S.date, true)} yet. Check people in the Attendance tab to see each game's roster here.`)
        : L("기록을 불러오는 중입니다.", "Loading records.");
      msg.append(strong, sub);
      r.append(msg);
      return;
    }
    for (const { g, people: p } of games) {
      const div = document.createElement("div");
      const gs = document.createElement("span");
      gs.className = "g";
      gs.textContent = L(`${g}경기 ${p.length}명`, `Game ${g} · ${p.length}`);
      const txt = document.createElement("span");
      if (p.length) txt.textContent = p.join(", ");
      else { txt.textContent = L("기록 없음", "No records"); txt.className = "none"; }
      div.append(gs, " ", txt);
      r.append(div);
    }
    // 맨 아래: 이날 한 경기도 안 나온 회원 (명단에서 뺀 회원 제외)
    const absent = activeMembers().filter(([id]) => !GAMES.some((g) => attended(S.date, id, g))).map(([, m]) => m.name);
    const ab = document.createElement("div");
    ab.className = "absent";
    const as = document.createElement("span");
    as.className = "g";
    as.textContent = L(`불참 ${absent.length}명`, `Absent · ${absent.length}`);
    const at = document.createElement("span");
    if (absent.length) at.textContent = absent.join(", ");
    else { at.textContent = L("없음", "None"); at.className = "none"; }
    ab.append(as, " ", at);
    r.append(ab);
  }

  // ---------- 날짜 기록 삭제 (선택한 날짜, 지금 팀만) ----------
  function teamHasLineup(date) {
    return Object.values(S.days.get(date)?.lineup?.[S.team] || {}).length > 0;
  }

  function renderDeleteDay(peopleCount) {
    const btn = $("deleteDayBtn");
    const key = shownKey();
    const has = hasAny(S.date) || teamHasLineup(S.date);
    btn.disabled = !has;
    if (!has) {
      if (S.confirmDeleteDay === key) S.confirmDeleteDay = null;
      btn.classList.remove("confirm");
      btn.textContent = L("이 날짜에 지울 기록이 없습니다", "Nothing to delete on this date");
      return;
    }
    const confirming = S.confirmDeleteDay === key;
    btn.classList.toggle("confirm", confirming);
    btn.textContent = confirming
      ? L(`정말 삭제할까요? ${label(S.date, true)} ${tn(S.team)} ${peopleCount}명 기록`, `Really delete? ${tn(S.team)} ${label(S.date, true)}, ${peopleCount} people`)
      : L(`${label(S.date, true)} ${tn(S.team)} 기록 삭제`, `Delete ${tn(S.team)} records for ${label(S.date, true)}`);
  }

  function deleteDay() {
    if (guardPast()) return;
    const key = shownKey();
    if (S.confirmDeleteDay !== key) {
      S.confirmDeleteDay = key;
      renderSide();
      setTimeout(() => { if (S.confirmDeleteDay === key) { S.confirmDeleteDay = null; renderSide(); } }, 4000);
      return;
    }
    S.confirmDeleteDay = null;
    const date = S.date, team = S.team, when = label(date, true);
    write(() => {
      dbDeleteTeamDay(date, team);
      S.shownGames.delete(`${date}|${team}`);
    }, L(`${when} ${tn(team)} 기록을 삭제했습니다.`, `Deleted ${tn(team)} records for ${when}.`));
  }

  function rosterText() {
    const { games, people } = dayRoster(S.date);
    const lines = [L(`[${label(S.date, true)} ${tn(S.team)} 출석]`, `[${tn(S.team)} attendance ${label(S.date, true)}]`)];
    for (const { g, people: p } of games) if (p.length) lines.push(L(`${g}경기 (${p.length}명): ${p.join(", ")}`, `Game ${g} (${p.length}): ${p.join(", ")}`));
    lines.push(L(`총 참석 ${people.size}명`, `Total present: ${people.size}`));
    return lines.join("\n");
  }

  // ---------- 통계: 팀별 탭으로 나눈 날짜별 출석자 명단을 엑셀(.xlsx)로 내보내기 ----------
  const PERIOD_LABEL = { month: "이번달", "3m": "최근3개월", year: "올해", all: "전체" };
  const PERIOD_LABEL_EN = { month: "this-month", "3m": "last-3-months", year: "this-year", all: "all" };
  let xlsxLoading = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    xlsxLoading ||= new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "xlsx.full.min.js?v=1"; // 외부 CDN 대신 이 폴더에 둔 SheetJS 0.18.5 (오프라인 동작, 외부 코드 실행 방지)
      s.onload = () => (window.XLSX ? resolve(window.XLSX) : reject(new Error("xlsx")));
      s.onerror = () => { xlsxLoading = null; reject(new Error("xlsx")); };
      document.head.append(s);
    });
    return xlsxLoading;
  }

  // 팀 한 개의 시트 내용: [날짜, 인원, 출석자 명단] (그날 한 경기라도 나온 사람, 이름순)
  function teamExportRows(team) {
    const ids = [...S.members.entries()].filter(([, m]) => m.team === team).map(([id]) => id);
    const rows = [];
    for (const d of [...S.days.keys()].filter(inPeriod).sort()) {
      const names = ids.filter((id) => GAMES.some((g) => attended(d, id, g)))
        .map(memberName).sort((a, b) => a.localeCompare(b, "ko"));
      if (!names.length) continue;
      const day = parseYmd(d);
      rows.push([`${d} (${wd(day.getDay())})`, names.length, names.join(", ")]);
    }
    return rows;
  }

  async function exportAttendance() {
    const btn = $("exportBtn");
    if (S.mode !== "live") { toast(L("기록을 불러온 뒤에 다시 눌러 주세요.", "Please try again after records load.")); return; }
    btn.disabled = true;
    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.utils.book_new();
      let total = 0;
      const used = new Set();
      for (const [t] of activeTeams()) {
        const rows = teamExportRows(t);
        total += rows.length;
        const ws = XLSX.utils.aoa_to_sheet([L(["날짜", "인원", "출석자 명단"], ["Date", "Count", "Attendees"]),
          ...(rows.length ? rows : [[L("(이 기간 기록 없음)", "(no records in this period)"), "", ""]])]);
        ws["!cols"] = [{ wch: 16 }, { wch: 6 }, { wch: 80 }];
        // 시트 이름: 엑셀 규칙(31자, 금지 문자) 맞추고 겹치지 않게
        let name = tn(t).replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || t;
        while (used.has(name)) name = (name.slice(0, 28) + "_" + used.size);
        used.add(name);
        XLSX.utils.book_append_sheet(wb, ws, name);
      }
      if (!total) { toast(L("이 기간에는 내보낼 출석 기록이 없습니다.", "No attendance records to export in this period.")); return; }
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const file = `${L("출석명단", "attendance")}_${(lang === "ko" ? PERIOD_LABEL : PERIOD_LABEL_EN)[S.period] || ""}_${ymd(new Date())}.xlsx`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(L(`${file} 파일을 저장했습니다. 휴대폰은 '다운로드' 폴더에서 찾을 수 있습니다.`, `Saved ${file}. On a phone, look in the Downloads folder.`));
    } catch (e) {
      toast(L("엑셀 파일을 만들지 못했습니다. 잠시 후 다시 눌러 주세요.", "Couldn't create the Excel file. Please try again shortly."));
    } finally {
      btn.disabled = false;
    }
  }

  function inPeriod(date) {
    const today = new Date();
    const d = parseYmd(date);
    if (S.period === "all") return true;
    if (S.period === "year") return d.getFullYear() === today.getFullYear();
    if (S.period === "month") return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    if (S.period === "3m") return d >= new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return true;
  }

  function renderStats() {
    const dates = [...S.days.keys()].filter((d) => inPeriod(d) && hasAny(d)).sort();
    const ids = activeMembers().map(([id]) => id);

    // 참석률 = 참석한 모임 날짜 수 ÷ 기간 중 팀의 전체 모임 날짜 수 (그날 한 경기라도 나오면 참석)
    const meetingDays = dates.length;
    const stat = new Map(ids.map((id) => [id, { games: 0, days: 0 }]));
    for (const d of dates) {
      for (const id of ids) {
        const n = GAMES.filter((g) => attended(d, id, g)).length;
        const s = stat.get(id);
        s.games += n;
        if (n) s.days++;
      }
    }

    const rows = ids.map((id) => ({ id, name: S.members.get(id).name, ...stat.get(id) }))
      .sort((a, b) => b.days - a.days || b.games - a.games || a.name.localeCompare(b.name, "ko"));
    const body = $("rankBody");
    body.replaceChildren();
    if (!rows.length || !dates.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 4;
      td.className = "muted";
      td.style.textAlign = "center";
      td.style.padding = "18px 6px";
      td.textContent = rows.length ? L("이 기간에는 출석 기록이 없습니다.", "No attendance records in this period.")
        : L("회원을 추가하고 출석을 체크하면 순위가 여기에 표시됩니다.", "Add members and check attendance to see the rankings here.");
      tr.append(td);
      body.append(tr);
      return;
    }
    // 참석률순: # 는 참석률 순위(동점은 같은 순위). 이름순: # 는 1번부터 차례대로
    let pos = 0, prev = null;
    rows.forEach((r, i) => {
      if (r.days !== prev) { pos = i + 1; prev = r.days; }
      r.pos = pos;
    });
    const shown = S.rankSort === "name"
      ? [...rows].sort((a, b) => a.name.localeCompare(b.name, "ko"))
      : rows;
    const recent = S.rankOpen ? recentTeamGames(10) : [];
    const byName = S.rankSort === "name";
    shown.forEach((r, idx) => {
      const pct = meetingDays ? Math.round((r.days / meetingDays) * 100) : 0;
      const open = S.rankOpen === r.id;
      const tr = document.createElement("tr");
      const no = byName ? idx + 1 : r.pos;
      tr.className = (!byName && r.pos <= 3 && r.days > 0 ? "top " : "") + (open ? "open" : "");
      tr.innerHTML = `<td class="pos num">${no}</td><td class="nm"></td><td class="r num">${r.days}/${meetingDays}</td>
        <td><div class="rate"><div class="bar" data-lv="${pct >= 70 ? "hi" : pct >= 40 ? "mid" : "lo"}"><i style="width:${pct}%"></i></div><em>${pct}%</em></div></td>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "name-btn";
      btn.textContent = r.name;
      btn.title = L(`${r.name} 최근 모임 10번 보기`, `Show ${r.name}'s last 10 meetings`);
      btn.setAttribute("aria-expanded", open);
      btn.addEventListener("click", () => toggleRecentRow(tr, btn, r.id));
      tr.children[1].append(btn);
      // 이름 아래 작게: 회원으로 등록한 날짜 (예전 백업처럼 날짜가 없으면 생략)
      const made = S.members.get(r.id).created_at;
      const md = made ? new Date(made) : null;
      if (md && !isNaN(md)) {
        const reg = document.createElement("small");
        reg.className = "reg num";
        const dd = `${String(md.getFullYear()).slice(2)}.${md.getMonth() + 1}.${md.getDate()}`;
        reg.textContent = L(`${dd} 등록`, `Added ${dd}`);
        reg.title = L(`${ymd(md)} 등록`, `Added ${ymd(md)}`);
        tr.children[1].append(reg);
      }
      body.append(tr);
      if (open) body.append(recentRow(r.id, recent));
    });
  }

  // 표를 다시 그리지 않고 누른 줄 아래만 펼치거나 닫는다.
  // 휴대폰에서 표 전체를 다시 그리면 화면이 맨 위로 튀던 문제를 막고, 누른 이름이 같은 자리에 머물게 한다
  function toggleRecentRow(tr, btn, mid) {
    const body = $("rankBody");
    const before = tr.getBoundingClientRect().top;
    const opening = S.rankOpen !== mid;
    body.querySelectorAll("tr.recent-row").forEach((x) => x.remove());
    body.querySelectorAll("tr.open").forEach((x) => x.classList.remove("open"));
    body.querySelectorAll('.name-btn[aria-expanded="true"]').forEach((x) => x.setAttribute("aria-expanded", "false"));
    S.rankOpen = opening ? mid : null;
    let detail = null;
    if (opening) {
      tr.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      detail = recentRow(mid, recentTeamGames(10));
      tr.after(detail);
    }
    // 위쪽에서 닫힌 줄만큼 화면을 보정해 누른 이름이 제자리에 있게 한다
    const shift = tr.getBoundingClientRect().top - before;
    if (shift) window.scrollBy(0, shift);
    // 펼친 내용이 하단 탭에 가려지면 보이는 만큼만 살짝 올린다
    if (detail) {
      const bar = $("tabbar");
      const limit = bar && getComputedStyle(bar).display !== "none" ? bar.getBoundingClientRect().top : window.innerHeight;
      const over = detail.getBoundingClientRect().bottom - limit + 8;
      if (over > 0) window.scrollBy({ top: over, behavior: "smooth" });
    }
    btn.focus({ preventScroll: true });
  }

  // 이 팀의 최근 모임 날짜 n개 (팀에서 한 명이라도 출석한 날), 오래된 순
  function recentTeamGames(n) {
    return [...S.days.keys()].filter(hasAny).sort().slice(-n);
  }

  function recentRow(mid, dates) {
    const tr = document.createElement("tr");
    tr.className = "recent-row";
    const td = document.createElement("td");
    td.colSpan = 4;
    const wrap = document.createElement("div");
    wrap.className = "recent10";
    const strip = document.createElement("div");
    strip.className = "strip";
    let hit = 0;
    for (let i = 0; i < 10; i++) {
      const day = dates[i];
      const c = document.createElement("span");
      if (!day) {
        c.className = "c none";
        c.title = L("모임 기록 없음", "No meeting");
      } else {
        const played = GAMES.filter((g) => attended(day, mid, g)).length;
        if (played) hit++;
        const d = parseYmd(day);
        c.className = "c " + (played ? "in" : "out");
        const m = document.createElement("small");
        m.textContent = monthName(d.getMonth());
        const dd = document.createElement("b");
        dd.textContent = d.getDate();
        c.append(m, dd);
        c.title = `${label(day, true)} ${played ? L(`참석 (${played}경기)`, `present (${played} game${played === 1 ? "" : "s"})`) : L("불참", "absent")}`;
        c.setAttribute("aria-label", c.title);
      }
      strip.append(c);
    }
    const meta = document.createElement("div");
    meta.className = "meta";
    if (dates.length) {
      const range = document.createElement("span");
      range.textContent = `${label(dates[0], true)} → ${label(dates[dates.length - 1], true)}`;
      const sum = document.createElement("b");
      sum.textContent = L(`최근 모임 ${dates.length}번 중 ${hit}번 참석`, `Attended ${hit} of the last ${dates.length} meetings`);
      meta.append(sum, range);
    } else {
      meta.textContent = L("아직 이 팀의 모임 기록이 없습니다.", "This team has no meetings yet.");
    }
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.innerHTML = `<span><i class="c in"></i>${L("참석 (그날 1경기 이상)", "Present (1+ game that day)")}</span><span><i class="c out"></i>${L("불참", "Absent")}</span>`;
    wrap.append(meta, strip, legend);
    td.append(wrap);
    tr.append(td);
    return tr;
  }

  function setRankSort(v) {
    S.rankSort = v === "name" ? "name" : "rate";
    document.querySelectorAll("#rankSort [data-sort]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sort === S.rankSort));
    try { localStorage.setItem(SORT_KEY, S.rankSort); } catch (e) { /* 저장 불가 시 무시 */ }
    renderStats();
  }

  function confirmButton(text, confirmText, stateKey, id, onConfirm) {
    const b = document.createElement("button");
    const confirming = S[stateKey] === id;
    b.className = "row-btn" + (confirming || stateKey === "confirmPurge" ? " danger" : "");
    b.textContent = confirming ? confirmText : text;
    b.addEventListener("click", () => {
      if (S[stateKey] === id) { S[stateKey] = null; onConfirm(); renderMembers(); return; }
      S[stateKey] = id;
      renderMembers();
      setTimeout(() => { if (S[stateKey] === id) { S[stateKey] = null; renderMembers(); } }, 3000);
    });
    return b;
  }

  function renderMembers() {
    renderTeamName();
    renderTeamTools();
    const active = activeMembers();
    const inactive = [...S.members.entries()]
      .filter(([, m]) => m.active === false)
      .sort((a, b) => a[1].name.localeCompare(b[1].name, "ko"));
    $("memberCount").textContent = L(`${active.length}명`, `${active.length}`);

    const list = $("memberList");
    // 목록은 따로 스크롤되는 상자라, 다시 그려도 보던 위치를 유지한다 (아래쪽 회원의 부상·삭제를 눌러도 위로 튀지 않게)
    const listTop = list.scrollTop;
    list.replaceChildren();
    if (!active.length) {
      const li = document.createElement("li");
      li.className = "empty-row";
      li.textContent = S.mode === "loading" ? L("불러오는 중", "Loading") : L("등록된 회원이 없습니다", "No members yet");
      list.append(li);
    }
    for (const [id, m] of active) {
      const li = document.createElement("li");

      if (S.editId === id) {
        li.className = "editing";
        const input = document.createElement("input");
        input.type = "text";
        input.id = "editName-" + id;
        input.maxLength = 40;
        const hadFocus = document.activeElement?.id === input.id;
        const caret = hadFocus ? document.activeElement.selectionStart : null;
        input.value = S.editDraft ?? m.name;
        input.className = "edit-input";
        input.setAttribute("aria-label", L(`${m.name} 새 이름`, `New name for ${m.name}`));
        input.addEventListener("input", () => { S.editDraft = input.value; });
        const sel = document.createElement("select");
        sel.className = "team-sel";
        sel.id = "editTeam-" + id;
        sel.setAttribute("aria-label", L(`${m.name} 소속 팀`, `${m.name}'s team`));
        activeTeams().forEach(([t]) => sel.add(new Option(`${tn(t)}`, t)));
        sel.value = S.editTeam ?? m.team;
        sel.addEventListener("change", () => { S.editTeam = sel.value; });
        const save = document.createElement("button");
        save.className = "row-btn";
        save.textContent = L("저장", "Save");
        const cancel = document.createElement("button");
        cancel.className = "row-btn";
        cancel.textContent = L("취소", "Cancel");
        const doSave = () => saveMember(id, input.value, sel.value);
        const doCancel = () => { S.editId = null; S.editDraft = null; S.editTeam = null; renderMembers(); };
        save.addEventListener("click", doSave);
        cancel.addEventListener("click", doCancel);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); doSave(); }
          if (e.key === "Escape") doCancel();
        });
        const btns = document.createElement("div");
        btns.className = "row-actions";
        btns.append(sel, save, cancel);
        li.append(input, btns);
        list.append(li);
        setTimeout(() => {
          input.focus();
          if (caret !== null) input.setSelectionRange(caret, caret);
          else if (S.editDraft === null) input.select();
        }, 0);
        continue;
      }

      const name = document.createElement("span");
      name.textContent = m.name;
      const edit = document.createElement("button");
      edit.className = "row-btn";
      edit.textContent = L("수정", "Edit");
      edit.setAttribute("aria-label", L(`${m.name} 이름 수정`, `Edit ${m.name}`));
      edit.addEventListener("click", () => {
        S.editId = id; S.editDraft = null; S.editTeam = null; S.confirmDel = null;
        renderMembers();
      });
      const del = confirmButton(L("삭제", "Remove"), L("정말 삭제할까요?", "Really remove?"), "confirmDel", id, () => removeMember(id));
      del.setAttribute("aria-label", L(`${m.name} 삭제`, `Remove ${m.name}`));
      // 부상: 누르면 빨갛게 켜지고, 출석판에서 이름이 흐려진다
      const hurt = isInjured(id);
      const inj = document.createElement("button");
      inj.className = "row-btn injury" + (hurt ? " on" : "");
      inj.textContent = L("부상", "Injured");
      inj.setAttribute("aria-pressed", hurt);
      inj.setAttribute("aria-label", L(`${m.name} 부상 ${hurt ? "해제" : "표시"}`, `${hurt ? "Unmark" : "Mark"} ${m.name} as injured`));
      inj.addEventListener("click", () => toggleInjured(id));
      const btns = document.createElement("div");
      btns.className = "row-actions";
      btns.append(inj, edit, del);
      li.append(name, btns);
      list.append(li);
    }

    list.scrollTop = listTop;
    $("inactiveBox").hidden = !inactive.length;
    $("inactiveCount").textContent = L(`${inactive.length}명`, `${inactive.length}`);
    const il = $("inactiveList");
    il.replaceChildren();
    for (const [id, m] of inactive) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = m.name;
      const btn = document.createElement("button");
      btn.className = "row-btn";
      btn.textContent = L("복구", "Restore");
      btn.addEventListener("click", () => restoreMember(id));
      const purge = confirmButton(L("완전 삭제", "Delete forever"), L("기록까지 지울까요?", "Erase records too?"), "confirmPurge", id, () => purgeMember(id));
      purge.setAttribute("aria-label", L(`${m.name} 완전 삭제`, `Permanently delete ${m.name}`));
      const btns = document.createElement("div");
      btns.className = "row-actions";
      btns.append(btn, purge);
      li.append(name, btns);
      il.append(li);
    }
  }

  // 다시 그려도 보던 위치를 유지한다 (누른 버튼이 다시 그려지며 사라질 때 휴대폰에서 화면이 위로 튀는 것 방지)
  function renderAll() {
    const y = window.scrollY;
    const active = document.activeElement;
    const hadFocusInList = active && active !== document.body && (active.closest?.("#attBody, #rankBody, #memberList, #inactiveList, #field, #picker, #gameTabs"));
    renderTeams();
    renderHeader();
    renderLineup();
    renderGrid();
    renderSide();
    renderMembers();
    renderStats();
    renderBackup();
    renderEditLock();
    if (hadFocusInList && document.activeElement !== active) active.blur?.();
    if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
  }

  // ---------- 이벤트 ----------
  // ---------- 달력: 지금 팀의 모임이 있던 날을 동그라미로 표시 ----------
  let calView = null; // 보고 있는 달의 1일 (Date)
  function openCalendar() {
    const d = parseYmd(S.date);
    calView = new Date(d.getFullYear(), d.getMonth(), 1);
    renderCalendar();
    $("calModal").hidden = false;
    document.body.classList.add("modal-open");
    ($("calGrid").querySelector(".sel") || $("calClose")).focus();
  }
  function closeCalendar() {
    $("calModal").hidden = true;
    document.body.classList.remove("modal-open");
    $("calBtn").focus({ preventScroll: true });
  }
  function renderCalendar() {
    if (!calView) return;
    const y = calView.getFullYear(), m = calView.getMonth();
    $("calTitle").textContent = L(`${y}년 ${m + 1}월`, `${MON_EN[m]} ${y}`);
    const grid = $("calGrid");
    grid.replaceChildren();
    const lead = new Date(y, m, 1).getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const today = ymd(new Date());
    for (let i = 0; i < lead; i++) grid.append(document.createElement("span"));
    for (let n = 1; n <= days; n++) {
      const ds = ymd(new Date(y, m, n));
      const met = hasAny(ds) || teamHasLineup(ds);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cal-day-btn" + (met ? " met" : "") + (ds === S.date ? " sel" : "") + (ds === today ? " today" : "");
      b.textContent = n;
      const dow = new Date(y, m, n).getDay();
      if (dow === 0) b.classList.add("sun");
      b.setAttribute("aria-label", L(`${m + 1}월 ${n}일 (${wd(dow)})${met ? ", 모임 있음" : ""}${ds === today ? ", 오늘" : ""}`,
        `${wd(dow)}, ${MON_EN[m]} ${n}${met ? ", meeting" : ""}${ds === today ? ", today" : ""}`));
      if (ds === S.date) b.setAttribute("aria-current", "date");
      b.addEventListener("click", () => { closeCalendar(); setDate(ds); });
      grid.append(b);
    }
  }
  function shiftCalendar(n) {
    calView = new Date(calView.getFullYear(), calView.getMonth() + n, 1);
    renderCalendar();
  }

  // ---------- 하단 탭 (휴대폰 화면에서만 한 번에 한 화면) ----------
  const VIEW_KEY = "soccer-local-view";
  const SORT_KEY = "soccer-local-sort";
  const VIEWS = ["check", "lineup", "summary", "stats", "members"];
  function setView(v, keepScroll) {
    if (!VIEWS.includes(v)) v = "check";
    document.body.dataset.view = v;
    document.querySelectorAll(".view").forEach((el) => el.classList.toggle("active", el.dataset.view === v));
    document.querySelectorAll("#tabbar [data-tab]").forEach((b) => {
      if (b.dataset.tab === v) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    if (v !== "lineup" && S.pickSlot !== null) { S.pickSlot = null; renderLineup(); }
    try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* 저장 불가 시 무시 */ }
    if (!keepScroll && window.matchMedia("(max-width: 860px)").matches) window.scrollTo(0, 0);
  }
  $("tabbar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) setView(b.dataset.tab);
  });

  // 날짜를 바꾸면 바로 다시 그린다
  function setDate(d) {
    S.date = d;
    S.pickSlot = null;
    S.unlockDate = null;
    renderAll();
  }
  $("prevDay").addEventListener("click", () => setDate(shiftDate(S.date, -1)));
  $("nextDay").addEventListener("click", () => setDate(shiftDate(S.date, 1)));
  $("datePick").addEventListener("change", (e) => { if (e.target.value) setDate(e.target.value); });
  $("calBtn").addEventListener("click", openCalendar);
  $("calPrev").addEventListener("click", () => shiftCalendar(-1));
  $("calNext").addEventListener("click", () => shiftCalendar(1));
  $("calClose").addEventListener("click", closeCalendar);
  $("calToday").addEventListener("click", () => { closeCalendar(); setDate(ymd(new Date())); });
  $("calModal").addEventListener("click", (e) => { if (e.target === $("calModal")) closeCalendar(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("calModal").hidden) closeCalendar(); });
  // 삭제한 팀 링크로 오면 지금 팀 주소로 되돌린다
  window.addEventListener("hashchange", () => { const t = teamFromHash(); if (!t) setTeam(S.team); else if (t !== S.team) setTeam(t); });

  // 휴대폰: 회원 고르기 시트를 맨 위에서 아래로 끌어내리면 닫고 구장을 다시 크게 보여 준다
  (() => {
    const sheet = $("picker");
    const CLOSE_AT = 70; // 이만큼(px) 내리면 닫힘
    let drag = null;
    const reset = () => { sheet.style.transform = ""; sheet.classList.remove("dragging"); };
    sheet.addEventListener("touchstart", (e) => {
      // 목록을 이미 아래로 스크롤해 둔 상태에서는 평소처럼 스크롤만 한다
      drag = sheet.classList.contains("sheet") && sheet.scrollTop <= 0 ? { y: e.touches[0].clientY, dy: 0 } : null;
    }, { passive: true });
    sheet.addEventListener("touchmove", (e) => {
      if (!drag) return;
      const dy = e.touches[0].clientY - drag.y;
      if (dy <= 0 || sheet.scrollTop > 0) { drag = null; reset(); return; } // 위로 밀면 목록 스크롤
      drag.dy = dy;
      sheet.classList.add("dragging");
      sheet.style.transform = `translateY(${Math.round(dy * 0.7)}px)`;
    }, { passive: true });
    const end = () => {
      if (!drag) return;
      const close = drag.dy > CLOSE_AT;
      drag = null;
      reset();
      if (close) { S.pickSlot = null; renderLineup(); }
    };
    sheet.addEventListener("touchend", end);
    sheet.addEventListener("touchcancel", end);
  })();

  // 상대팀 이름: 입력을 마칠 때(칸을 벗어나거나 Enter) 저장
  $("oppInput").addEventListener("change", (e) => setOpponent(e.target.value));
  $("oppInput").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); } });

  $("formationSel").addEventListener("change", (e) => {
    setFormation(e.target.value);
  });

  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (S.mode !== "live") { toast(L("기록을 불러온 뒤에 다시 시도해 주세요.", "Please try again after records load.")); return; }
    const names = [...new Set($("addInput").value.split(/[,\n、·]+/).map((s) => s.trim()).filter(Boolean))].slice(0, 60);
    if (!names.length) return;
    $("addInput").value = "";
    addMembers(names);
  });

  $("periodChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-period]");
    if (!b) return;
    S.period = b.dataset.period;
    document.querySelectorAll("#periodChips .chip").forEach((c) => c.setAttribute("aria-pressed", c === b));
    renderStats();
  });

  $("saveLineupBtn").addEventListener("click", saveLineupImage);
  $("saveAttBtn").addEventListener("click", saveAttendanceImage);
  $("deleteDayBtn").addEventListener("click", deleteDay);
  $("imgCloseBtn").addEventListener("click", closeImageModal);
  $("imgDownloadBtn").addEventListener("click", downloadShot);
  $("imgShareBtn").addEventListener("click", shareShot);
  $("imgModal").addEventListener("click", (e) => { if (e.target === $("imgModal")) closeImageModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("imgModal").hidden) closeImageModal(); });

  $("exportBtn").addEventListener("click", exportAttendance);

  $("rankSort").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sort]");
    if (b) setRankSort(b.dataset.sort);
  });

  $("copyBtn").addEventListener("click", () => {
    const text = rosterText();
    const fb = $("copyFallback");
    const fallback = () => { fb.value = text; fb.hidden = false; fb.focus(); fb.select(); toast(L("자동 복사가 막혀 있어요. 아래 글을 직접 복사해 주세요.", "Automatic copy is blocked. Copy the text below yourself.")); };
    try {
      navigator.clipboard.writeText(text).then(() => { fb.hidden = true; toast(L("명단을 복사했습니다. 단톡방에 붙여넣으세요.", "Roster copied. Paste it into your group chat.")); }, fallback);
    } catch (e) { fallback(); }
  });

  $("backupBtn").addEventListener("click", openBackup);
  $("backupCloseBtn").addEventListener("click", closeBackup);
  $("backupDownloadBtn").addEventListener("click", downloadBackup);
  $("backupShareBtn").addEventListener("click", shareBackup);
  $("backupModal").addEventListener("click", (e) => { if (e.target === $("backupModal")) closeBackup(); });
  $("importBtn").addEventListener("click", () => { $("importFile").value = ""; $("importFile").click(); });
  $("importFile").addEventListener("change", (e) => { const f = e.target.files?.[0]; if (f) importBackupFile(f); });
  $("askOk").addEventListener("click", () => closeAsk(true));
  $("askCancel").addEventListener("click", () => closeAsk(false));
  $("askModal").addEventListener("click", (e) => { if (e.target === $("askModal")) closeAsk(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("askModal").hidden) closeAsk(false);
    else if (!$("backupModal").hidden) closeBackup();
  });

  // ---------- 설정: 언어 · 화면 모드 ----------
  // index.html의 고정 문구: data-en(내용), data-en-aria-label·placeholder·title·alt(속성)에 영어를 두고,
  // 처음 바꿀 때 원래 한국어를 data-ko(-속성)에 보관해 두었다가 되돌린다
  function applyStaticLang() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-en]").forEach((el) => {
      if (el.dataset.ko === undefined) el.dataset.ko = el.innerHTML;
      el.innerHTML = lang === "ko" ? el.dataset.ko : el.dataset.en;
    });
    for (const a of ["aria-label", "placeholder", "title", "alt"]) {
      document.querySelectorAll(`[data-en-${a}]`).forEach((el) => {
        if (!el.hasAttribute(`data-ko-${a}`)) el.setAttribute(`data-ko-${a}`, el.getAttribute(a) || "");
        el.setAttribute(a, el.getAttribute(`data-${lang === "ko" ? "ko" : "en"}-${a}`));
      });
    }
  }

  // 화면 모드: 고른 적이 없으면 휴대폰 설정(라이트/다크)을 따른다
  function effectiveTheme() {
    const t = document.documentElement.dataset.theme;
    if (t === "light" || t === "dark") return t;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function renderSettings() {
    document.querySelectorAll("#langSeg [data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    const th = effectiveTheme();
    document.querySelectorAll("#themeSeg [data-theme-set]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.themeSet === th));
    const pc = posColorMode();
    document.querySelectorAll("#posColorSeg [data-poscolor]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.poscolor === pc));
    document.querySelectorAll("#absentSeg [data-absent]").forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.absent) === S.absentN));
    document.querySelectorAll("#recentSeg [data-recent]").forEach((b) => b.setAttribute("aria-pressed", Number(b.dataset.recent) === S.recentShown));
    $("absentHint").textContent = L(`포지션에서 회원을 고를 때, 최근 ${S.absentN}번 모임에 한 번도 안 나온 회원을 아래쪽에 따로 모읍니다.`,
      `When picking members for a position, those who missed all of the last ${S.absentN} meeting${S.absentN === 1 ? "" : "s"} are grouped at the bottom.`);
    renderSetInfo();
  }

  // 최근 모임 불참 기준 (1~5번, 기본 3번)
  const ABSENT_KEY = "soccer-local-absent";
  function setAbsentN(v) {
    const n = Math.min(5, Math.max(1, Math.round(Number(v)) || 3));
    S.absentN = n;
    try { localStorage.setItem(ABSENT_KEY, String(n)); } catch (e) { /* 저장 불가 시 이번만 적용 */ }
    renderSettings();
    renderLineup();
  }

  // 상단 최근 모임 날짜 수 (1~7)
  const RECENT_KEY = "soccer-local-recent";
  function setRecentShown(v) {
    S.recentShown = Math.min(7, Math.max(1, Math.round(Number(v)) || 5));
    try { localStorage.setItem(RECENT_KEY, String(S.recentShown)); } catch (e) { /* 저장 불가 시 이번만 적용 */ }
    renderSettings();
    renderHeader();
  }

  // 사용 설명서 창
  function openHelp() {
    $("helpModal").hidden = false;
    document.body.classList.add("modal-open");
    $("helpClose").focus();
  }
  function closeHelp() {
    $("helpModal").hidden = true;
    // 설정 창 위에서 열었으므로 설정 창이 열려 있으면 화면 고정은 그대로 둔다
    if ($("setModal").hidden) document.body.classList.remove("modal-open");
    $("helpBtn").focus({ preventScroll: true });
  }

  // 포지션별 전술 창 (설명서처럼 설정 창 위에 뜬다)
  function openTac() {
    $("tacModal").hidden = false;
    document.body.classList.add("modal-open");
    $("tacClose").focus();
  }
  function closeTac() {
    $("tacModal").hidden = true;
    if ($("setModal").hidden) document.body.classList.remove("modal-open");
    $("tacBtn").focus({ preventScroll: true });
  }

  // 포메이션 설명: [한 줄 성격, 장점, 약점, 이럴 때 쓰기] (한국어, 영어)
  const FORM_INFO = {
    "4-4-2": {
      ko: ["균형형: 수비 4 · 미드 4 · 공격 2",
        "두 줄 수비가 단단하고 자리가 단순해 처음 맞춰 보는 팀도 쉽게 씁니다. 투톱이 함께 압박하고 서로 패스를 주고받습니다.",
        "중앙 미드가 2명뿐이라 미드필더가 많은 상대에게 중원을 내줄 수 있습니다.",
        "인원이 고르게 나왔을 때, 기본으로 시작하기 좋습니다. 측면 미드가 수비 때 꼭 내려와야 합니다."],
      en: ["Balanced: 4 defenders · 4 midfielders · 2 forwards",
        "Two solid banks of four and simple roles, so even a new group can use it. The two forwards press and combine together.",
        "Only two central midfielders, so a midfield-heavy opponent can take over the middle.",
        "A good default when the squad is even. Wide midfielders must track back on defense."],
    },
    "4-3-3": {
      ko: ["공격형: 수비 4 · 미드 3 · 공격 3",
        "윙어 둘이 측면을 넓게 벌려 공간을 만들고, 앞에서부터 세 명이 압박합니다. 중앙 미드 3명이 공을 오래 지킵니다.",
        "윙어가 내려오지 않으면 풀백이 측면에서 2대1을 당하기 쉽습니다.",
        "빠르고 1대1에 강한 측면 공격수가 있을 때, 골이 필요할 때 씁니다."],
      en: ["Attacking: 4 defenders · 3 midfielders · 3 forwards",
        "Two wingers stretch the pitch and three forwards press high. Three central midfielders keep the ball well.",
        "If the wingers don't track back, the full backs get outnumbered on the flanks.",
        "Use it with quick wide players who beat defenders 1-on-1, or when you need goals."],
    },
    "4-2-3-1": {
      ko: ["안정형: 수비 4 · 수비형 미드 2 · 공격형 미드 3 · 공격 1",
        "수비형 미드 2명이 수비 앞을 지켜 역습에 강합니다. CAM이 공격을 풀고 양쪽 윙이 지원합니다.",
        "원톱이 고립되기 쉬워, 2선이 함께 올라가지 않으면 골이 잘 안 납니다.",
        "강한 상대를 만나 실점을 줄이고 싶을 때, 패스 좋은 중앙 선수가 있을 때 씁니다."],
      en: ["Steady: 4 defenders · 2 holding mids · 3 attacking mids · 1 striker",
        "Two holding midfielders shield the back line, so it handles counters well. The CAM unlocks attacks with help from the wingers.",
        "The lone striker can get isolated; without the second line joining in, goals dry up.",
        "Use it against stronger teams to concede less, or when you have a good passer in the middle."],
    },
    "3-5-2": {
      ko: ["중원 장악형: 수비 3 · 미드 5 · 공격 2",
        "미드필더가 5명이라 중원 싸움에서 유리합니다. 윙백이 측면 전체를 오르내리며 공격 숫자를 늘립니다.",
        "센터백이 3명이라 측면 뒤 공간이 비기 쉽고, 윙백의 체력 부담이 큽니다.",
        "체력 좋은 측면 선수가 있을 때, 상대가 투톱일 때 씁니다. 공을 잃으면 윙백이 먼저 내려옵니다."],
      en: ["Midfield control: 3 defenders · 5 midfielders · 2 forwards",
        "Five midfielders win the battle in the middle, and wing backs run the whole flank to add attackers.",
        "With three center backs, space behind the flanks opens up and the wing backs have to run a lot.",
        "Use it with fit wide players or against two strikers. When the ball is lost, wing backs drop first."],
    },
  };

  // 작은 구장 그림: 포지션 화면과 같은 자리·같은 색 점
  function formationMini(f) {
    const pitch = document.createElement("div");
    pitch.className = "fm-pitch";
    pitch.setAttribute("aria-hidden", "true");
    for (const [pos, x, y] of FORMATIONS[f]) {
      const d = document.createElement("span");
      d.className = `fm-dot role-${posRole(pos)}`;
      d.style.left = x + "%";
      d.style.top = y + "%";
      d.textContent = pos;
      pitch.append(d);
    }
    return pitch;
  }

  function renderFormations() {
    const body = $("formBody");
    body.replaceChildren();
    const heads = L(["장점", "약점", "이럴 때"], ["Strengths", "Weaknesses", "When to use"]);
    for (const f of Object.keys(FORMATIONS)) {
      const [kind, ...rest] = FORM_INFO[f][lang === "ko" ? "ko" : "en"];
      const sec = document.createElement("section");
      sec.className = "fm-item";
      const text = document.createElement("div");
      text.className = "fm-text";
      const h = document.createElement("h3");
      h.textContent = f;
      const k = document.createElement("p");
      k.className = "tac-role";
      k.textContent = kind;
      const dl = document.createElement("dl");
      rest.forEach((t, n) => {
        const dt = document.createElement("dt");
        dt.textContent = heads[n];
        const dd = document.createElement("dd");
        dd.textContent = t;
        dl.append(dt, dd);
      });
      text.append(h, k, dl);
      sec.append(formationMini(f), text);
      body.append(sec);
    }
  }
  function openForm() {
    renderFormations();
    $("formModal").hidden = false;
    $("formBody").scrollTop = 0;
    document.body.classList.add("modal-open");
    $("formClose").focus();
  }
  function closeForm() {
    $("formModal").hidden = true;
    if ($("setModal").hidden) document.body.classList.remove("modal-open");
    $("formBtn").focus({ preventScroll: true });
  }

  // 포지션 색상: 컬러(기본) = 공격·미드·수비·골키퍼를 색으로 구분, 단색 = 예전처럼 한 가지 색
  const POSCOLOR_KEY = "soccer-local-poscolor";
  function posColorMode() { return document.documentElement.dataset.poscolor === "mono" ? "mono" : "color"; }
  function setPosColor(v) {
    const m = v === "mono" ? "mono" : "color";
    document.documentElement.dataset.poscolor = m;
    try { localStorage.setItem(POSCOLOR_KEY, m); } catch (e) { /* 저장 불가 시 이번만 적용 */ }
    renderSettings();
  }

  // 문제 확인용 한 줄: 앱 버전 · 화면을 그리는 브라우저 · 폰의 라이트/다크 설정
  const APP_VERSION = 40; // sw.js의 VERSION과 같게 올린다
  function browserName() {
    const ua = navigator.userAgent;
    let m;
    if ((m = ua.match(/SamsungBrowser\/([\d.]+)/))) return `Samsung Internet ${m[1].split(".")[0]}`;
    if (/; wv\)/.test(ua)) return `Android WebView ${(ua.match(/Chrome\/(\d+)/) || [])[1] || ""}`.trim();
    if ((m = ua.match(/(?:Edg|EdgA)\/(\d+)/))) return `Edge ${m[1]}`;
    if ((m = ua.match(/Chrome\/(\d+)/))) return `Chrome ${m[1]}`;
    if ((m = ua.match(/Version\/([\d.]+).*Safari/))) return `Safari ${m[1].split(".")[0]}`;
    return L("알 수 없음", "Unknown");
  }
  function renderSetInfo() {
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? L("다크", "dark") : L("라이트", "light");
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    $("setInfo").textContent = L(
      `버전 ${APP_VERSION} · ${browserName()}${standalone ? " (앱)" : ""} · 폰 설정 ${sys}`,
      `Version ${APP_VERSION} · ${browserName()}${standalone ? " (app)" : ""} · Phone setting ${sys}`);
  }

  function setLang(v) {
    lang = v === "ko" ? "ko" : "en";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* 저장 불가 시 이번만 적용 */ }
    applyStaticLang();
    if (noticeMsg) showNotice(noticeMsg);
    renderAll();
    if (!$("calModal").hidden) renderCalendar();
    renderSettings();
  }

  function setTheme(v) {
    const t = v === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    // 라이트는 "라이트 전용"으로 알려 브라우저의 강제 다크 변환을 막는다 (index.html 머리말과 같은 규칙)
    $("colorSchemeMeta").content = t === "light" ? "only light" : "dark";
    try { localStorage.setItem(THEME_KEY, t); } catch (e) { /* 저장 불가 시 이번만 적용 */ }
    renderSettings();
  }

  // 설정 창은 PC는 상단 버튼, 휴대폰은 하단 탭에서 연다. 닫으면 연 버튼으로 돌아간다
  let setOpener = null;
  function openSettings(e) {
    setOpener = e?.currentTarget || null;
    renderSettings();
    $("setModal").hidden = false;
    document.body.classList.add("modal-open");
    $("setClose").focus();
  }
  function closeSettings() {
    $("setModal").hidden = true;
    document.body.classList.remove("modal-open");
    setOpener?.focus({ preventScroll: true });
  }
  $("setBtn").addEventListener("click", openSettings);
  $("setTabBtn").addEventListener("click", openSettings);
  $("setClose").addEventListener("click", closeSettings);
  $("setModal").addEventListener("click", (e) => { if (e.target === $("setModal")) closeSettings(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("helpModal").hidden) closeHelp(); // 설명서가 위에 떠 있으면 그것부터 닫는다
    else if (!$("tacModal").hidden) closeTac();
    else if (!$("formModal").hidden) closeForm();
    else if (!$("setModal").hidden) closeSettings();
  });
  $("langSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-lang]"); if (b) setLang(b.dataset.lang); });
  $("themeSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-theme-set]"); if (b) setTheme(b.dataset.themeSet); });
  $("posColorSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-poscolor]"); if (b) setPosColor(b.dataset.poscolor); });
  $("absentSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-absent]"); if (b) setAbsentN(b.dataset.absent); });
  $("recentSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-recent]"); if (b) setRecentShown(b.dataset.recent); });
  $("helpBtn").addEventListener("click", openHelp);
  $("helpClose").addEventListener("click", closeHelp);
  $("helpModal").addEventListener("click", (e) => { if (e.target === $("helpModal")) closeHelp(); });
  $("tacBtn").addEventListener("click", openTac);
  $("tacClose").addEventListener("click", closeTac);
  $("tacModal").addEventListener("click", (e) => { if (e.target === $("tacModal")) closeTac(); });
  $("formBtn").addEventListener("click", openForm);
  $("formClose").addEventListener("click", closeForm);
  $("formModal").addEventListener("click", (e) => { if (e.target === $("formModal")) closeForm(); });
  document.querySelectorAll("[data-edit-lock]").forEach((b) => b.addEventListener("click", toggleEditLock));

  // ---------- 휴대폰 뒤로가기: 앱이 바로 닫히지 않게 ----------
  // 기록에 "막이" 한 칸을 쌓아 두고, 뒤로가기가 오면 열린 창 → 회원 고르기 → 출석 화면 순서로 하나씩 되돌린다.
  // 출석 화면에서 아무것도 안 열려 있으면 안내만 하고, 2초 안에 한 번 더 누르면 그때 닫힌다.
  // 크롬은 사용자가 화면을 만지기 전에 쌓은 기록을 건너뛰므로, 막이는 터치·키 입력 때 다시 확인해 쌓는다
  let backExitTimer = null;
  function armBack() {
    if (backExitTimer || history.state?.backGuard) return;
    history.pushState({ backGuard: true }, "", location.href);
  }
  function backStep() {
    if (!$("askModal").hidden) { closeAsk(false); return true; }
    if (!$("helpModal").hidden) { closeHelp(); return true; }
    if (!$("tacModal").hidden) { closeTac(); return true; }
    if (!$("formModal").hidden) { closeForm(); return true; }
    if (!$("imgModal").hidden) { closeImageModal(); return true; }
    if (!$("backupModal").hidden) { closeBackup(); return true; }
    if (!$("setModal").hidden) { closeSettings(); return true; }
    if (!$("calModal").hidden) { closeCalendar(); return true; }
    if (S.pickSlot !== null) { S.pickSlot = null; renderLineup(); return true; }
    if (document.body.dataset.view !== "check" && window.matchMedia("(max-width: 860px)").matches) { setView("check"); return true; }
    return false;
  }
  window.addEventListener("popstate", () => {
    if (backExitTimer) return; // 안내 뒤 한 번 더 누름: 그대로 둔다 (앱이 닫힘)
    if (backStep()) { armBack(); return; }
    toast(L("뒤로 버튼을 한 번 더 누르면 앱이 닫힙니다.", "Press back again to close the app."));
    backExitTimer = setTimeout(() => { backExitTimer = null; armBack(); }, 2000);
  });
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, armBack, { capture: true, passive: true }));

  // ---------- 시작 ----------
  applyStaticLang();
  // 예전(1~10)에 6 이상을 골랐으면 5로 맞춘다
  try { const n = Number(localStorage.getItem(ABSENT_KEY)); if (n >= 1) S.absentN = Math.min(5, Math.round(n)); } catch (e) { /* 기본 3번 */ }
  try { const n = Number(localStorage.getItem(RECENT_KEY)); if (n >= 1) S.recentShown = Math.min(7, Math.round(n)); } catch (e) { /* 기본 5개 */ }
  // 팀: 주소의 #faith/#hope/#love → 이 브라우저에서 마지막으로 고른 팀 → 믿음팀
  let savedTeam = null;
  try { savedTeam = localStorage.getItem(TEAM_KEY); } catch (e) { savedTeam = null; }
  const startTeam = teamFromHash() || (TEAMS.some(([t]) => t === savedTeam) ? savedTeam : "믿음"); // 저장된 팀 정보를 읽은 뒤 쉬는 팀이면 첫 팀으로 바뀐다
  S.team = startTeam;
  if (!teamFromHash()) history.replaceState(null, "", "#" + TEAMS.find(([t]) => t === startTeam)[1]);
  renderAll();
  let savedView = null;
  try { savedView = localStorage.getItem(VIEW_KEY); } catch (e) { savedView = null; }
  setView(savedView || "check", true);
  let savedSort = null;
  try { savedSort = localStorage.getItem(SORT_KEY); } catch (e) { savedSort = null; }
  setRankSort(savedSort || "rate");

  load().then(askPersist);
})();
