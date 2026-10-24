// ---------- Bot icon (lightbulb) ----------
const BOT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`;

const chat = document.getElementById("chat");
const form = document.getElementById("chatForm");
const input = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const welcome = document.getElementById("welcome");
const themeToggle = document.getElementById("themeToggle");
const clearBtn = document.getElementById("clearChat");

let history = [];      // the conversation sent to the backend
let isWaiting = false; // stops sending while the bot is replying

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

// New chat
clearBtn.addEventListener("click", () => {
  if (isWaiting) return;
  history = [];
  chat.querySelectorAll(".message").forEach((m) => m.remove());
  welcome.classList.remove("hidden");
  input.focus();
});

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