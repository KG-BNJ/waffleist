const ACCOUNTS = {
  garson: { password: "1234", label: "Garson" },
  kasa: { password: "1234", label: "Kasa" },
  mutfak: { password: "1234", label: "Mutfak" },
};

const MENU = [
  { name: "Çilekli", price: 340, serve: "Tabak" },
  { name: "Orman", price: 360, serve: "Tabak" },
  { name: "Antep", price: 390, serve: "Tabak" },
  { name: "Bitter", price: 350, serve: "Tabak" },
  { name: "Karamel", price: 360, serve: "Kase" },
  { name: "Sade", price: 240, serve: "Tabak" },
  { name: "Gece", price: 380, serve: "Tabak" },
  { name: "Dürüm", price: 320, serve: "Dürüm" },
  { name: "Çilekli magnolia", price: 220, serve: "Kase" },
  { name: "Brownie", price: 180, serve: "Tabak" },
  { name: "Sıcak çikolata", price: 140, serve: "Fincan" },
  { name: "Filtre kahve", price: 95, serve: "Fincan" },
];

const login = document.querySelector("#login");
const shell = document.querySelector("#shell");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const roleLabel = document.querySelector("#role-label");
const toasts = document.querySelector("#toasts");

const cart = new Map();
let table = "";
let role = sessionStorage.getItem("waffle.role") || "";
let known = new Map();

function money(value) {
  return `${new Intl.NumberFormat("tr-TR").format(value)} TL`;
}

function dayKey(ts) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function paidToday() {
  const today = dayKey(Date.now());
  return WaffleOrders.read().filter((order) => {
    if (order.status !== "odendi") return false;
    return dayKey(order.paidAt || order.createdAt) === today;
  });
}

function ago(ts) {
  const minutes = Math.floor((Date.now() - ts) / 60000);
  return minutes < 1 ? "az önce" : `${minutes} dk`;
}

function sourceLabel(order) {
  return order.source === "garson" ? "Garson" : "Siteden";
}

function tableLabel(order) {
  return order.table === "Gel-al" ? "Gel-al" : `Masa ${order.table}`;
}

let audio;

function armAudio() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") audio.resume();
}

function beep(kind) {
  if (!audio) return;
  const notes = kind === "ready" ? [660] : [784, 988];
  notes.forEach((frequency, index) => {
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    const start = audio.currentTime + index * 0.14;
    tone.frequency.value = frequency;
    tone.connect(gain);
    gain.connect(audio.destination);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    tone.start(start);
    tone.stop(start + 0.2);
  });
}

function toast(title, text) {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `<strong></strong><span></span>`;
  node.querySelector("strong").textContent = title;
  node.querySelector("span").textContent = text;
  toasts.append(node);
  document.title = `● ${title}`;
  setTimeout(() => {
    node.remove();
    if (!toasts.childElementCount) document.title = "waffle · personel";
  }, 6000);
}

function openOrders() {
  return WaffleOrders.read().filter((order) => order.status !== "odendi");
}

function renderTicket() {
  const lines = document.querySelector("#ticket-lines");
  const items = [...cart.values()];
  lines.replaceChildren();
  items.forEach((item) => {
    const row = document.createElement("li");
    row.innerHTML = `<span></span><span class="qty"><button type="button" data-dec>-</button><b></b><button type="button" data-inc>+</button></span>`;
    row.querySelector("span").textContent = `${item.name} · ${item.serve}`;
    row.querySelector("b").textContent = String(item.qty);
    row.querySelector("[data-dec]").addEventListener("click", () => changeQty(item.name, -1));
    row.querySelector("[data-inc]").addEventListener("click", () => changeQty(item.name, 1));
    lines.append(row);
  });
  if (!items.length) {
    const empty = document.createElement("li");
    empty.textContent = "Henüz ürün yok.";
    lines.append(empty);
  }
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.querySelector("#ticket-title").textContent = table ? `Masa ${table}` : "Masa seçilmedi";
  document.querySelector("#ticket-total").textContent = money(total);
  document.querySelector("#send-order").disabled = !table || !items.length;
}

function changeQty(name, delta) {
  const item = cart.get(name);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart.delete(name);
  renderTicket();
  renderMenu();
}

function renderTables() {
  const host = document.querySelector("#tables");
  const busy = new Set(
    openOrders()
      .filter((order) => order.table !== "Gel-al")
      .map((order) => String(order.table))
  );
  host.replaceChildren();
  for (let number = 1; number <= 8; number += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = String(number);
    button.classList.toggle("is-on", table === String(number));
    button.classList.toggle("has-open", busy.has(String(number)));
    button.addEventListener("click", () => {
      table = String(number);
      document.querySelector("#send-status").textContent = "";
      renderTables();
      renderTicket();
    });
    host.append(button);
  }
}

function renderMenu() {
  const host = document.querySelector("#menu");
  host.replaceChildren();
  MENU.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item";
    button.textContent = `${item.name} · ${item.price}`;
    button.classList.toggle("is-on", cart.has(item.name));
    button.addEventListener("click", () => {
      const current = cart.get(item.name);
      if (current) current.qty += 1;
      else cart.set(item.name, { ...item, qty: 1 });
      renderMenu();
      renderTicket();
    });
    host.append(button);
  });
}

function sendOrder() {
  const items = [...cart.values()];
  if (!table || !items.length) return;
  const order = WaffleOrders.add({
    source: "garson",
    table,
    note: document.querySelector("#ticket-note").value,
    items,
  });
  cart.clear();
  document.querySelector("#ticket-note").value = "";
  document.querySelector("#send-status").textContent = `${tableLabel(order)} kaydedildi. Kasaya ve mutfağa düştü.`;
  known.set(order.id, order.status);
  renderTables();
  renderMenu();
  renderTicket();
}

function slip(order, roleName) {
  const node = document.createElement("article");
  node.className = `slip${order.status === "yeni" ? " is-new" : ""}`;
  const lines = order.items
    .map((item) => `<li><span>${item.qty} × ${item.name}</span><span>${item.serve}</span></li>`)
    .join("");
  node.innerHTML = `
    <header>
      <h3></h3>
      <span class="badge ${order.status}"></span>
    </header>
    <p class="meta"></p>
    <ul>${lines}</ul>
    <p class="note" hidden></p>
    <p class="total"></p>
    <button class="btn" type="button"></button>
  `;
  node.querySelector("h3").textContent = tableLabel(order);
  const badge = node.querySelector(".badge");
  badge.textContent = { yeni: "Yeni", mutfakta: "Mutfakta", hazir: "Hazır" }[order.status];
  node.querySelector(".meta").textContent = `#${order.no} · ${sourceLabel(order)} · ${ago(order.createdAt)}`;
  const note = node.querySelector(".note");
  if (order.note) {
    note.hidden = false;
    note.textContent = order.note;
  }
  node.querySelector(".total").textContent = roleName === "mutfak" ? `${order.items.reduce((sum, item) => sum + item.qty, 0)} ürün` : money(order.total);
  const button = node.querySelector("button");
  if (roleName === "kasa") {
    button.textContent = "Ödendi";
    button.addEventListener("click", () => {
      WaffleOrders.update(order.id, { status: "odendi", paidAt: Date.now() });
      known.set(order.id, "odendi");
      renderBoard();
    });
  } else if (order.status === "yeni") {
    button.textContent = "Pişirmeye al";
    button.addEventListener("click", () => {
      WaffleOrders.update(order.id, { status: "mutfakta" });
      known.set(order.id, "mutfakta");
      renderBoard();
    });
  } else if (order.status === "mutfakta") {
    button.textContent = "Hazır";
    button.addEventListener("click", () => {
      WaffleOrders.update(order.id, { status: "hazir" });
      known.set(order.id, "hazir");
      renderBoard();
    });
  } else {
    button.textContent = "Kasaya bildirildi";
    button.disabled = true;
  }
  return node;
}

function renderCiro() {
  const paid = paidToday();
  const total = paid.reduce((sum, order) => sum + order.total, 0);
  const salon = paid.filter((order) => order.source === "garson").reduce((sum, order) => sum + order.total, 0);
  const gelal = total - salon;
  const waiting = openOrders().reduce((sum, order) => sum + order.total, 0);
  const average = paid.length ? Math.round(total / paid.length) : 0;
  document.querySelector("#ciro-day").textContent = new Date().toLocaleDateString("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  document.querySelector("#ciro-sum").textContent = money(total);
  document.querySelector("#ciro-meta").textContent = paid.length
    ? `${paid.length} fiş · ortalama ${money(average)}`
    : "Bugün henüz kapanan fiş yok";

  const splits = [
    ["Salon", salon],
    ["Gel-al", gelal],
    ["Açıkta", waiting],
    ["Fiş", String(paid.length)],
  ];
  const split = document.querySelector("#ciro-split");
  split.replaceChildren();
  splits.forEach(([label, value]) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    name.textContent = label;
    amount.textContent = label === "Fiş" ? value : money(value);
    item.append(name, amount);
    split.append(item);
  });

  const list = document.querySelector("#paid-list");
  list.replaceChildren();
  if (!paid.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "Ödenen fiş burada birikir.";
    list.append(empty);
    return;
  }
  paid.forEach((order) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const amount = document.createElement("strong");
    const when = new Date(order.paidAt || order.createdAt).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    name.textContent = `${tableLabel(order)} · #${order.no} · ${when}`;
    amount.textContent = money(order.total);
    item.append(name, amount);
    list.append(item);
  });
}

function renderBoard() {
  const orders = openOrders();
  if (role === "kasa") {
    renderCiro();
    const list = document.querySelector("#kasa-list");
    list.replaceChildren(...orders.map((order) => slip(order, "kasa")));
    if (!orders.length) list.innerHTML = `<p class="empty">Açık hesap yok.</p>`;
    document.querySelector("#kasa-count").textContent = `${orders.length} açık`;
  }
  if (role === "mutfak") {
    const list = document.querySelector("#mutfak-list");
    const visible = orders.filter((order) => order.status !== "odendi");
    list.replaceChildren(...visible.map((order) => slip(order, "mutfak")));
    if (!visible.length) list.innerHTML = `<p class="empty">Izgarada bekleyen yok.</p>`;
    document.querySelector("#mutfak-count").textContent = `${visible.filter((order) => order.status !== "hazir").length} iş`;
  }
  if (role === "garson") renderTables();
}

function ingest(announce) {
  const orders = WaffleOrders.read();
  if (announce && (role === "kasa" || role === "mutfak")) {
    orders.forEach((order) => {
      const previous = known.get(order.id);
      if (!previous && order.status !== "odendi") {
        beep("new");
        toast(`${tableLabel(order)} · yeni`, `${sourceLabel(order)} · ${order.items.map((item) => `${item.qty} ${item.name}`).join(", ")}`);
      } else if (role === "kasa" && previous && previous !== "hazir" && order.status === "hazir") {
        beep("ready");
        toast(`${tableLabel(order)} hazır`, "Mutfak servise çıkardı.");
      }
    });
  }
  known = new Map(orders.map((order) => [order.id, order.status]));
  renderBoard();
}

function showApp() {
  const account = ACCOUNTS[role];
  login.hidden = true;
  shell.hidden = false;
  roleLabel.textContent = account.label;
  document.body.classList.toggle("is-mutfak", role === "mutfak");
  document.querySelector("#panel-garson").hidden = role !== "garson";
  document.querySelector("#panel-kasa").hidden = role !== "kasa";
  document.querySelector("#panel-mutfak").hidden = role !== "mutfak";
  if (role === "garson") {
    renderTables();
    renderMenu();
    renderTicket();
  }
  ingest(false);
}

addEventListener("pointerdown", armAudio, { once: true });

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  armAudio();
  const data = new FormData(loginForm);
  const user = String(data.get("user"));
  const password = String(data.get("password"));
  const account = ACCOUNTS[user];
  if (!account || account.password !== password) {
    loginError.textContent = "Hesap veya şifre uyuşmadı.";
    return;
  }
  role = user;
  sessionStorage.setItem("waffle.role", role);
  loginError.textContent = "";
  showApp();
});

document.querySelector("#logout").addEventListener("click", () => {
  role = "";
  sessionStorage.removeItem("waffle.role");
  shell.hidden = true;
  login.hidden = false;
  document.body.classList.remove("is-mutfak");
  document.title = "waffle · personel";
});

document.querySelector("#send-order").addEventListener("click", sendOrder);

window.addEventListener("storage", (event) => {
  if (event.key === WaffleOrders.KEY) ingest(true);
});

setInterval(() => {
  if (role === "kasa" || role === "mutfak") renderBoard();
}, 30000);

if (role && ACCOUNTS[role]) showApp();
