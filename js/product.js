/* product.js — product page
   NOTE: script.js loads first, so supabaseClient, buildProductCard,
   getSavedCurrency, formatPrice, refreshPrices are already available.
   We only declare what's unique to this page.
*/

/* ── Cart (localStorage) ── */
const CART_KEY = "fcstoreua_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch(e) { return []; }
}
function saveCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }
function getCartCount() { return getCart().reduce((s, i) => s + (i.qty || 1), 0); }
function updateCartUI() {
  const btn = document.getElementById("cartBtn");
  if (btn) btn.textContent = `Cart (${getCartCount()})`;
}
function addToCart(p, size) {
  const cart = getCart();
  const key  = `${p.id}_${size || ""}`;
  const ex   = cart.find(i => i.key === key);
  if (ex) { ex.qty = (ex.qty || 1) + 1; }
  else {
    cart.push({
      key,
      id:        p.id,
      title:     p.title,
      slug:      p.slug,
      price:     p.price,
      price_eur: p.price_eur || p.price || 0,
      price_usd: p.price_usd || 0,
      price_uah: p.price_uah || 0,
      size:      size || null,
      image:     Array.isArray(p.images) ? p.images[0] : null,
      qty:       1
    });
  }
  saveCart(cart);
  updateCartUI();
}

/* ── helpers ── */
function escPP(v) {
  if (v == null) return "";
  return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function getProductSlug() {
  const p = new URLSearchParams(location.search);
  if (p.get("slug")) return p.get("slug");
  const parts = location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("product");
  if (i !== -1 && parts[i + 1]) return decodeURIComponent(parts[i + 1]);
  return "";
}

/* Badge maps (NOT re-declared as const — use window scope to avoid conflict) */
window.PP_BADGE_CLS = { new:"product-badge-new", popular:"product-badge-popular", limited:"product-badge-limited", retro:"product-badge-retro" };
window.PP_BADGE_LBL = { new:"New", popular:"Popular", limited:"Limited", retro:"Retro" };

let _ppActiveSize    = null;
let _ppCurrentProduct = null;

/* ── Render ── */
function renderProductPage(p) {
  _ppCurrentProduct = p;
  const root = document.getElementById("ppRoot");
  if (!root) return;

  document.title = `${p.title} | FCStoreUA`;

  const images = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  const sizes  = Array.isArray(p.sizes)  ? p.sizes : [];

  /* price — use per-currency fields if available, else convert from EUR */
  const cur        = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "EUR";
  const priceVal   = (cur === "USD" && p.price_usd) ? p.price_usd :
                     (cur === "UAH" && p.price_uah) ? p.price_uah :
                     (p.price_eur || p.price || 0);
  const oldPriceVal = (cur === "USD" && p.old_price_usd) ? p.old_price_usd :
                      (cur === "UAH" && p.old_price_uah) ? p.old_price_uah :
                      (p.old_price_eur || p.old_price || null);
  const fmt = (v) => (typeof formatPrice === "function") ? formatPrice(v, cur) : `€${Number(v).toFixed(2)}`;

  const priceHtml = `<span class="pp-price"
      data-price-eur="${p.price_eur || p.price || ""}"
      data-price-usd="${p.price_usd || ""}"
      data-price-uah="${p.price_uah || ""}">${fmt(priceVal)}</span>`;

  const oldPriceHtml = oldPriceVal
    ? `<s class="pp-old-price"
          data-old-price-eur="${p.old_price_eur || p.old_price || ""}"
          data-old-price-usd="${p.old_price_usd || ""}"
          data-old-price-uah="${p.old_price_uah || ""}">${fmt(oldPriceVal)}</s>` : "";

  const badge   = p.badge && window.PP_BADGE_CLS[p.badge]
    ? `<span class="pc-badge pp-badge-pos ${window.PP_BADGE_CLS[p.badge]}">${window.PP_BADGE_LBL[p.badge]}</span>` : "";
  const mainImg = images[0]
    ? `<img id="ppMainImg" class="pp-main-photo" src="${escPP(images[0])}" alt="${escPP(p.title)}">`
    : `<div class="pp-no-photo">No photo</div>`;
  const thumbs  = images.length > 1
    ? `<div class="pp-thumbs">${images.map((src, i) => `
        <button class="pp-thumb${i === 0 ? " active" : ""}" type="button" data-i="${i}">
          <img src="${escPP(src)}" alt="Photo ${i + 1}">
        </button>`).join("")}</div>` : "";
  const stock   = p.in_stock
    ? `<span class="pp-stock pp-stock-in">✓ In stock</span>`
    : `<span class="pp-stock pp-stock-out">Out of stock</span>`;

  const sizesHtml = sizes.length ? `
    <div class="pp-sizes-block">
      <div class="pp-sizes-head">
        <p class="pp-label">Choose size</p>
        <a href="#" class="pp-size-guide">Size guide</a>
      </div>
      <div class="pp-sizes">
        ${sizes.map(s => `
          <button type="button"
            class="pp-size${!s.in_stock ? " pp-size-na" : ""}"
            data-size="${escPP(s.size)}"
            ${!s.in_stock ? "disabled" : ""}>
            ${escPP(s.size)}
          </button>`).join("")}
      </div>
    </div>` : "";

  root.innerHTML = `
    <nav class="pp-crumb">
      <a href="index.html">Home</a><span>›</span>
      <a href="catalog.html">Catalog</a><span>›</span>
      ${p.team_name ? `<a href="catalog.html?l=${escPP(p.team_slug || "")}">${escPP(p.team_name)}</a><span>›</span>` : ""}
      <span>${escPP(p.title)}</span>
    </nav>

    <div class="pp-grid">
      <div class="pp-gallery">
        <div class="pp-main-wrap">${badge}${mainImg}</div>
        ${thumbs}
      </div>

      <div class="pp-info">
        ${p.team_name ? `<p class="pp-team-label">${escPP(p.team_name)}</p>` : ""}
        <h1 class="pp-title">${escPP(p.title)}</h1>

        <div class="pp-price-row">
          ${priceHtml}${oldPriceHtml}${stock}
        </div>

        ${p.description ? `<p class="pp-desc">${escPP(p.description)}</p>` : ""}

        ${sizesHtml}

        <div class="pp-cta">
          <button id="ppCartBtn" type="button"
            class="btn btn-dark pp-cart-btn"
            ${!p.in_stock ? "disabled" : ""}>
            ${p.in_stock ? "Add to cart" : "Out of stock"}
          </button>
        </div>

        <div id="ppCartFeedback" class="pp-cart-feedback"></div>

        <div class="pp-delivery">
          <div class="pp-delivery-row"><span class="pp-delivery-icon">🚚</span><span>Free delivery on orders over €50</span></div>
          <div class="pp-delivery-row"><span class="pp-delivery-icon">↩</span><span>30-day easy returns</span></div>
        </div>

      </div>
    </div>`;

  ppInitGallery(images);
  ppInitSizes();
  ppInitCartBtn(p);

  /* currency refresh */
  if (typeof refreshPrices === "function") refreshPrices();
  window.addEventListener("currencyChanged", () => {
    if (typeof refreshPrices === "function") refreshPrices();
  });

  if (p.team_slug) ppLoadRelated(p.team_slug, p.id);
}

/* ── Gallery ── */
function ppInitGallery(images) {
  if (images.length < 2) return;
  const main = document.getElementById("ppMainImg");
  document.querySelectorAll(".pp-thumb").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.i);
      if (main) {
        main.classList.add("pp-img-fade");
        setTimeout(() => { main.src = images[i]; main.classList.remove("pp-img-fade"); }, 160);
      }
      document.querySelectorAll(".pp-thumb").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

/* ── Sizes ── */
function ppInitSizes() {
  _ppActiveSize = null;
  document.querySelectorAll(".pp-size:not([disabled])").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pp-size").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      _ppActiveSize = btn.dataset.size;
    });
  });
}

/* ── Cart button ── */
function ppFlash(btn, msg, color) {
  const o = btn.textContent, ob = btn.style.background;
  btn.textContent = msg; btn.style.background = color;
  setTimeout(() => { btn.textContent = o; btn.style.background = ob; }, 2500);
}

function ppInitCartBtn(p) {
  const btn = document.getElementById("ppCartBtn");
  const fb  = document.getElementById("ppCartFeedback");
  if (!btn || !p.in_stock) return;

  btn.addEventListener("click", () => {
    /* require size if product has ANY sizes defined */
    const hasSizes = Array.isArray(p.sizes) && p.sizes.length > 0;
    if (hasSizes && !_ppActiveSize) {
      if (fb) { fb.textContent = "Please choose a size first"; fb.className = "pp-cart-feedback err"; }
      document.querySelector(".pp-sizes-block")?.classList.add("pp-sizes-shake");
      setTimeout(() => document.querySelector(".pp-sizes-block")?.classList.remove("pp-sizes-shake"), 500);
      return;
    }
    addToCart(p, _ppActiveSize);
    if (fb) fb.textContent = "";
    /* open cart drawer */
    if (typeof openCartDrawer === "function") openCartDrawer();
    else { ppFlash(btn, "Added to cart ✓", "#2e7d32"); }
  });
}

/* ── Related products ── */
async function ppLoadRelated(teamSlug, currentId) {
  const section = document.getElementById("relatedSection");
  const slider  = document.getElementById("relatedSlider");
  if (!section || !slider) return;
  try {
    const { data } = await supabaseClient.from("products")
      .select("id,title,slug,price,price_eur,price_usd,price_uah,old_price,badge,in_stock,images")
      .eq("team_slug", teamSlug).neq("id", currentId).limit(8);
    if (!data?.length) return;
    section.style.display = "";
    slider.innerHTML = data.map(p => {
      const pp = { ...p, price: p.price_eur || p.price };
      return (typeof buildProductCard === "function") ? buildProductCard(pp) : "";
    }).join("");
    document.getElementById("relatedLeft")?.addEventListener("click", () => slider.scrollBy({ left: -280, behavior: "smooth" }));
    document.getElementById("relatedRight")?.addEventListener("click", () => slider.scrollBy({ left: 280, behavior: "smooth" }));
  } catch(e) { console.error(e); }
}

/* ── Load product from Supabase ── */
async function ppLoadProduct() {
  updateCartUI();
  /* inject & wire cart drawer (script.js may already have done this, cdInjectHTML is idempotent) */
  if (typeof cdInjectHTML === "function") cdInjectHTML();
  document.getElementById("cartBtn")?.addEventListener("click", e => {
    e.preventDefault();
    if (typeof openCartDrawer === "function") openCartDrawer();
  });
  if (typeof initCurrencySwitcher === "function") initCurrencySwitcher("currencyContainer");

  const root = document.getElementById("ppRoot");
  const slug = getProductSlug();

  if (!slug) {
    if (root) root.innerHTML = `<p class="pp-state pp-state-err">Product not found.</p>`;
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("products").select("*").eq("slug", slug).single();
    if (error || !data) throw new Error("Not found");
    renderProductPage(data);
  } catch(e) {
    console.error(e);
    if (root) root.innerHTML = `<p class="pp-state pp-state-err">Product not found.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", ppLoadProduct);
