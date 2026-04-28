const SUPABASE_URL      = "https://puoaaphhdozbhqtdaejw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nPQPfB6BPwVDVyD01u0gZQ_-FTbOOF-";
const supabaseClient    = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const HERO_KEY  = "fcstoreua_hero";
const THEME_KEY = "fcstoreua_theme";

const heroSlider       = document.getElementById("heroSlider");
const themeToggle      = document.getElementById("themeToggle");
const catalogMenuInner = document.getElementById("catalogMenuInner");
let heroIntervalId     = null;

/* ── helpers ── */
function readStorage(key, fallback) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch(e) { return fallback; }
}
function escapeHtml(t) {
  if (t == null) return "";
  return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function slugify(v) {
  return String(v).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");
}

/* ── theme ── */
function applyTheme(theme) {
  document.body.classList.toggle("dark-theme", theme === "dark");
  if (!themeToggle) return;
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  themeToggle.setAttribute("aria-label", label);
  themeToggle.setAttribute("title", label);
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || "dark");
  themeToggle?.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    const next   = isDark ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

/* ── hero slider ── */
function startHeroInterval(imgs) {
  if (heroIntervalId) { clearInterval(heroIntervalId); heroIntervalId = null; }
  if (imgs.length < 2) return;
  let cur = 0;
  heroIntervalId = setInterval(() => {
    imgs[cur].classList.remove("active");
    cur = (cur + 1) % imgs.length;
    imgs[cur].classList.add("active");
  }, 3000);
}

function applyHeroSlides(slides) {
  if (!heroSlider) return;
  if (!slides.length) {
    heroSlider.innerHTML = `<div class="hero-slide-placeholder">FCStoreUA</div>`;
    return;
  }
  heroSlider.innerHTML = slides.map((src, i) =>
    `<img src="${src}" alt="Hero ${i+1}" class="hero-slide-image ${i===0?"active":""}" draggable="false">`
  ).join("");
  startHeroInterval(heroSlider.querySelectorAll(".hero-slide-image"));
}

async function renderHeroSlider() {
  if (!heroSlider) return;
  if (heroIntervalId) { clearInterval(heroIntervalId); heroIntervalId = null; }
  try {
    const { data } = await supabaseClient
      .from("store_settings").select("value").eq("key", "hero_slider").single();
    const slides = (data?.value?.slides || []).filter(Boolean);
    applyHeroSlides(slides);
  } catch(e) {
    /* fallback to localStorage if Supabase fails */
    const slides = (readStorage(HERO_KEY, { slides: [] }).slides || []).filter(Boolean);
    applyHeroSlides(slides);
  }
}
function renderLeagueImages() {}

/* ── league slider ── */
function initLeagueSlider() {
  const slider = document.getElementById("leagueSlider");
  if (!slider) return;
  const step = 280;
  document.getElementById("leagueLeft")?.addEventListener("click",  () => slider.scrollBy({left:-step,behavior:"smooth"}));
  document.getElementById("leagueRight")?.addEventListener("click", () => slider.scrollBy({left: step,behavior:"smooth"}));
}

/* ── catalog dropdown — query params URLs (work on any server) ── */
async function loadCatalogData() {
  const [{ data: sections, error: e1 }, { data: columns, error: e2 }, { data: links, error: e3 }] =
    await Promise.all([
      supabaseClient.from("catalog_sections").select("*").eq("is_active",true).order("sort_order",{ascending:true}).order("id",{ascending:true}),
      supabaseClient.from("catalog_columns").select("*").order("sort_order",{ascending:true}).order("id",{ascending:true}),
      supabaseClient.from("catalog_links").select("*").eq("is_active",true).order("sort_order",{ascending:true}).order("id",{ascending:true})
    ]);
  if (e1) throw e1; if (e2) throw e2; if (e3) throw e3;
  return { sections: sections||[], columns: columns||[], links: links||[] };
}

function buildCatalogHtml(sections, columns, links) {
  if (!sections.length) return `<div class="catalog-empty">Catalog is empty.</div>`;

  const sidebar = `<aside class="catalog-sidebar">${sections.map((s,i) => `
    <a class="catalog-side-link ${i===0?"active":""}"
       href="catalog.html?s=${escapeHtml(s.slug)}"
       data-menu="${s.id}">
      ${escapeHtml(s.name)}
    </a>`).join("")}</aside>`;

  const panels = `<div class="catalog-panels">${sections.map((s,i) => {
    const cols = columns.filter(c => Number(c.section_id) === Number(s.id));
    return `<div class="catalog-panel ${i===0?"active":""}" data-panel="${s.id}">
      <div class="catalog-columns">${cols.map(col => {
        const cSlug  = col.slug || slugify(col.title||"");
        const colUrl = `catalog.html?s=${escapeHtml(s.slug)}&c=${escapeHtml(cSlug)}`;
        const lnks   = links.filter(l => Number(l.column_id) === Number(col.id));
        return `<div class="catalog-column">
          <h4><a href="${colUrl}" class="catalog-column-heading-link">${escapeHtml(col.title)}</a></h4>
          ${lnks.map(l => {
            const lSlug = l.slug || slugify(l.label||"");
            return `<a href="catalog.html?s=${escapeHtml(s.slug)}&c=${escapeHtml(cSlug)}&l=${escapeHtml(lSlug)}">${escapeHtml(l.label)}</a>`;
          }).join("")}
        </div>`;
      }).join("")}</div>
    </div>`;
  }).join("")}</div>`;

  return sidebar + panels;
}

function initCatalogHover() {
  const links  = document.querySelectorAll(".catalog-side-link");
  const panels = document.querySelectorAll(".catalog-panel");
  links.forEach(link => {
    link.addEventListener("mouseenter", () => {
      const target = link.dataset.menu;
      links.forEach(l => l.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      link.classList.add("active");
      document.querySelector(`.catalog-panel[data-panel="${target}"]`)?.classList.add("active");
    });
  });
}

async function renderCatalogFromDatabase() {
  if (!catalogMenuInner) return;
  try {
    const { sections, columns, links } = await loadCatalogData();
    catalogMenuInner.innerHTML = buildCatalogHtml(sections, columns, links);
    initCatalogHover();
  } catch(e) {
    console.error(e);
    catalogMenuInner.innerHTML = `<div class="catalog-empty">Failed to load catalog.</div>`;
  }
}

/* ══ PRODUCT CARDS (currency-aware) ══ */
const BADGE_LABELS = { new:"New", popular:"Popular", limited:"Limited", retro:"Retro" };
const BADGE_CLS    = { new:"product-badge-new", popular:"product-badge-popular", limited:"product-badge-limited", retro:"product-badge-retro" };

function buildProductCard(p) {
  const cur      = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "EUR";
  const price    = (typeof formatPrice === "function") ? formatPrice(p.price, cur) : `€${p.price}`;
  const oldPriceVal = p.old_price && (typeof formatPrice === "function")
    ? `<span class="pc-old-price" data-eur-price="${p.old_price}">${formatPrice(p.old_price, cur)}</span>` : "";
  const img     = Array.isArray(p.images) && p.images[0]
    ? `<img src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.title)}" class="pc-img" loading="lazy">`
    : `<div class="pc-placeholder">${escapeHtml(p.title)}</div>`;
  const badge   = p.badge && BADGE_CLS[p.badge] ? `<span class="pc-badge ${BADGE_CLS[p.badge]}">${BADGE_LABELS[p.badge]}</span>` : "";
  const soldOut = !p.in_stock ? `<div class="pc-soldout"><span>Out of stock</span></div>` : "";
  /* use query param for product URL — works on all servers */
  const url     = p.slug ? `product.html?slug=${escapeHtml(p.slug)}` : "#";
  return `
    <a href="${url}" class="product-card">
      <div class="pc-image-wrap">${badge}${img}${soldOut}</div>
      <div class="pc-info">
        <p class="pc-title">${escapeHtml(p.title)}</p>
        <div class="pc-footer">
          <div class="pc-pricing">
            <span class="pc-price" data-eur-price="${p.price}">${price}</span>
            ${oldPriceVal}
          </div>
          <button class="pc-btn" type="button" onclick="event.preventDefault();event.stopPropagation()">+</button>
        </div>
      </div>
    </a>`;
}

function attachSliderArrows(sliderId, leftId, rightId) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  const step = 280;
  document.getElementById(leftId)?.addEventListener("click",  () => slider.scrollBy({left:-step,behavior:"smooth"}));
  document.getElementById(rightId)?.addEventListener("click", () => slider.scrollBy({left: step,behavior:"smooth"}));
}

async function renderProductSlider(sliderId, query) {
  const slider = document.getElementById(sliderId);
  if (!slider) return;
  try {
    const { data, error } = await query;
    if (error) throw error;
    if (!data?.length) { slider.innerHTML = `<p class="ps-empty">No products yet.</p>`; return; }
    slider.innerHTML = data.map(buildProductCard).join("");
  } catch(e) {
    console.error(e);
    slider.innerHTML = `<p class="ps-empty">Could not load.</p>`;
  }
}

function buildCategorySection(slug, name, products) {
  if (!products.length) return;
  const sliderId = `cat-slider-${slug}`;
  const leftId   = `cat-left-${slug}`;
  const rightId  = `cat-right-${slug}`;
  const section  = document.createElement("section");
  section.className = "products-section";
  section.innerHTML = `
    <div class="container">
      <div class="section-head">
        <h2>${escapeHtml(name)}</h2>
        <a href="catalog.html?s=${escapeHtml(slug)}">View all</a>
      </div>
      <div class="product-slider-wrapper">
        <button class="league-arrow league-arrow-left" id="${leftId}" type="button">‹</button>
        <div class="product-slider" id="${sliderId}">${products.map(buildProductCard).join("")}</div>
        <button class="league-arrow league-arrow-right" id="${rightId}" type="button">›</button>
      </div>
    </div>`;
  document.getElementById("categorySections")?.appendChild(section);
  attachSliderArrows(sliderId, leftId, rightId);
}

async function loadCategorySections() {
  try {
    const [{ data: sections }, { data: products }] = await Promise.all([
      supabaseClient.from("catalog_sections").select("id,name,slug")
        .eq("is_active", true).eq("show_on_homepage", true).order("sort_order",{ascending:true}),
      supabaseClient.from("products").select("id,title,slug,price,old_price,badge,in_stock,images,category")
        .eq("in_stock", true).order("created_at",{ascending:false})
    ]);
    if (!sections?.length || !products?.length) return;
    sections.forEach(s => buildCategorySection(s.slug, s.name, products.filter(p => p.category === s.slug)));
  } catch(e) { console.error("Category sections failed:", e); }
}

/* ═══════════════════════════════════════════
   CART DRAWER  (global, works on every page)
═══════════════════════════════════════════ */
const CART_KEY_DRAWER = "fcstoreua_cart";

function cdGetCart()      { try { return JSON.parse(localStorage.getItem(CART_KEY_DRAWER) || "[]"); } catch(e) { return []; } }
function cdSaveCart(c)    { localStorage.setItem(CART_KEY_DRAWER, JSON.stringify(c)); }
function cdGetCount()     { return cdGetCart().reduce((s,i) => s + (i.qty || 1), 0); }

function cdItemPrice(item) {
  const cur = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "UAH";
  if (cur === "USD" && item.price_usd) return Number(item.price_usd);
  if (cur === "UAH" && item.price_uah) return Number(item.price_uah);
  if (item.price_eur)                  return Number(item.price_eur);
  return Number(item.price || 0);
}
function cdFmt(v) {
  return (typeof formatPrice === "function") ? formatPrice(v, (typeof getSavedCurrency === "function") ? getSavedCurrency() : "UAH")
    : `₴${Number(v).toFixed(0)}`;
}

function cdInjectHTML() {
  if (document.getElementById("cartDrawer")) return;
  const overlay = document.createElement("div");
  overlay.id = "cartDrawerOverlay";
  overlay.className = "cdrawer-overlay";
  overlay.addEventListener("click", closeCartDrawer);

  const drawer = document.createElement("aside");
  drawer.id = "cartDrawer";
  drawer.className = "cdrawer";
  drawer.innerHTML = `
    <div class="cdrawer-head">
      <div>
        <p class="cdrawer-title">Cart</p>
        <p class="cdrawer-subtitle" id="cdrawerSubtitle">0 items</p>
      </div>
      <button class="cdrawer-close" id="cdrawerClose" type="button" aria-label="Close">✕</button>
    </div>
    <div class="cdrawer-body" id="cdrawerBody"></div>
    <div class="cdrawer-footer" id="cdrawerFooter" style="display:none">
      <div class="cdrawer-total-row">
        <span>Total</span>
        <span id="cdrawerTotal">—</span>
      </div>
      <a href="checkout.html" class="btn btn-dark cdrawer-cta">Go to checkout →</a>
      <button type="button" class="btn btn-light cdrawer-continue" id="cdrawerContinue">Continue shopping</button>
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  document.getElementById("cdrawerClose")?.addEventListener("click", closeCartDrawer);
  document.getElementById("cdrawerContinue")?.addEventListener("click", closeCartDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeCartDrawer(); });
}

function openCartDrawer() {
  cdRenderDrawer();
  document.getElementById("cartDrawerOverlay")?.classList.add("open");
  document.getElementById("cartDrawer")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCartDrawer() {
  document.getElementById("cartDrawerOverlay")?.classList.remove("open");
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.body.style.overflow = "";
}

function cdRenderDrawer() {
  const cart   = cdGetCart();
  const body   = document.getElementById("cdrawerBody");
  const footer = document.getElementById("cdrawerFooter");
  const sub    = document.getElementById("cdrawerSubtitle");
  const tot    = document.getElementById("cdrawerTotal");
  if (!body) return;

  const count = cdGetCount();
  if (sub) sub.textContent = `${count} item${count !== 1 ? "s" : ""}`;

  if (!cart.length) {
    body.innerHTML = `
      <div class="cdrawer-empty-state">
        <div class="cdrawer-empty-icon">🛒</div>
        <p>Your cart is empty</p>
        <a href="catalog.html" class="btn btn-dark" style="margin-top:8px">Browse catalog</a>
      </div>`;
    if (footer) footer.style.display = "none";
    return;
  }

  const total = cart.reduce((s, i) => s + cdItemPrice(i) * (i.qty || 1), 0);
  if (tot) tot.textContent = cdFmt(total);
  if (footer) footer.style.display = "";

  body.innerHTML = cart.map(item => {
    const linePrice = cdItemPrice(item) * (item.qty || 1);
    const imgHtml   = item.image
      ? `<img src="${item.image}" alt="${item.title || ""}">`
      : `<div class="cdi-thumb-empty">⚽</div>`;
    return `
      <div class="cdi" data-key="${item.key}">
        <a href="product.html?slug=${item.slug || ""}" class="cdi-thumb" onclick="closeCartDrawer()">${imgHtml}</a>
        <div class="cdi-info">
          <p class="cdi-title">${item.title || "Product"}</p>
          ${item.size ? `<p class="cdi-meta">Size: ${item.size}</p>` : ""}
          <p class="cdi-price">${cdFmt(linePrice)}</p>
        </div>
        <div class="cdi-right">
          <div class="cdi-qty">
            <button class="cdi-qty-btn" data-key="${item.key}" data-action="dec" type="button">−</button>
            <span class="cdi-qty-val">${item.qty || 1}</span>
            <button class="cdi-qty-btn" data-key="${item.key}" data-action="inc" type="button">+</button>
          </div>
          <button class="cdi-remove" data-key="${item.key}" type="button">remove</button>
        </div>
      </div>`;
  }).join("");

  /* qty / remove handlers */
  body.querySelectorAll(".cdi-qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cart = cdGetCart();
      const item = cart.find(i => i.key === btn.dataset.key);
      if (!item) return;
      if (btn.dataset.action === "inc") { item.qty = (item.qty || 1) + 1; }
      else {
        item.qty = (item.qty || 1) - 1;
        if (item.qty < 1) { cdSaveCart(cart.filter(i => i.key !== item.key)); updateCartBadge(); cdRenderDrawer(); return; }
      }
      cdSaveCart(cart);
      updateCartBadge();
      cdRenderDrawer();
    });
  });
  body.querySelectorAll(".cdi-remove").forEach(btn => {
    btn.addEventListener("click", () => {
      cdSaveCart(cdGetCart().filter(i => i.key !== btn.dataset.key));
      updateCartBadge();
      cdRenderDrawer();
    });
  });
}

/* ── global cart counter (for all pages) ── */
function updateCartBadge() {
  const CART_KEY = "fcstoreua_cart";
  let count = 0;
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    count = cart.reduce((s, i) => s + (i.qty || 1), 0);
  } catch(e) {}
  const btn = document.getElementById("cartBtn");
  if (btn) btn.textContent = `Cart (${count})`;
}

/* ══ INIT ══ */
async function initStorefront() {
  initTheme();
  cdInjectHTML();
  updateCartBadge();
  /* Cart button opens drawer */
  document.getElementById("cartBtn")?.addEventListener("click", e => {
    e.preventDefault();
    openCartDrawer();
  });
  renderHeroSlider(); /* async — runs in background, no await needed */
  renderLeagueImages();
  initLeagueSlider();
  renderCatalogFromDatabase();

  if (typeof initCurrencySwitcher === "function") initCurrencySwitcher("currencyContainer");
  window.addEventListener("currencyChanged", () => {
    if (typeof refreshPrices === "function") refreshPrices();
  });

  attachSliderArrows("newArrivalsSlider","newLeft","newRight");
  attachSliderArrows("featuredSlider","featuredLeft","featuredRight");

  await Promise.all([
    renderProductSlider("newArrivalsSlider",
      supabaseClient.from("products").select("id,title,slug,price,old_price,badge,in_stock,images")
        .order("created_at",{ascending:false}).limit(12)),
    renderProductSlider("featuredSlider",
      supabaseClient.from("products").select("id,title,slug,price,old_price,badge,in_stock,images")
        .eq("featured",true).order("created_at",{ascending:false}).limit(12)),
    loadCategorySections()
  ]);
}

document.addEventListener("DOMContentLoaded", () => initStorefront());
