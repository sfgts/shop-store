/* ==============================================
   catalog-page.js
   Works with BOTH:
   - Query params:  catalog.html?s=club-shirts&c=premier-league&l=arsenal
   - Clean URLs:    /catalog/club-shirts/premier-league/arsenal  (Netlify/Vercel)
============================================== */

const SUPABASE_URL_CAT      = "https://puoaaphhdozbhqtdaejw.supabase.co";
const SUPABASE_ANON_KEY_CAT = "sb_publishable_nPQPfB6BPwVDVyD01u0gZQ_-FTbOOF-";
const sbCat = (typeof supabaseClient !== "undefined")
  ? supabaseClient
  : window.supabase.createClient(SUPABASE_URL_CAT, SUPABASE_ANON_KEY_CAT);

/* ─── helpers ─── */
function eCat(v) {
  if (v == null) return "";
  return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;")
    .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}
function slugifyCat(v) {
  return String(v).toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");
}

/* Parse either query params OR clean pathname */
function parseCatalogPath() {
  const params = new URLSearchParams(location.search);

  // Query params mode: catalog.html?s=...&c=...&l=...
  if (params.get("s")) {
    return {
      sectionSlug: params.get("s") || "",
      columnSlug:  params.get("c") || "",
      teamSlug:    params.get("l") || "",
    };
  }

  // Clean URL mode: /catalog/section/column/team
  const parts = location.pathname.replace(/^\//, "").split("/").filter(Boolean);
  // parts[0] = "catalog" or "catalog.html"
  return {
    sectionSlug: parts[1] || "",
    columnSlug:  parts[2] || "",
    teamSlug:    parts[3] || "",
  };
}

/* Build URL — always use query params for links (works everywhere) */
function catUrl(section = "", column = "", team = "") {
  if (team)    return `catalog.html?s=${section}&c=${column}&l=${team}`;
  if (column)  return `catalog.html?s=${section}&c=${column}`;
  if (section) return `catalog.html?s=${section}`;
  return "catalog.html";
}

function setContent(html) {
  const el = document.getElementById("catalogPageContent");
  if (el) el.innerHTML = html;
}

function setBreadcrumb(items) {
  const el = document.getElementById("catalogBreadcrumb");
  if (!el) return;
  const base = [
    { label: "Home",    href: "index.html" },
    { label: "Catalog", href: "catalog.html" },
  ];
  const all = [...base, ...items];
  el.innerHTML = all.map((item, i) =>
    i < all.length - 1
      ? `<a href="${eCat(item.href)}">${eCat(item.label)}</a><span>›</span>`
      : `<span>${eCat(item.label)}</span>`
  ).join("");
}

/* ─── card builders ─── */
function catCard(href, title) {
  return `
    <a href="${eCat(href)}" class="cat-card">
      <div class="cat-card-image">
        <div class="cat-card-placeholder">${eCat(title)}</div>
      </div>
      <div class="cat-card-info"><h3>${eCat(title)}</h3></div>
    </a>`;
}

function productCard(p) {
  const cur = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "UAH";
  const priceVal = cur === "USD" ? (p.price_usd || p.price_eur || p.price)
                 : cur === "UAH" ? (p.price_uah || p.price_eur || p.price)
                 : (p.price_eur || p.price);
  const price    = (typeof formatPrice === "function") ? formatPrice(priceVal, cur) : `₴${priceVal}`;
  const oldPrice = p.old_price && (typeof formatPrice === "function")
    ? `<span class="pc-old-price" data-eur-price="${p.old_price}">${formatPrice(p.old_price, cur)}</span>`
    : "";
  const img    = Array.isArray(p.images) && p.images[0]
    ? `<img src="${eCat(p.images[0])}" alt="${eCat(p.title)}" class="pc-img" loading="lazy">`
    : `<div class="pc-placeholder">${eCat(p.title)}</div>`;
  const BCLS   = { new:"product-badge-new", popular:"product-badge-popular", limited:"product-badge-limited", retro:"product-badge-retro" };
  const BLBL   = { new:"New", popular:"Popular", limited:"Limited", retro:"Retro" };
  const badge  = p.badge && BCLS[p.badge] ? `<span class="pc-badge ${BCLS[p.badge]}">${BLBL[p.badge]}</span>` : "";
  const sold   = !p.in_stock ? `<div class="pc-soldout"><span>Out of stock</span></div>` : "";
  const url    = p.slug ? `product.html?slug=${eCat(p.slug)}` : "#";
  return `
    <a href="${url}" class="product-card">
      <div class="pc-image-wrap">${badge}${img}${sold}</div>
      <div class="pc-info">
        <p class="pc-title">${eCat(p.title)}</p>
        <div class="pc-footer">
          <div class="pc-pricing">
            <span class="pc-price" data-eur-price="${p.price}">${price}</span>
            ${oldPrice}
          </div>
          <button class="pc-btn" type="button" onclick="event.preventDefault();event.stopPropagation()">+</button>
        </div>
      </div>
    </a>`;
}

/* ─── Level 0: all sections ─── */
async function renderAllSections() {
  document.title = "Catalog | FCStoreUA";
  setBreadcrumb([]);
  const { data, error } = await sbCat
    .from("catalog_sections")
    .select("*").eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data?.length) {
    setContent(`<p class="pp-state">No categories found.</p>`);
    return;
  }
  setContent(`
    <div class="catalog-page-head">
      <h1>All categories</h1>
      <p class="catalog-page-count">${data.length} categories</p>
    </div>
    <div class="cat-grid">
      ${data.map(s => catCard(catUrl(s.slug), s.name)).join("")}
    </div>`);
}

/* ─── Level 1: section → all products in this category ─── */
async function renderSection(sectionSlug) {
  const { data: section } = await sbCat
    .from("catalog_sections").select("*").eq("slug", sectionSlug).single();
  if (!section) { setContent(`<p class="pp-state pp-state-err">Section not found.</p>`); return; }

  document.title = `${section.name} | FCStoreUA`;
  setBreadcrumb([{ label: section.name, href: catUrl(sectionSlug) }]);

  /* fetch league filter tabs in parallel with products */
  const [{ data: columns }, { data: products }] = await Promise.all([
    sbCat.from("catalog_columns").select("*")
      .eq("section_id", section.id).order("sort_order", { ascending: true }),
    sbCat.from("products")
      .select("id,title,slug,price,price_eur,price_usd,price_uah,old_price,badge,in_stock,images,team_slug")
      .eq("category", sectionSlug).eq("is_visible", true)
      .order("created_at", { ascending: false }),
  ]);

  /* league filter chips (optional navigation) */
  const filterHtml = columns?.length ? `
    <div class="cat-filter-row">
      <a href="${catUrl(sectionSlug)}" class="cat-filter-chip active">All</a>
      ${columns.map(col => {
        const cSlug = col.slug || slugifyCat(col.title || "");
        return `<a href="${catUrl(sectionSlug, cSlug)}" class="cat-filter-chip">${eCat(col.title)}</a>`;
      }).join("")}
    </div>` : "";

  setContent(`
    <div class="catalog-page-head">
      <h1>${eCat(section.name)}</h1>
      <p class="catalog-page-count">${products?.length || 0} shirt${products?.length !== 1 ? "s" : ""}</p>
    </div>
    ${filterHtml}
    ${products?.length
      ? `<div class="cat-products-grid">${products.map(productCard).join("")}</div>`
      : `<p class="pp-state" style="padding:40px 0">No products in this section yet.</p>`
    }`);
}

/* ─── Level 2: column → all products in this league ─── */
async function renderColumn(sectionSlug, columnSlug) {
  const { data: section } = await sbCat
    .from("catalog_sections").select("*").eq("slug", sectionSlug).single();
  if (!section) { setContent(`<p class="pp-state pp-state-err">Not found.</p>`); return; }

  const { data: columns } = await sbCat
    .from("catalog_columns").select("*").eq("section_id", section.id);
  const column = columns?.find(c =>
    (c.slug || slugifyCat(c.title || "")) === columnSlug
  );
  if (!column) { setContent(`<p class="pp-state pp-state-err">League not found.</p>`); return; }

  document.title = `${column.title} | FCStoreUA`;
  setBreadcrumb([
    { label: section.name, href: catUrl(sectionSlug) },
    { label: column.title, href: catUrl(sectionSlug, columnSlug) },
  ]);

  /* fetch teams + all their products in parallel */
  const { data: links } = await sbCat
    .from("catalog_links").select("*")
    .eq("column_id", column.id).eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!links?.length) {
    setContent(`
      <div class="catalog-page-head"><h1>${eCat(column.title)}</h1></div>
      <p class="pp-state">No teams in this league yet.</p>`);
    return;
  }

  const teamSlugs = links.map(l => l.slug || slugifyCat(l.label || ""));
  const { data: products } = await sbCat
    .from("products")
    .select("id,title,slug,price,price_eur,price_usd,price_uah,old_price,badge,in_stock,images,team_slug")
    .in("team_slug", teamSlugs).eq("category", sectionSlug).eq("is_visible", true)
    .order("created_at", { ascending: false });

  /* team filter chips */
  const filterHtml = `
    <div class="cat-filter-row">
      <a href="${catUrl(sectionSlug, columnSlug)}" class="cat-filter-chip active">All</a>
      ${links.map(l => {
        const lSlug = l.slug || slugifyCat(l.label || "");
        return `<a href="${catUrl(sectionSlug, columnSlug, lSlug)}" class="cat-filter-chip">${eCat(l.label)}</a>`;
      }).join("")}
    </div>`;

  setContent(`
    <div class="catalog-page-head">
      <h1>${eCat(column.title)}</h1>
      <p class="catalog-page-count">${products?.length || 0} shirt${products?.length !== 1 ? "s" : ""}</p>
    </div>
    ${filterHtml}
    ${products?.length
      ? `<div class="cat-products-grid">${products.map(productCard).join("")}</div>`
      : `<p class="pp-state" style="padding:40px 0">No products in this league yet.</p>`
    }`);
}

/* ─── Level 3: team → products ─── */
async function renderTeam(sectionSlug, columnSlug, teamSlug) {
  const { data: section } = await sbCat
    .from("catalog_sections").select("*").eq("slug", sectionSlug).single();
  const { data: allCols } = await sbCat
    .from("catalog_columns").select("*").eq("section_id", section?.id || 0);
  const column = allCols?.find(c =>
    (c.slug || slugifyCat(c.title || "")) === columnSlug
  );
  const { data: allLinks } = column
    ? await sbCat.from("catalog_links").select("*").eq("column_id", column.id)
    : { data: [] };
  const link = allLinks?.find(l =>
    (l.slug || slugifyCat(l.label || "")) === teamSlug
  );

  if (!section || !column || !link) {
    setContent(`<p class="pp-state pp-state-err">Not found.</p>`);
    return;
  }

  document.title = `${link.label} Shirts | FCStoreUA`;
  setBreadcrumb([
    { label: section.name, href: catUrl(sectionSlug) },
    { label: column.title, href: catUrl(sectionSlug, columnSlug) },
    { label: link.label,   href: catUrl(sectionSlug, columnSlug, teamSlug) },
  ]);

  const { data: products } = await sbCat
    .from("products")
    .select("id,title,slug,price,price_eur,price_usd,price_uah,old_price,badge,in_stock,images,team_slug")
    .eq("team_slug", teamSlug).eq("category", sectionSlug).eq("is_visible", true)
    .order("created_at", { ascending: false });

  setContent(`
    <div class="catalog-page-head">
      <h1>${eCat(link.label)}</h1>
      <p class="catalog-page-count">${products?.length || 0} shirt${products?.length !== 1 ? "s" : ""}</p>
    </div>
    ${products?.length
      ? `<div class="cat-products-grid">${products.map(productCard).join("")}</div>`
      : `<p class="pp-state" style="padding:40px 0">No products for ${eCat(link.label)} yet.</p>`
    }`);
}

/* ─── router ─── */
async function initCatalogPage() {
  if (typeof initCurrencySwitcher === "function") initCurrencySwitcher("currencyContainer");
  window.addEventListener("currencyChanged", () => {
    if (typeof refreshPrices === "function") refreshPrices();
  });

  const { sectionSlug, columnSlug, teamSlug } = parseCatalogPath();

  try {
    if (teamSlug && columnSlug && sectionSlug)  await renderTeam(sectionSlug, columnSlug, teamSlug);
    else if (columnSlug && sectionSlug)          await renderColumn(sectionSlug, columnSlug);
    else if (sectionSlug)                        await renderSection(sectionSlug);
    else                                         await renderAllSections();
  } catch (err) {
    console.error(err);
    setContent(`<p class="pp-state pp-state-err">Failed to load page.</p>`);
  }

  if (typeof refreshPrices === "function") refreshPrices();
}

document.addEventListener("DOMContentLoaded", initCatalogPage);
