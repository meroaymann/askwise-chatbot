// ---------- Icons ----------
const BOT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;
const TRASH_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;

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

// ---------- Messages ----------
function addMessage(role, text, isError = false) {
  welcome.classList.add("hidden");

  const row = document.createElement("div");
  row.className = `message ${role}`;

  if (role === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.innerHTML = BOT_ICON;
    row.appendChild(avatar);
  }

  const bubble = document.createElement("div");
  bubble.className = "bubble" + (isError ? " error" : "");

  if (role === "bot") {
    bubble.innerHTML = renderMarkdown(text); // formatted bot reply
  } else {
    bubble.textContent = text;               // user text shown as plain text
  }

  row.appendChild(bubble);
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