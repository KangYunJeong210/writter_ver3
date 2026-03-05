// ====== Storage Keys ======
const PRESETS_KEY = "writer_ver3_presets_v1";
const HISTORY_KEY = "writer_ver3_history_v1"; // max 10

// ====== Defaults ======
const DEFAULT_PRESETS = [
  "프리셋1: (로코) 1.5인칭, 대사 위주, 설렘+죄책감 텐션. 주인공 내면독백 많게. 1200~1800자.",
  "프리셋2: (BL) 현실 대사+상황 코미디. 감각묘사(온도/향/촉감) 풍부. 1500자 내외.",
  "프리셋3: (판타지 학원물) 일상 사건 중심, 케미 강조. 호흡 빠르게. 1600자 내외.",
  "프리셋4: (자극/집착 로코) 직구 고백/반응. 긴장감 있는 핑퐁. 1400~2000자."
];

// ====== Helpers ======
function nowString() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length === 4) return parsed.map(String);
  } catch {}
  return [...DEFAULT_PRESETS];
}

function savePresets(presets) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
}

async function generateNovel(prompt) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // ✅ 서버가 준 message를 화면에 띄움
    throw new Error(data?.message || data?.error || "generate failed");
  }

  return data.text || "생성 결과가 없습니다.";
}
// ====== DOM ======
const promptInput = document.getElementById("promptInput");
const presetRow = document.getElementById("presetRow");
const generateBtn = document.getElementById("generateBtn");
const clearPromptBtn = document.getElementById("clearPromptBtn");
const statusText = document.getElementById("statusText");
const generatedStack = document.getElementById("generatedStack");

const openDrawerBtn = document.getElementById("openDrawerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");

const presetEditor = document.getElementById("presetEditor");
const savePresetsBtn = document.getElementById("savePresetsBtn");
const resetPresetsBtn = document.getElementById("resetPresetsBtn");
const presetSaveHint = document.getElementById("presetSaveHint");

const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// ====== State ======
let presets = loadPresets();
let history = loadHistory(); // {id, time, prompt, output}

// ====== Render: Preset Buttons ======
function renderPresetButtons() {
  presetRow.innerHTML = "";
  presets.forEach((_, idx) => {
    const btn = document.createElement("button");
    btn.className = "preset-btn";
    btn.type = "button";
    btn.textContent = `프리셋${idx + 1}`;
    btn.addEventListener("click", () => {
      promptInput.value = presets[idx] || "";
      promptInput.focus();
    });
    presetRow.appendChild(btn);
  });
}

// ====== Render: Generated Card (prepend) ======
function makeResultCard({ output }) {
  const card = document.createElement("section");
  card.className = "card result-card";

  const head = document.createElement("div");
  head.className = "result-head";

  const title = document.createElement("h2");
  title.className = "card-title";
  title.textContent = "생성된 내용";

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-pill";
  copyBtn.type = "button";
  copyBtn.textContent = "복사";
  copyBtn.addEventListener("click", async () => {
    const ok = await copyToClipboard(output);
    copyBtn.textContent = ok ? "복사됨" : "실패";
    setTimeout(() => (copyBtn.textContent = "복사"), 900);
  });

  head.appendChild(title);
  head.appendChild(copyBtn);

  const body = document.createElement("div");
  body.className = "result-body";
  body.textContent = output;

  card.appendChild(head);
  card.appendChild(body);
  return card;
}

function prependGenerated(output) {
  generatedStack.prepend(makeResultCard({ output }));
}

// ====== Render: Drawer Preset Editor ======
function renderPresetEditor() {
  presetEditor.innerHTML = "";
  presets.forEach((text, idx) => {
    const wrap = document.createElement("div");

    const label = document.createElement("label");
    label.textContent = `프리셋 ${idx + 1}`;

    const ta = document.createElement("textarea");
    ta.value = text || "";
    ta.dataset.idx = String(idx);

    wrap.appendChild(label);
    wrap.appendChild(ta);
    presetEditor.appendChild(wrap);
  });
}

// ====== Render: History List ======
function renderHistory() {
  historyList.innerHTML = "";

  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "history-item";
    li.style.opacity = "0.85";
    li.textContent = "아직 기록이 없습니다.";
    historyList.appendChild(li);
    return;
  }

  history.forEach((item) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const top = document.createElement("div");
    top.className = "history-item-top";

    const t = document.createElement("div");
    t.className = "history-title";
    t.textContent = "생성 기록";

    const time = document.createElement("div");
    time.className = "history-time";
    time.textContent = item.time;

    top.appendChild(t);
    top.appendChild(time);

    const snippet = document.createElement("div");
    snippet.className = "history-snippet";
    snippet.textContent = (item.output || "").replace(/\s+/g, " ").trim();

    li.appendChild(top);
    li.appendChild(snippet);

    li.addEventListener("click", () => {
      prependGenerated(item.output || "");
      closeDrawer();
    });

    historyList.appendChild(li);
  });
}

// ====== Drawer Open/Close ======
function openDrawer() {
  renderPresetEditor();
  renderHistory();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.hidden = true;
}

openDrawerBtn.addEventListener("click", openDrawer);
closeDrawerBtn.addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);

// ====== Actions ======
clearPromptBtn.addEventListener("click", () => {
  promptInput.value = "";
  promptInput.focus();
});

generateBtn.addEventListener("click", async () => {
  const prompt = (promptInput.value || "").trim();
  if (!prompt) {
    statusText.textContent = "프롬프트를 입력해줘.";
    promptInput.focus();
    return;
  }

  generateBtn.disabled = true;
  statusText.textContent = "생성 중…";

  try {
    const output = await generateNovel(prompt);
    prependGenerated(output);

    history = [
      {
        id: (globalThis.crypto?.randomUUID?.() ?? String(Date.now())),
        time: nowString(),
        prompt,
        output,
      },
      ...history,
    ].slice(0, 10);

    saveHistory(history);
    statusText.textContent = "완료!";
    setTimeout(() => (statusText.textContent = ""), 900);
  } catch (err) {
    statusText.textContent = `실패: ${err?.message || "생성 실패"}`;
  } finally {
    generateBtn.disabled = false;
  }
});

// Presets Save/Reset
savePresetsBtn.addEventListener("click", () => {
  const areas = presetEditor.querySelectorAll("textarea");
  const next = Array.from(areas).map((ta) => ta.value || "");
  if (next.length !== 4) return;

  presets = next;
  savePresets(presets);
  renderPresetButtons();

  presetSaveHint.textContent = "프리셋 저장 완료!";
  setTimeout(() => (presetSaveHint.textContent = ""), 1200);
});

resetPresetsBtn.addEventListener("click", () => {
  presets = [...DEFAULT_PRESETS];
  savePresets(presets);
  renderPresetButtons();
  renderPresetEditor();

  presetSaveHint.textContent = "기본값으로 복구했어.";
  setTimeout(() => (presetSaveHint.textContent = ""), 1200);
});

// History Clear
clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory();
});

// ====== Init ======

renderPresetButtons();
