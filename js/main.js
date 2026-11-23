const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const header = $(".site-header");
const nav = $("#site-nav");
const navToggle = $(".nav-toggle");
const drawer = $("#drawer");
const orderForm = $("#order-form");
const orderItem = $("#order-item");
const orderServe = $("#order-serve");
const orderNote = $("#order-note");
const orderPreview = $("#order-preview");
const contactForm = $("#contact-form");
const contactStatus = $("#contact-status");
const menuEmpty = $("#menu-empty");
const servisText = $("#servis-text");
const servisImg = $("#servis-img");
const dishes = $$("[data-item]");

const serves = {
  tabak: {
    text: "Izgara bütün gelir. Sos kenarda durur, çilek ve krema üsttedir. Oturup, çatalla, acele etmeden.",
    img: "assets/plain-berry.jpg",
    alt: "Çilek, krema ve nane ile servis edilmiş waffle tabağı",
  },
  kase: {
    text: "Waffle parçalanır, krema ve meyve katman katman dizilir. Kaşık işi. Paylaşmak da tek başına yemek de olur.",
    img: "assets/hero.jpg",
    alt: "Krema, çilek ve waffle gözlerine akan sosun yakın planı",
  },
  durum: {
    text: "Sıcak ızgara kâğıda sarılır. Çikolata, muz ve çilek içerde kalır. Yokuşu çıkarken elde taşınır.",
    img: "assets/sugar.jpg",
    alt: "Pudra şekerli waffle ve iri çilek parçalarının yakın planı",
  },
};

let lastFocus = null;

function setNav(open) {
  navToggle.setAttribute("aria-expanded", String(open));
  nav.classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open);
}

function openDrawer(name) {
  lastFocus = document.activeElement;
  if (name) orderItem.value = name;
  const selected = orderItem.selectedOptions[0];
  if (selected?.dataset.serve) orderServe.value = selected.dataset.serve;
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  updatePreview();
  orderItem.focus();
}

function closeDrawer() {
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
}

function updatePreview() {
  const selected = orderItem.selectedOptions[0];
  if (!selected) return;
  const name = selected.value;
  const price = selected.dataset.price;
  const serve = orderServe.value;
  const note = orderNote.value.trim();
  orderPreview.textContent = `${name} · ${serve} · ${price} TL${note ? ` — ${note}` : ""}`;
}

dishes.forEach((dish) => {
  const option = document.createElement("option");
  option.value = dish.dataset.name;
  option.textContent = `${dish.dataset.name} — ${dish.dataset.price} TL`;
  option.dataset.price = dish.dataset.price;
  option.dataset.serve = dish.dataset.serve;
  orderItem.append(option);
});

$$("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    $$("[data-filter]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item === button));
    });
    let shown = 0;
    dishes.forEach((dish) => {
      const tags = dish.dataset.tags.split(" ");
      const visible = filter === "hepsi" || tags.includes(filter);
      dish.hidden = !visible;
      if (visible) shown += 1;
    });
    menuEmpty.hidden = shown !== 0;
  });
});

$$("[data-servis]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const key = tab.dataset.servis;
    const data = serves[key];
    $$("[data-servis]").forEach((item) => {
      const on = item === tab;
      item.setAttribute("aria-selected", String(on));
      item.tabIndex = on ? 0 : -1;
    });
    servisText.textContent = data.text;
    servisImg.src = data.img;
    servisImg.alt = data.alt;
  });
});

$$("[data-order]").forEach((button) => {
  button.addEventListener("click", () => openDrawer(button.dataset.order));
});

$$("[data-open-order]").forEach((button) => {
  button.addEventListener("click", () => openDrawer());
});

navToggle.addEventListener("click", () => {
  setNav(navToggle.getAttribute("aria-expanded") !== "true");
});

$$("#site-nav a").forEach((link) => {
  link.addEventListener("click", () => setNav(false));
});

$("#drawer-close").addEventListener("click", closeDrawer);
drawer.addEventListener("click", (event) => {
  if (event.target === drawer) closeDrawer();
});

orderItem.addEventListener("change", updatePreview);
orderServe.addEventListener("change", updatePreview);
orderNote.addEventListener("input", updatePreview);

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const selected = orderItem.selectedOptions[0];
  const note = orderNote.value.trim();
  const text = [
    "Merhaba, bu bir örnek sipariş notu.",
    `${selected.value} (${orderServe.value}) — ${selected.dataset.price} TL`,
    note ? `Not: ${note}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  if (window.WaffleOrders) {
    WaffleOrders.add({
      source: "site",
      table: "Gel-al",
      note,
      items: [
        {
          name: selected.value,
          serve: orderServe.value,
          qty: 1,
          price: Number(selected.dataset.price),
        },
      ],
    });
    orderPreview.textContent = `${selected.value} kaydedildi. Kasa ve mutfak ekranına düştü.`;
  }
  window.open(`https://wa.me/902125550187?text=${encodeURIComponent(text)}`, "_blank", "noopener");
});

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const name = String(data.get("name") || "").trim();
  const message = String(data.get("message") || "").trim();
  if (!name || !message) {
    contactStatus.textContent = "Ad ve mesaj yazılmadan not bırakılamaz.";
    return;
  }
  contactStatus.textContent = "Bu form örnektir. Mesaj kaydedilmedi ve hiçbir yere gönderilmedi.";
  contactForm.reset();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (drawer.classList.contains("is-open")) closeDrawer();
  if (nav.classList.contains("is-open")) setNav(false);
});

addEventListener(
  "scroll",
  () => {
    header.classList.toggle("is-stuck", scrollY > 8);
  },
  { passive: true }
);

updatePreview();
