const CHECKOUT = "Check out";
const MAX_HISTORY = 20;
const KEYS = {
  to: "ds_to_list",
  sender: "ds_sender_list",
  dest: "ds_destination_list",
  lastTo: "ds_last_to",
  lastSender: "ds_last_sender",
  lastDest: "ds_last_dest",
  lastDate: "ds_last_date",
  lastBody: "ds_last_body",
  lastCheckout: "ds_last_checkout"
};

const els = {
  to: document.getElementById("to"),
  sender: document.getElementById("sender"),
  dest: document.getElementById("destination"),
  date: document.getElementById("date"),
  datePicker: document.getElementById("date-picker"),
  body: document.getElementById("body"),
  subject: document.getElementById("subject"),
  morning: document.getElementById("morning"),
  checkout: document.getElementById("checkout"),
  status: document.getElementById("status"),
  historyPanel: document.getElementById("history-panel"),
  historyLists: document.getElementById("history-lists")
};

let checkoutOn = false;

function loadList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveList(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

function promote(value, items) {
  const trimmed = value.trim();
  if (!trimmed) return items;
  const next = items.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
  next.unshift(trimmed);
  return next.slice(0, MAX_HISTORY);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function subject() {
  return `[DS] ${els.sender.value.trim()}: ${els.date.value.trim()} ${els.dest.value.trim()}`.trim();
}

function applyingCheckout(include, body) {
  const lines = body.replace(/\r\n/g, "\n").split("\n")
    .filter((line) => line.trim().toLowerCase() !== CHECKOUT.toLowerCase());
  if (!include) {
    return lines.join("\n").trim();
  }
  if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
    return CHECKOUT;
  }
  if (lines[lines.length - 1] === "") lines.pop();
  lines.push(CHECKOUT);
  return lines.join("\n").trim();
}

function isValidEmail(value) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim());
}

function validationMessage() {
  if (!els.to.value.trim()) return "Enter an email address.";
  if (!isValidEmail(els.to.value)) return "Check the email address.";
  if (!els.sender.value.trim()) return "Enter a sender.";
  if (!els.dest.value.trim()) return "Enter a destination.";
  return null;
}

function persist() {
  localStorage.setItem(KEYS.lastTo, els.to.value);
  localStorage.setItem(KEYS.lastSender, els.sender.value);
  localStorage.setItem(KEYS.lastDest, els.dest.value);
  localStorage.setItem(KEYS.lastDate, els.date.value);
  localStorage.setItem(KEYS.lastBody, els.body.value);
  localStorage.setItem(KEYS.lastCheckout, checkoutOn ? "1" : "0");
}

function fillHistorySelect(select, items) {
  select.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = items.length ? "▼" : "–";
  select.appendChild(placeholder);
  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    select.appendChild(option);
  });
}

function refreshHistoryMenus() {
  fillHistorySelect(document.getElementById("to-history"), loadList(KEYS.to));
  fillHistorySelect(document.getElementById("sender-history"), loadList(KEYS.sender));
  fillHistorySelect(document.getElementById("destination-history"), loadList(KEYS.dest));
}

function rememberFields() {
  saveList(KEYS.to, promote(els.to.value, loadList(KEYS.to)));
  saveList(KEYS.sender, promote(els.sender.value, loadList(KEYS.sender)));
  saveList(KEYS.dest, promote(els.dest.value, loadList(KEYS.dest)));
  refreshHistoryMenus();
}

function setCheckout(on) {
  checkoutOn = on;
  els.morning.classList.toggle("active", !on);
  els.checkout.classList.toggle("active", on);
  els.body.value = applyingCheckout(on, els.body.value);
  persist();
}

function setToday() {
  const now = new Date();
  const today = formatDate(now);
  els.date.value = today;
  els.datePicker.value = today;
  persist();
  els.subject.textContent = subject();
}

function encodeQuery(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function composeURLs(to, mailSubject, body) {
  const toEnc = encodeQuery(to);
  const subjectEnc = encodeQuery(mailSubject);
  const bodyEnc = encodeQuery(body);
  return [
    `ms-outlook://compose?to=${toEnc}&subject=${subjectEnc}&body=${bodyEnc}`,
    `mailto:${toEnc}?subject=${subjectEnc}&body=${bodyEnc}`
  ];
}

function sendMail(preferOutlook) {
  rememberFields();
  persist();
  const message = validationMessage();
  if (message) {
    els.status.textContent = message;
    return;
  }
  els.status.textContent = "";
  const body = applyingCheckout(checkoutOn, els.body.value);
  const urls = composeURLs(els.to.value.trim(), subject(), body);
  window.location.href = preferOutlook ? urls[0] : urls[1];
}

function renderHistory() {
  const groups = [
    ["Email Address", KEYS.to],
    ["Sender", KEYS.sender],
    ["Destination", KEYS.dest]
  ];
  els.historyLists.innerHTML = "";
  groups.forEach(([title, key]) => {
    const heading = document.createElement("h3");
    heading.textContent = title;
    els.historyLists.appendChild(heading);
    const items = loadList(key);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No history.";
      els.historyLists.appendChild(empty);
      return;
    }
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "secondary";
    clear.textContent = "Clear All";
    clear.addEventListener("click", () => {
      saveList(key, []);
      refreshHistoryMenus();
      renderHistory();
    });
    els.historyLists.appendChild(clear);
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "history-item";
      const label = document.createElement("span");
      label.textContent = item;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => {
        const next = items.filter((_, itemIndex) => itemIndex !== index);
        saveList(key, next);
        refreshHistoryMenus();
        renderHistory();
      });
      row.append(label, remove);
      els.historyLists.appendChild(row);
    });
  });
}

function restore() {
  els.to.value = localStorage.getItem(KEYS.lastTo) || "";
  els.sender.value = localStorage.getItem(KEYS.lastSender) || "";
  els.dest.value = localStorage.getItem(KEYS.lastDest) || "";
  els.body.value = localStorage.getItem(KEYS.lastBody) || "";
  const savedDate = localStorage.getItem(KEYS.lastDate);
  setToday();
  if (savedDate) els.date.value = formatDate(new Date());
  checkoutOn = localStorage.getItem(KEYS.lastCheckout) === "1";
  els.morning.classList.toggle("active", !checkoutOn);
  els.checkout.classList.toggle("active", checkoutOn);
  if (!els.sender.value) {
    const senders = loadList(KEYS.sender);
    if (senders[0]) els.sender.value = senders[0];
  }
  refreshHistoryMenus();
  els.subject.textContent = subject();
}

["to", "sender", "destination"].forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    rememberFields();
    persist();
    els.subject.textContent = subject();
  });
  document.getElementById(id).addEventListener("input", () => {
    persist();
    els.subject.textContent = subject();
  });
});

els.body.addEventListener("input", persist);
els.datePicker.addEventListener("change", () => {
  if (!els.datePicker.value) return;
  els.date.value = formatDate(parseISODate(els.datePicker.value));
  persist();
  els.subject.textContent = subject();
  els.datePicker.blur();
});
document.getElementById("today").addEventListener("click", setToday);
els.morning.addEventListener("click", () => setCheckout(false));
els.checkout.addEventListener("click", () => setCheckout(true));
document.getElementById("send").addEventListener("click", () => sendMail(false));
document.getElementById("send-outlook").addEventListener("click", () => sendMail(true));
document.getElementById("manage").addEventListener("click", () => {
  els.historyPanel.classList.remove("hidden");
  renderHistory();
  els.historyPanel.scrollIntoView({ behavior: "smooth" });
});
document.getElementById("close-history").addEventListener("click", () => {
  els.historyPanel.classList.add("hidden");
});

["to-history", "sender-history", "destination-history"].forEach((id) => {
  document.getElementById(id).addEventListener("change", (event) => {
    const value = event.target.value;
    if (!value) return;
    const map = {
      "to-history": els.to,
      "sender-history": els.sender,
      "destination-history": els.dest
    };
    map[id].value = value;
    rememberFields();
    persist();
    els.subject.textContent = subject();
    event.target.selectedIndex = 0;
  });
});

restore();

const installGuide = document.getElementById("install-guide");
const installHintDoneKey = "ds_install_hint_done";

function isStandaloneApp() {
  return window.navigator.standalone === true
    || window.matchMedia("(display-mode: standalone)").matches;
}

function isIPhoneOrIPad() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function showInstallGuide() {
  if (typeof installGuide.showModal === "function" && !installGuide.open) {
    installGuide.showModal();
  }
}

document.getElementById("install-help").addEventListener("click", showInstallGuide);
document.getElementById("install-later").addEventListener("click", () => {
  sessionStorage.setItem("ds_install_hint_later", "1");
  installGuide.close();
});
document.getElementById("install-done").addEventListener("click", () => {
  localStorage.setItem(installHintDoneKey, "1");
  installGuide.close();
});

if (isStandaloneApp()) {
  document.getElementById("install-help").hidden = true;
} else if (
  isIPhoneOrIPad()
  && localStorage.getItem(installHintDoneKey) !== "1"
  && sessionStorage.getItem("ds_install_hint_later") !== "1"
) {
  showInstallGuide();
}
