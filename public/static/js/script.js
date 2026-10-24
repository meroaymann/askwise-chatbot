// ---------- Icons ----------
const BOT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;

// ---------- Elements ----------
const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");
const themeToggle = document.getElementById("themeToggle");
const clearBtn = document.getElementById("clearChat");

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const menuBtn = document.getElementById("menuBtn");
const closeSidebarBtn = document.getElementById("closeSidebar");
const newChatSidebarBtn = document.getElementById("newChatSidebar");
const chatList = document.getElementById("chatList");
const clearAllBtn = document.getElementById("clearAll");

// ---------- State ----------
const STORAGE_KEY = "askwise_chats";
let chats = loadChats();   // all saved chats
let currentChatId = null;  // the chat that is open now (null = new chat)
let history = [];          // messages of the open chat (sent to the backend)
let isWaiting = false;     // stops sending while the bot is replying

// ---------- Saving chats in the browser ----------
function loadChats() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function saveChats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); } catch (e) {}
}

function makeTitle(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 40 ? clean.slice(0, 40) + "…" : clean;
}

function saveCurrentChat() {
  if (!history.length) return;

  let entry = chats.find((c) => c.id === currentChatId);

  if (!entry) {
    currentChatId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    entry = { id: currentChatId, title: makeTitle(history[0].content), messages: [], updatedAt: 0 };
  }

  entry.messages = history.slice();
  entry.updatedAt = Date.now();

  // Move this chat to the top of the list
  chats = [entry, ...chats.filter((c) => c.id !== entry.id)];
  saveChats();
  renderChatList();
}

// ---------- Sidebar list ----------
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function renderChatList() {
  chatList.innerHTML = "";

  if (!chats.length) {
    chatList.innerHTML = `<p class="empty-history">No chats yet.<br>Start a conversation!</p>`;
    clearAllBtn.style.display = "none";
    return;
  }
  clearAllBtn.style.display = "block";

  chats.forEach((c) => {
    const item = document.createElement("div");
    item.className = "chat-item" + (c.id === currentChatId ? " active" : "");

    const mainBtn = document.createElement("button");
    mainBtn.className = "chat-item-main";

    const title = document.createElement("span");
    title.className = "chat-title";
    title.dir = "auto";
    title.textContent = c.title;

    const date = document.createElement("span");
    date.className = "chat-date";
    date.textContent = formatDate(c.updatedAt);

    mainBtn.append(title, date);
    mainBtn.addEventListener("click", () => openChat(c.id));

    const delBtn = document.createElement("button");
    delBtn.className = "chat-delete";
    delBtn.title = "Delete chat";
    delBtn.setAttribute("aria-label", "Delete chat");
    delBtn.innerHTML = TRASH_ICON;
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteChat(c.id);
    });

    item.append(mainBtn, delBtn);
    chatList.appendChild(item);
  });
}

// ---------- Open / new / delete ----------
function clearMessages() {
  chat.querySelectorAll(".message").forEach((m) => m.remove());
}

function openChat(id) {
  if (isWaiting) return;
  const entry = chats.find((c) => c.id === id);
  if (!entry) return;

  currentChatId = id;
  history = entry.messages.slice();

  clearMessages();
  welcome.classList.add("hidden");
  history.forEach((m) => addMessage(m.role === "assistant" ? "bot" : "user", m.content));

  renderChatList();
  closeSidebar();
}

function newChat() {
  if (isWaiting) return;
  currentChatId = null;
  history = [];
  clearMessages();
  welcome.classList.remove("hidden");
  renderChatList();
  closeSidebar();
  input.focus();
}

function deleteChat(id) {
  if (isWaiting) return;
  if (!confirm("Delete this chat?")) return;

  chats = chats.filter((c) => c.id !== id);
  saveChats();

  if (id === currentChatId) {
    newChat();
  } else {
    renderChatList();
  }
}

function clearAllChats() {
  if (isWaiting) return;
  if (!confirm("Delete all chats? This can't be undone.")) return;

  chats = [];
  saveChats();
  newChat();
}

// ---------- Mobile sidebar ----------
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

// ---------- Helpers ----------
function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function renderMarkdown(text) {
  return DOMPurify.sanitize(marked.parse(text));
}

function autoResize() {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
}

// ---------- Message action buttons (copy) ----------
function createActions(text) {
  const actions = document.createElement("div");
  actions.className = "msg-actions";

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "action-btn";
  copyBtn.title = "Copy reply";
  copyBtn.innerHTML = `${COPY_ICON}<span>Copy</span>`;

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.innerHTML = `${CHECK_ICON}<span>Copied!</span>`;
    } catch (e) {
      copyBtn.innerHTML = `${COPY_ICON}<span>Failed</span>`;
    }
    setTimeout(() => {
      copyBtn.innerHTML = `${COPY_ICON}<span>Copy</span>`;
    }, 1500);
  });

  actions.appendChild(copyBtn);

  // Listen (read aloud) button
  if ("speechSynthesis" in window) {
    const listenBtn = document.createElement("button");
    listenBtn.className = "action-btn";
    listenBtn.title = "Read aloud";
    listenBtn.innerHTML = `${SPEAKER_ICON}<span>Listen</span>`;
    listenBtn.addEventListener("click", () => toggleSpeak(text, listenBtn));
    actions.appendChild(listenBtn);
  }

  return actions;
}

// ---------- Messages ----------
function addMessage(role, text, isError = false) {
  welcome.classList.add("hidden");

  const row = document.createElement("div");
  row.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (isError ? " error" : "");
  bubble.dir = "auto"; // Arabic shows right-to-left automatically

  if (role === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerHTML = BOT_ICON;
    row.appendChild(avatar);

    bubble.innerHTML = renderMarkdown(text); // formatted bot reply

    const content = document.createElement("div");
    content.className = "bot-content";
    content.appendChild(bubble);
    if (!isError) content.appendChild(createActions(text));
    row.appendChild(content);
  } else {
    bubble.textContent = text; // user text shown as plain text
    row.appendChild(bubble);
  }

  chat.appendChild(row);
  scrollToBottom();
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "message bot";
  row.innerHTML = `
    <div class="avatar">${BOT_ICON}</div>
    <div class="bubble typing"><span></span><span></span><span></span></div>
  `;
  chat.appendChild(row);
  scrollToBottom();
  return row;
}

// ---------- Send to backend ----------
async function sendMessage(text) {
  text = text.trim();
  if (!text || isWaiting) return;

  isWaiting = true;
  sendBtn.disabled = true;

  addMessage("user", text);
  history.push({ role: "user", content: text });

  input.value = "";
  autoResize();

  const typing = showTyping();

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    typing.remove();

    if (!res.ok || data.error) {
      addMessage("bot", data.error || "Something went wrong.", true);
      history.pop(); // remove the failed message so a retry starts clean
    } else {
      addMessage("bot", data.reply);
      history.push({ role: "assistant", content: data.reply });
      saveCurrentChat(); // save to chat history
    }
  } catch (err) {
    typing.remove();
    addMessage("bot", "Can't reach the server. Check your connection and try again.", true);
    history.pop();
  } finally {
    isWaiting = false;
    sendBtn.disabled = false;
    input.focus();
  }
}

// ---------- Events ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

// Enter = send, Shift + Enter = new line
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

input.addEventListener("input", autoResize);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => sendMessage(chip.textContent));
});

clearBtn.addEventListener("click", newChat);
newChatSidebarBtn.addEventListener("click", newChat);
clearAllBtn.addEventListener("click", clearAllChats);

menuBtn.addEventListener("click", openSidebar);
closeSidebarBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// ---------- Dark mode ----------
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  try { localStorage.setItem("theme", theme); } catch (e) {}
}

let savedTheme = null;
try { savedTheme = localStorage.getItem("theme"); } catch (e) {}
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
setTheme(savedTheme || (prefersDark ? "dark" : "light"));

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

// ---------- Start ----------
renderChatList();

// ================= VOICE =================

// ---------- Voice icons ----------
const SPEAKER_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>`;
const STOP_ICON = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`;

// ---------- Read replies aloud (text-to-speech) ----------
let speakingBtn = null;

function resetListenBtn(btn) {
  if (btn) btn.innerHTML = `${SPEAKER_ICON}<span>Listen</span>`;
}

function stopSpeaking() {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  resetListenBtn(speakingBtn);
  speakingBtn = null;
}

// Turn the formatted reply into plain text (skip code blocks)
function plainText(markdown) {
  const div = document.createElement("div");
  div.innerHTML = renderMarkdown(markdown);
  div.querySelectorAll("pre").forEach((p) => p.replaceWith(" (code block) "));
  return div.textContent.replace(/\s+/g, " ").trim();
}

function toggleSpeak(text, btn) {
  const wasThisOne = speakingBtn === btn;
  stopSpeaking();
  if (wasThisOne) return; // clicking "Stop" just stops

  const clean = plainText(text);
  const lang = /[\u0600-\u06FF]/.test(clean) ? "ar-EG" : "en-US"; // Arabic letters → Arabic voice

  // Speak sentence by sentence (long text can cut off in some browsers)
  const parts = (clean.match(/[^.!?؟]+[.!?؟]*/g) || [clean]).filter((p) => p.trim());

  parts.forEach((part, i) => {
    const utterance = new SpeechSynthesisUtterance(part.trim());
    utterance.lang = lang;
    if (i === parts.length - 1) {
      utterance.onend = () => {
        if (speakingBtn === btn) {
          resetListenBtn(btn);
          speakingBtn = null;
        }
      };
    }
    window.speechSynthesis.speak(utterance);
  });

  speakingBtn = btn;
  btn.innerHTML = `${STOP_ICON}<span>Stop</span>`;
}

// Stop reading when switching or starting chats
newChatSidebarBtn.addEventListener("click", stopSpeaking);
clearBtn.addEventListener("click", stopSpeaking);
chatList.addEventListener("click", stopSpeaking);

// ---------- Voice input (speech-to-text) ----------
const micBtn = document.getElementById("micBtn");
const voiceLangBtn = document.getElementById("voiceLangBtn");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let voiceLang = "en-US";
try { voiceLang = localStorage.getItem("voiceLang") || "en-US"; } catch (e) {}

function updateLangBtn() {
  const isArabic = voiceLang === "ar-EG";
  voiceLangBtn.textContent = isArabic ? "ع" : "EN";
  voiceLangBtn.title = isArabic ? "Voice language: Arabic" : "Voice language: English";
}
updateLangBtn();

voiceLangBtn.addEventListener("click", () => {
  voiceLang = voiceLang === "en-US" ? "ar-EG" : "en-US";
  try { localStorage.setItem("voiceLang", voiceLang); } catch (e) {}
  updateLangBtn();
});

if (!SpeechRecognition) {
  // Browser doesn't support voice input → hide the buttons
  micBtn.style.display = "none";
  voiceLangBtn.style.display = "none";
} else {
  const recognition = new SpeechRecognition();
  recognition.interimResults = true; // show words while speaking
  recognition.continuous = false;    // stop when the user stops talking

  let isListening = false;
  let finalText = "";

  recognition.onstart = () => {
    isListening = true;
    finalText = "";
    micBtn.classList.add("listening");
    input.placeholder = voiceLang === "ar-EG" ? "...جاري الاستماع" : "Listening...";
  };

  recognition.onresult = (e) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += transcript;
      else interim += transcript;
    }
    input.value = finalText + interim;
    autoResize();
  };

  recognition.onerror = (e) => {
    if (e.error === "not-allowed") {
      alert("Microphone access is blocked. Click the 🔒 icon in the address bar and allow the microphone.");
    }
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    input.placeholder = "Type your message...";
    if (finalText.trim()) sendMessage(finalText); // send automatically
  };

  micBtn.addEventListener("click", () => {
    if (isWaiting) return;
    if (isListening) {
      recognition.stop();
      return;
    }
    stopSpeaking();
    recognition.lang = voiceLang;
    try { recognition.start(); } catch (e) {}
  });
}

// ================= CHAT THEMES =================
const paletteBtn = document.getElementById("paletteBtn");
const paletteMenu = document.getElementById("paletteMenu");
const swatches = document.querySelectorAll(".swatch");

function setAccent(name) {
  document.documentElement.setAttribute("data-accent", name);
  swatches.forEach((s) => s.classList.toggle("active", s.dataset.accent === name));
  try { localStorage.setItem("accent", name); } catch (e) {}
}

let savedAccent = null;
try { savedAccent = localStorage.getItem("accent"); } catch (e) {}
setAccent(savedAccent || "violet");

paletteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  paletteMenu.classList.toggle("open");
});

swatches.forEach((s) => {
  s.addEventListener("click", () => {
    setAccent(s.dataset.accent);
    paletteMenu.classList.remove("open");
  });
});

// Close the menu when clicking outside it, or pressing Escape
document.addEventListener("click", (e) => {
  if (!paletteMenu.contains(e.target)) paletteMenu.classList.remove("open");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") paletteMenu.classList.remove("open");
});