(() => {
  // ---------- Supabase 설정 (공개용 anon 키: 읽기만 가능, 수정은 PIN 확인 함수로만) ----------
  const SUPABASE_URL = "https://ldektmvedvhumdvrdbxj.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZWt0bXZlZHZodW1kdnJkYnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTQ0NTEsImV4cCI6MjEwODEzMDQ1MX0.2ZazwLYXhTwTF1bs9NSFhoSjQlZmvaSRuAEi3FkUyDQ";
  const PIN_KEY = "soccer-attendance-pin";
  const TEAM_KEY = "soccer-attendance-team";

  // [팀 이름, 주소 뒤 # 링크]
  const TEAMS = [["믿음", "faith"], ["소망", "hope"], ["사랑", "love"]];
  const teamFromHash = () => TEAMS.find(([, h]) => "#" + h === location.hash)?.[0] || null;

  const GAMES = [1, 2, 3, 4, 5, 6];
  const WD = ["일", "월", "화", "수", "목", "금", "토"];
  const $ = (id) => document.getElementById(id);

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
    sb: null,
    mode: "loading",          // loading | live | offline
    pin: null,                // 잠금 해제된 PIN (이 브라우저 탭에서만 기억)
    team: "믿음",
    members: new Map(),       // id -> {name, active, team}
    days: new Map(),          // "YYYY-MM-DD" -> {att: {memberId: {g1:true,...}}, lineup: {팀: {g1: {formation, pos: {s0: memberId}}}}}
    pending: new Map(),       // "date|mid|gN" -> bool (낙관적 반영)
    pendingLineup: new Map(), // "date|팀|gN|sI" -> memberId|null, "date|팀|gN|form" -> 포메이션
    lineupGame: 1,
    pickSlot: null,
    date: ymd(new Date()),
    period: "month",
    confirmDel: null,
    confirmPurge: null,
    editId: null,
    editDraft: null,
    editTeam: null,
  };

  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function parseYmd(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  function label(s, short) {
    const d = parseYmd(s);
    return short ? `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`
                 : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`;
  }
  function shiftDate(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }

  function attended(date, mid, g) {
    const k = `${date}|${mid}|g${g}`;
    if (S.pending.has(k)) return S.pending.get(k);
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
  function memberName(id) { return S.members.get(id)?.name || "(삭제된 회원)"; }

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function showNotice(msg) { const n = $("notice"); n.textContent = msg; n.hidden = !msg; }

  // ---------- 불러오기 ----------
  async function fetchAll(table, cols, orderCols) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = S.sb.from(table).select(cols);
      orderCols.forEach((c) => { q = q.order(c); });
      const { data, error } = await q.range(from, from + 999);
      if (error) throw error;
      out.push(...data);
      if (data.length < 1000) return out;
    }
  }

  function dayOf(map, d) {
    if (!map.has(d)) map.set(d, { att: {}, lineup: {} });
    return map.get(d);
  }

  let loadSeq = 0;
  async function reload() {
    const seq = ++loadSeq;
    try {
      const [members, att, lineups, slots] = await Promise.all([
        fetchAll("members", "id,name,active,team", ["created_at", "id"]),
        fetchAll("attendance", "day,member_id,game", ["day", "member_id", "game"]),
        fetchAll("lineups", "day,team,game,formation", ["day", "team", "game"]),
        fetchAll("lineup_slots", "day,team,game,slot,member_id", ["day", "team", "game", "slot"]),
      ]);
      if (seq !== loadSeq) return;
      S.members = new Map(members.map((m) => [m.id, { name: m.name, active: m.active, team: m.team }]));
      const days = new Map();
      for (const r of att) {
        const d = dayOf(days, r.day);
        (d.att[r.member_id] ||= {})[`g${r.game}`] = true;
      }
      const lu = (r) => ((dayOf(days, r.day).lineup[r.team] ||= {})[`g${r.game}`] ||= { pos: {} });
      for (const r of lineups) lu(r).formation = r.formation;
      for (const r of slots) lu(r).pos[`s${r.slot}`] = r.member_id;
      S.days = days;
      if (S.mode !== "live") showNotice("");
      S.mode = "live";
    } catch (e) {
      if (seq !== loadSeq) return;
      if (S.mode === "loading") S.mode = "offline";
      showNotice("출석 기록을 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.");
    }
    renderAll();
  }

  let reloadTimer;
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(reload, 250);
  }

  // ---------- 저장 (모든 수정은 PIN을 확인하는 DB 함수로) ----------
  async function rpc(name, params) {
    const { data, error } = await S.sb.rpc(name, { p_pin: S.pin, ...params });
    if (error) throw error;
    return data;
  }

  function needPin() {
    if (S.pin) return false;
    toast("수정하려면 먼저 위에서 PIN 4자리를 입력해 주세요.");
    $("pinInput").focus();
    return true;
  }

  function handleErr(e) {
    const msg = String(e?.message || "");
    if (msg.includes("invalid_pin")) {
      lock();
      toast("PIN이 바뀌었거나 맞지 않습니다. 다시 입력해 주세요.");
    } else if (msg.includes("duplicate_name")) {
      toast("같은 이름의 회원이 이미 명단에 있습니다.");
    } else if (msg.includes("wrong_team")) {
      toast("다른 팀 회원은 이 팀 포지션에 넣을 수 없습니다.");
    } else if (msg.includes("empty_name")) {
      toast("이름을 입력해 주세요.");
    } else {
      toast("저장하지 못했습니다. 인터넷 연결을 확인하고 다시 눌러 주세요.");
    }
  }

  const queues = new Map();
  function enqueue(key, fn) {
    const prev = queues.get(key) || Promise.resolve();
    const next = prev.then(fn, fn);
    queues.set(key, next.catch(() => {}));
    return next;
  }

  // pend: [[map, key, value]] 낙관적 반영 목록. 성공하면 okMsg를 띄우고 true를 돌려준다
  function write(key, pend, call, okMsg) {
    if (needPin()) return Promise.resolve(false);
    pend.forEach(([m, k, v]) => m.set(k, v));
    renderAll();
    return enqueue(key, async () => {
      try {
        const r = await call();
        await reload();
        if (okMsg) toast(typeof okMsg === "function" ? okMsg(r) : okMsg);
        return true;
      } catch (e) {
        handleErr(e);
        return false;
      } finally {
        pend.forEach(([m, k]) => m.delete(k));
        renderAll();
      }
    });
  }

  // ---------- 출석 ----------
  // 출석 해제 시 그 경기 포지션에서도 함께 빠진다 (DB 함수가 처리)
  function setGames(mid, games, on) {
    const date = S.date;
    const pend = games.map((g) => [S.pending, `${date}|${mid}|g${g}`, on]);
    let fromLineup = false;
    if (!on) {
      for (const g of games) {
        lineupOf(date, g).slots.forEach((v, i) => {
          if (v === mid) { pend.push([S.pendingLineup, `${date}|${S.team}|g${g}|s${i}`, null]); fromLineup = true; }
        });
      }
    }
    const msg = fromLineup ? `${memberName(mid)} 님을 포지션에서도 뺐습니다.` : null;
    return write(date, pend, () => rpc("set_attendance", { p_day: date, p_member: mid, p_games: games, p_on: on }), msg);
  }

  function toggleCell(mid, g) {
    return setGames(mid, [g], !attended(S.date, mid, g));
  }

  // ---------- 포지션 배치 ----------
  function lineupOf(date, g) {
    const t = S.team;
    const base = S.days.get(date)?.lineup?.[t]?.[`g${g}`] || {};
    const fk = `${date}|${t}|g${g}|form`;
    let formation = S.pendingLineup.has(fk) ? S.pendingLineup.get(fk) : base.formation;
    if (!FORMATIONS[formation]) formation = DEFAULT_FORMATION;
    const slots = FORMATIONS[formation].map((_, i) => {
      const k = `${date}|${t}|g${g}|s${i}`;
      const v = S.pendingLineup.has(k) ? S.pendingLineup.get(k) : base.pos?.[`s${i}`];
      return v && S.members.get(v)?.team === t ? v : null;
    });
    return { formation, slots };
  }

  function placeMember(slotIdx, mid) {
    if (needPin()) return;
    const date = S.date, g = S.lineupGame, t = S.team;
    const lu = lineupOf(date, g);
    const pend = [[S.pendingLineup, `${date}|${t}|g${g}|s${slotIdx}`, mid]];
    if (mid) {
      lu.slots.forEach((v, i) => { if (v === mid && i !== slotIdx) pend.push([S.pendingLineup, `${date}|${t}|g${g}|s${i}`, null]); });
      pend.push([S.pending, `${date}|${mid}|g${g}`, true]);
    }
    const pos = FORMATIONS[lu.formation][slotIdx][0];
    const msg = mid ? `${memberName(mid)} → ${g}경기 ${pos}, 출석 체크했습니다.`
                    : `${pos} 자리를 비웠습니다. 출석은 출석판에서 해제할 수 있습니다.`;
    S.pickSlot = mid ? nextEmptySlot(lu.slots, slotIdx, mid) : slotIdx;
    write(date, pend, () => rpc("place_member", {
      p_day: date, p_team: t, p_game: g, p_slot: slotIdx, p_member: mid || null, p_formation: lu.formation,
    }), msg);
  }

  function nextEmptySlot(slots, from, mid) {
    const after = slots.map((v, i) => (i === from ? mid : v));
    for (let k = 1; k <= after.length; k++) {
      const i = (from + k) % after.length;
      if (!after[i]) return i;
    }
    return null;
  }

  function setFormation(f) {
    const date = S.date, g = S.lineupGame, t = S.team;
    write(date, [[S.pendingLineup, `${date}|${t}|g${g}|form`, f]],
      () => rpc("set_formation", { p_day: date, p_team: t, p_game: g, p_formation: f }));
  }

  // ---------- 회원 ----------
  function addMembers(names) {
    const taken = names.map((n) => [n, nameTakenBy(n)]).filter(([, m]) => m);
    const fresh = names.filter((n) => !nameTakenBy(n));
    if (taken.length) {
      const [n, m] = taken[0];
      toast(m.team === S.team ? `${n} 님은 이미 ${m.team}팀에 있습니다.` : `${n} 님은 ${m.team}팀 회원입니다. 회원 관리에서 팀을 옮길 수 있습니다.`);
    }
    if (!fresh.length) return;
    const team = S.team;
    write("members", [], () => rpc("add_members", { p_team: team, p_names: fresh }),
      (n) => `${team}팀에 ${n ?? fresh.length}명을 추가했습니다${taken.length ? ` (이미 있는 ${taken.length}명 제외)` : ""}.`);
  }

  async function moveMember(id, team) {
    const m = S.members.get(id);
    if (!m || m.team === team) return true;
    return write("members", [], () => rpc("set_member_team", { p_id: id, p_team: team }),
      `${m.name} 님을 ${team}팀으로 옮겼습니다.`);
  }

  function removeMember(id) {
    const name = memberName(id);
    write("members", [], () => rpc("set_member_active", { p_id: id, p_active: false }),
      `${name} 님을 명단에서 뺐습니다. 지난 기록은 남아 있습니다.`);
  }

  function restoreMember(id) {
    const m = S.members.get(id);
    if (!m) return;
    const other = nameTakenBy(m.name, id);
    if (other) { toast(`같은 이름(${m.name})의 회원이 이미 ${other.team}팀 명단에 있습니다.`); return; }
    write("members", [], () => rpc("set_member_active", { p_id: id, p_active: true }),
      `${m.name} 님을 명단에 다시 넣었습니다.`);
  }

  function purgeMember(id) {
    const name = memberName(id);
    write("members", [], () => rpc("purge_member", { p_id: id }),
      `${name} 님의 회원 정보와 모든 출석·포지션 기록을 완전히 삭제했습니다.`);
  }

  // 이름 수정과 팀 이동을 함께 저장
  async function saveMember(id, raw, team) {
    const m = S.members.get(id);
    const name = String(raw || "").trim().slice(0, 40);
    if (!m) return;
    if (!name) { toast("이름을 입력해 주세요."); return; }
    if (name !== m.name) {
      const other = nameTakenBy(name, id);
      if (other) { toast(`같은 이름(${name})의 회원이 이미 ${other.team}팀에 있습니다.`); return; }
      const ok = await write("members", [], () => rpc("rename_member", { p_id: id, p_name: name }),
        `${m.name} → ${name}(으)로 이름을 바꿨습니다.`);
      if (!ok) return;
    }
    if (team !== m.team && !(await moveMember(id, team))) return;
    S.editId = null;
    S.editDraft = null;
    S.editTeam = null;
    renderMembers();
  }

  function setTeam(team, fromHash) {
    if (!TEAMS.some(([t]) => t === team)) return;
    S.team = team;
    S.pickSlot = null;
    S.editId = null;
    S.confirmDel = null;
    S.confirmPurge = null;
    try { localStorage.setItem(TEAM_KEY, team); } catch (e) { /* 저장 불가 시 무시 */ }
    const hash = "#" + TEAMS.find(([t]) => t === team)[1];
    if (!fromHash && location.hash !== hash) history.replaceState(null, "", hash);
    renderAll();
  }

  function renderTeams() {
    const box = $("teamTabs");
    box.replaceChildren();
    for (const [t] of TEAMS) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = `${t}팀`;
      b.setAttribute("aria-pressed", t === S.team);
      b.addEventListener("click", () => setTeam(t));
      box.append(b);
    }
  }

  // ---------- PIN 잠금 ----------
  function renderLock() {
    const on = !!S.pin;
    document.body.classList.toggle("locked", !on);
    $("lockbar").classList.toggle("unlocked", on);
    $("lockBadge").textContent = on ? "수정 가능" : "보기 전용";
    $("lockText").textContent = on
      ? "이 브라우저 탭에서는 출석과 회원을 수정할 수 있습니다. 공용 기기라면 다 쓴 뒤 잠가 주세요."
      : "출석을 체크하거나 회원을 고치려면 동호회 PIN 4자리를 입력하세요.";
    $("pinForm").hidden = on;
    $("unlockedTools").hidden = !on;
  }

  function savePin(pin) {
    try { pin ? sessionStorage.setItem(PIN_KEY, pin) : sessionStorage.removeItem(PIN_KEY); } catch (e) { /* 저장 불가 시 무시 */ }
  }

  function lock() {
    S.pin = null;
    savePin(null);
    $("changePinForm").hidden = true;
    $("changePinBtn").hidden = false;
    renderLock();
  }

  async function unlock(pin) {
    if (!/^[0-9]{4}$/.test(pin)) { toast("PIN은 숫자 4자리입니다."); return; }
    if (!S.sb) { toast("DB에 연결되지 않았습니다."); return; }
    const { data, error } = await S.sb.rpc("verify_pin", { p_pin: pin });
    if (error) { toast("PIN을 확인하지 못했습니다. 인터넷 연결을 확인해 주세요."); return; }
    if (!data) { toast("PIN이 맞지 않습니다."); $("pinInput").select(); return; }
    S.pin = pin;
    savePin(pin);
    $("pinInput").value = "";
    renderLock();
    toast("잠금을 해제했습니다. 이제 출석을 체크할 수 있습니다.");
  }

  async function changePin(newPin) {
    if (!/^[0-9]{4}$/.test(newPin)) { toast("새 PIN은 숫자 4자리여야 합니다."); return; }
    try {
      await S.sb.rpc("change_pin", { p_old: S.pin, p_new: newPin }).then(({ error }) => { if (error) throw error; });
      S.pin = newPin;
      savePin(newPin);
      $("newPinInput").value = "";
      $("changePinForm").hidden = true;
      $("changePinBtn").hidden = false;
      toast("PIN을 바꿨습니다. 회원들에게 새 PIN을 알려 주세요.");
    } catch (e) {
      handleErr(e);
    }
  }

  // ---------- 렌더 ----------
  // 그날 이 팀 회원 중 출석이 하나라도 있는지
  function hasAny(date) {
    const att = S.days.get(date)?.att || {};
    return Object.entries(att).some(([mid, gs]) =>
      S.members.get(mid)?.team === S.team && Object.values(gs).some((v) => v === true));
  }

  function renderHeader() {
    $("dateBig").textContent = label(S.date);
    $("datePick").value = S.date;

    const dates = [...S.days.keys()].filter(hasAny).sort().reverse().slice(0, 8);
    const box = $("recent");
    box.replaceChildren();
    if (!dates.length) return;
    const lab = document.createElement("span");
    lab.className = "label";
    lab.textContent = "최근 모임";
    box.append(lab);
    for (const d of dates) {
      const b = document.createElement("button");
      b.textContent = label(d, true);
      b.setAttribute("aria-pressed", d === S.date);
      b.addEventListener("click", () => setDate(d));
      box.append(b);
    }
  }

  function renderLineup() {
    const g = S.lineupGame;
    const { formation, slots } = lineupOf(S.date, g);
    const spots = FORMATIONS[formation];

    const tabs = $("gameTabs");
    tabs.replaceChildren();
    for (const n of GAMES) {
      const b = document.createElement("button");
      const filled = lineupOf(S.date, n).slots.filter(Boolean).length;
      b.setAttribute("aria-pressed", n === g);
      b.textContent = `${n}경기`;
      if (filled) { const s = document.createElement("small"); s.textContent = `${filled}/11`; b.append(s); }
      b.addEventListener("click", () => { S.lineupGame = n; S.pickSlot = null; renderLineup(); });
      tabs.append(b);
    }

    const sel = $("formationSel");
    if (!sel.options.length) Object.keys(FORMATIONS).forEach((f) => sel.add(new Option(f, f)));
    sel.value = formation;

    const field = $("field");
    field.querySelectorAll(".slot").forEach((el) => el.remove());
    spots.forEach(([pos, x, y], i) => {
      const mid = slots[i];
      const b = document.createElement("button");
      b.className = "slot" + (mid ? " filled" : "") + (i === 0 ? " gk" : "");
      b.style.left = x + "%";
      b.style.top = y + "%";
      b.setAttribute("aria-pressed", S.pickSlot === i);
      b.setAttribute("aria-label", `${pos} ${mid ? memberName(mid) : "비어 있음"}`);
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.textContent = pos;
      const nm = document.createElement("span");
      nm.className = "nm";
      nm.textContent = mid ? memberName(mid) : "선택";
      b.append(dot, nm);
      b.addEventListener("click", () => {
        if (needPin()) return;
        S.pickSlot = S.pickSlot === i ? null : i;
        renderLineup();
      });
      field.append(b);
    });

    const picker = $("picker");
    picker.replaceChildren();
    const sum = document.createElement("div");
    sum.className = "lineup-sum";
    sum.innerHTML = `${S.team}팀 · ${g}경기 · ${formation} · 배치 <b>${slots.filter(Boolean).length}</b>/11명`;

    if (S.pickSlot === null || S.pickSlot >= spots.length) {
      S.pickSlot = null;
      const p = document.createElement("div");
      p.className = "picker-empty";
      p.textContent = !S.pin
        ? "포지션을 바꾸려면 위에서 PIN을 입력해 잠금을 해제하세요."
        : activeMembers().length
          ? "구장에서 포지션 동그라미를 누르면 여기서 회원을 고를 수 있습니다. 회원을 넣으면 다음 빈 자리로 자동으로 넘어갑니다."
          : "먼저 아래 출석판에서 회원을 추가해 주세요.";
      picker.append(sum, p);
      return;
    }

    const i = S.pickSlot;
    const cur = slots[i];
    const head = document.createElement("div");
    head.className = "picker-head";
    const title = document.createElement("b");
    title.textContent = `${spots[i][0]} 자리에 넣을 회원`;
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    if (cur) {
      const clr = document.createElement("button");
      clr.className = "btn-ghost";
      clr.textContent = "자리 비우기";
      clr.addEventListener("click", () => placeMember(i, null));
      actions.append(clr);
    }
    const close = document.createElement("button");
    close.className = "btn-ghost";
    close.textContent = "닫기";
    close.addEventListener("click", () => { S.pickSlot = null; renderLineup(); });
    actions.append(close);
    head.append(title, actions);

    const list = document.createElement("div");
    list.className = "picker-list";
    const placedAt = new Map(slots.map((v, k) => [v, k]).filter(([v]) => v));
    const members = activeMembers().sort((a, b) => (placedAt.has(a[0]) - placedAt.has(b[0])) || a[1].name.localeCompare(b[1].name, "ko"));
    for (const [id, m] of members) {
      const b = document.createElement("button");
      const at = placedAt.get(id);
      b.className = "pick" + (id === cur ? " current" : at !== undefined ? " placed" : "");
      b.textContent = m.name;
      if (at !== undefined && id !== cur) {
        const s = document.createElement("small");
        s.textContent = spots[at][0];
        b.append(s);
        b.title = `${spots[at][0]}에서 이 자리로 옮깁니다`;
      }
      b.addEventListener("click", () => { if (id !== cur) placeMember(i, id); });
      list.append(b);
    }
    if (!members.length) {
      const p = document.createElement("div");
      p.className = "picker-empty";
      p.textContent = "등록된 회원이 없습니다. 아래 출석판에서 회원을 추가해 주세요.";
      list.append(p);
    }
    picker.append(sum, head, list);
  }

  function renderGrid() {
    const list = activeMembers();
    const counts = GAMES.map((g) => list.filter(([id]) => attended(S.date, id, g)).length);
    $("attHead").innerHTML = `<tr><th class="name">이름</th>${GAMES.map((g, i) =>
      `<th>${g}경기<span class="cnt num">${counts[i]}</span></th>`).join("")}<th></th></tr>`;

    const body = $("attBody");
    body.replaceChildren();
    const empty = $("attEmpty");
    if (S.mode !== "live" && !list.length) {
      empty.hidden = false;
      $("emptyTitle").textContent = S.mode === "loading" ? "기록을 불러오는 중입니다" : "기록을 불러오지 못했습니다";
      $("emptyText").textContent = "";
      return;
    }
    if (!list.length) {
      empty.hidden = false;
      $("emptyTitle").textContent = `${S.team}팀에 등록된 회원이 없습니다`;
      $("emptyText").textContent = "PIN으로 잠금을 해제한 뒤 위 입력칸에 회원 이름을 넣으면 이 팀의 1~6경기 출석판이 생깁니다.";
      return;
    }
    empty.hidden = true;

    for (const [id, m] of list) {
      const tr = document.createElement("tr");
      const n = GAMES.filter((g) => attended(S.date, id, g)).length;

      const tdName = document.createElement("td");
      tdName.className = "name";
      tdName.textContent = m.name;
      const sub = document.createElement("span");
      sub.className = "sub";
      sub.textContent = n ? `${n}경기 출전` : "불참";
      tdName.append(sub);
      tr.append(tdName);

      for (const g of GAMES) {
        const td = document.createElement("td");
        const b = document.createElement("button");
        const on = attended(S.date, id, g);
        b.className = "cell";
        b.textContent = on ? "참" : g;
        b.setAttribute("aria-pressed", on);
        b.setAttribute("aria-label", `${m.name} ${g}경기 ${on ? "참석" : "미참석"}`);
        b.addEventListener("click", () => toggleCell(id, g));
        td.append(b);
        tr.append(td);
      }

      const tdAct = document.createElement("td");
      tdAct.style.whiteSpace = "nowrap";
      const all = document.createElement("button");
      all.className = "row-btn";
      const full = n === GAMES.length;
      all.textContent = full ? "전체 해제" : "전 경기";
      all.addEventListener("click", () => setGames(id, GAMES, !full));
      tdAct.append(all);
      tr.append(tdAct);
      body.append(tr);
    }
  }

  function dayRoster(date) {
    const ids = teamMembers(true).map(([id]) => id);
    const games = GAMES.map((g) => ({
      g,
      people: ids.filter((id) => attended(date, id, g)).map(memberName).sort((a, b) => a.localeCompare(b, "ko")),
    }));
    const people = new Set();
    games.forEach(({ people: p }) => p.forEach((n) => people.add(n)));
    return { games, people };
  }

  function renderSide() {
    const { games, people } = dayRoster(S.date);
    $("tPeople").textContent = people.size;
    $("tGames").textContent = games.filter((x) => x.people.length).length;
    $("tSlots").textContent = games.reduce((s, x) => s + x.people.length, 0);

    const r = $("roster");
    r.replaceChildren();
    for (const { g, people: p } of games) {
      const div = document.createElement("div");
      const gs = document.createElement("span");
      gs.className = "g";
      gs.textContent = `${g}경기 ${p.length}명`;
      const txt = document.createElement("span");
      if (p.length) txt.textContent = p.join(", ");
      else { txt.textContent = "기록 없음"; txt.className = "none"; }
      div.append(gs, " ", txt);
      r.append(div);
    }
  }

  function rosterText() {
    const { games, people } = dayRoster(S.date);
    const lines = [`[${label(S.date, true)} ${S.team}팀 출석]`];
    for (const { g, people: p } of games) if (p.length) lines.push(`${g}경기 (${p.length}명): ${p.join(", ")}`);
    lines.push(`총 참석 ${people.size}명`);
    return lines.join("\n");
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
    const allIds = teamMembers(true).map(([id]) => id);

    let playedGames = 0, totalSlots = 0;
    const stat = new Map(ids.map((id) => [id, { games: 0, days: 0 }]));
    for (const d of dates) {
      for (const g of GAMES) {
        const c = allIds.filter((id) => attended(d, id, g)).length;
        if (c) { playedGames++; totalSlots += c; }
      }
      for (const id of ids) {
        const n = GAMES.filter((g) => attended(d, id, g)).length;
        const s = stat.get(id);
        s.games += n;
        if (n) s.days++;
      }
    }

    $("periodSummary").innerHTML =
      `<span><b class="num">${dates.length}</b>일 모임</span>` +
      `<span><b class="num">${playedGames}</b>경기 진행</span>` +
      `<span>경기당 평균 <b class="num">${playedGames ? (totalSlots / playedGames).toFixed(1) : 0}</b>명</span>`;

    const rows = ids.map((id) => ({ id, name: S.members.get(id).name, ...stat.get(id) }))
      .sort((a, b) => b.games - a.games || b.days - a.days || a.name.localeCompare(b.name, "ko"));
    const body = $("rankBody");
    body.replaceChildren();
    if (!rows.length || !dates.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.className = "muted";
      td.style.textAlign = "center";
      td.style.padding = "18px 6px";
      td.textContent = rows.length ? "이 기간에는 출석 기록이 없습니다." : "회원을 추가하고 출석을 체크하면 순위가 여기에 표시됩니다.";
      tr.append(td);
      body.append(tr);
      return;
    }
    let pos = 0, prev = null;
    rows.forEach((r, i) => {
      if (r.games !== prev) { pos = i + 1; prev = r.games; }
      const pct = playedGames ? Math.round((r.games / playedGames) * 100) : 0;
      const tr = document.createElement("tr");
      if (pos <= 3 && r.games > 0) tr.className = "top";
      tr.innerHTML = `<td class="pos num">${pos}</td><td></td><td class="r num">${r.games}</td><td class="r num">${r.days}</td>
        <td><div class="rate"><div class="bar"><i style="width:${pct}%"></i></div><em>${pct}%</em></div></td>`;
      tr.children[1].textContent = r.name;
      body.append(tr);
    });
  }

  function confirmButton(text, confirmText, stateKey, id, onConfirm) {
    const b = document.createElement("button");
    const confirming = S[stateKey] === id;
    b.className = "row-btn" + (confirming || stateKey === "confirmPurge" ? " danger" : "");
    b.textContent = confirming ? confirmText : text;
    b.addEventListener("click", () => {
      if (needPin()) return;
      if (S[stateKey] === id) { S[stateKey] = null; onConfirm(); renderMembers(); return; }
      S[stateKey] = id;
      renderMembers();
      setTimeout(() => { if (S[stateKey] === id) { S[stateKey] = null; renderMembers(); } }, 3000);
    });
    return b;
  }

  function renderMembers() {
    const active = activeMembers();
    const inactive = [...S.members.entries()]
      .filter(([, m]) => m.active === false)
      .sort((a, b) => a[1].name.localeCompare(b[1].name, "ko"));
    $("memberCount").textContent = `${active.length}명`;

    const list = $("memberList");
    list.replaceChildren();
    if (!active.length) {
      const li = document.createElement("li");
      li.className = "empty-row";
      li.textContent = S.mode === "loading" ? "불러오는 중" : "등록된 회원이 없습니다";
      list.append(li);
    }
    for (const [id, m] of active) {
      const li = document.createElement("li");

      if (S.editId === id) {
        const input = document.createElement("input");
        input.type = "text";
        input.id = "editName-" + id;
        input.maxLength = 40;
        const hadFocus = document.activeElement?.id === input.id;
        const caret = hadFocus ? document.activeElement.selectionStart : null;
        input.value = S.editDraft ?? m.name;
        input.className = "edit-input";
        input.setAttribute("aria-label", `${m.name} 새 이름`);
        input.addEventListener("input", () => { S.editDraft = input.value; });
        const sel = document.createElement("select");
        sel.className = "team-sel";
        sel.id = "editTeam-" + id;
        sel.setAttribute("aria-label", `${m.name} 소속 팀`);
        TEAMS.forEach(([t]) => sel.add(new Option(`${t}팀`, t)));
        sel.value = S.editTeam ?? m.team;
        sel.addEventListener("change", () => { S.editTeam = sel.value; });
        const save = document.createElement("button");
        save.className = "row-btn";
        save.textContent = "저장";
        const cancel = document.createElement("button");
        cancel.className = "row-btn";
        cancel.textContent = "취소";
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
      edit.textContent = "수정";
      edit.setAttribute("aria-label", `${m.name} 이름 수정`);
      edit.addEventListener("click", () => {
        if (needPin()) return;
        S.editId = id; S.editDraft = null; S.editTeam = null; S.confirmDel = null;
        renderMembers();
      });
      const del = confirmButton("삭제", "정말 삭제할까요?", "confirmDel", id, () => removeMember(id));
      del.setAttribute("aria-label", `${m.name} 삭제`);
      const btns = document.createElement("div");
      btns.className = "row-actions";
      btns.append(edit, del);
      li.append(name, btns);
      list.append(li);
    }

    $("inactiveBox").hidden = !inactive.length;
    $("inactiveCount").textContent = `${inactive.length}명`;
    const il = $("inactiveList");
    il.replaceChildren();
    for (const [id, m] of inactive) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = m.name;
      const btn = document.createElement("button");
      btn.className = "row-btn";
      btn.textContent = "복구";
      btn.addEventListener("click", () => { if (!needPin()) restoreMember(id); });
      const purge = confirmButton("완전 삭제", "기록까지 지울까요?", "confirmPurge", id, () => purgeMember(id));
      purge.setAttribute("aria-label", `${m.name} 완전 삭제`);
      const btns = document.createElement("div");
      btns.className = "row-actions";
      btns.append(btn, purge);
      li.append(name, btns);
      il.append(li);
    }
  }

  function renderAll() {
    renderTeams();
    renderHeader();
    renderLineup();
    renderGrid();
    renderSide();
    renderMembers();
    renderStats();
  }

  // ---------- 이벤트 ----------
  // 날짜를 바꾸면 바로 다시 그리고, DB에서 최신 기록도 다시 받아 이날 요약을 갱신한다
  function setDate(d) {
    S.date = d;
    S.pickSlot = null;
    renderAll();
    if (S.sb) scheduleReload();
  }
  $("prevDay").addEventListener("click", () => setDate(shiftDate(S.date, -1)));
  $("nextDay").addEventListener("click", () => setDate(shiftDate(S.date, 1)));
  $("datePick").addEventListener("change", (e) => { if (e.target.value) setDate(e.target.value); });
  window.addEventListener("hashchange", () => { const t = teamFromHash(); if (t && t !== S.team) setTeam(t, true); });

  $("formationSel").addEventListener("change", (e) => {
    if (needPin()) { e.target.value = lineupOf(S.date, S.lineupGame).formation; return; }
    setFormation(e.target.value);
  });

  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (needPin()) return;
    if (S.mode !== "live") { toast("기록을 불러온 뒤에 다시 시도해 주세요."); return; }
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

  $("copyBtn").addEventListener("click", () => {
    const text = rosterText();
    const fb = $("copyFallback");
    const fallback = () => { fb.value = text; fb.hidden = false; fb.focus(); fb.select(); toast("자동 복사가 막혀 있어요. 아래 글을 직접 복사해 주세요."); };
    try {
      navigator.clipboard.writeText(text).then(() => { fb.hidden = true; toast("명단을 복사했습니다. 단톡방에 붙여넣으세요."); }, fallback);
    } catch (e) { fallback(); }
  });

  $("pinForm").addEventListener("submit", (e) => { e.preventDefault(); unlock($("pinInput").value.trim()); });
  $("lockBtn").addEventListener("click", () => { lock(); toast("잠갔습니다."); renderAll(); });
  $("changePinBtn").addEventListener("click", () => {
    $("changePinForm").hidden = false;
    $("changePinBtn").hidden = true;
    $("newPinInput").focus();
  });
  $("cancelPinBtn").addEventListener("click", () => {
    $("newPinInput").value = "";
    $("changePinForm").hidden = true;
    $("changePinBtn").hidden = false;
  });
  $("changePinForm").addEventListener("submit", (e) => { e.preventDefault(); changePin($("newPinInput").value.trim()); });

  // ---------- 시작 ----------
  try { S.pin = sessionStorage.getItem(PIN_KEY); } catch (e) { S.pin = null; }
  // 팀: 주소의 #faith/#hope/#love → 이 브라우저에서 마지막으로 고른 팀 → 믿음팀
  let savedTeam = null;
  try { savedTeam = localStorage.getItem(TEAM_KEY); } catch (e) { savedTeam = null; }
  const startTeam = teamFromHash() || (TEAMS.some(([t]) => t === savedTeam) ? savedTeam : "믿음");
  S.team = startTeam;
  if (!teamFromHash()) history.replaceState(null, "", "#" + TEAMS.find(([t]) => t === startTeam)[1]);
  renderLock();
  renderAll();

  if (!window.supabase?.createClient) {
    S.mode = "offline";
    showNotice("DB 연결 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.");
    renderAll();
    return;
  }
  S.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 저장된 PIN이 그사이 바뀌었으면 잠금 상태로 되돌린다
  if (S.pin) {
    S.sb.rpc("verify_pin", { p_pin: S.pin }).then(({ data }) => { if (data === false) { lock(); renderAll(); } });
  }

  reload();
  const ch = S.sb.channel("attendance-changes");
  ["members", "attendance", "lineups", "lineup_slots"].forEach((table) => {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, scheduleReload);
  });
  ch.subscribe();
  document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleReload(); });
})();
