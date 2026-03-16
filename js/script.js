console.log("storefront script loaded");

/* =========================
   Supabase
========================= */

const SUPABASE_URL = "https://puoaaphhdozbhqtdaejw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nPQPfB6BPwVDVyD01u0gZQ_-FTbOOF-";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* =========================
   Keys
========================= */

const HERO_KEY = "fcstoreua_hero";
const THEME_KEY = "fcstoreua_theme";

/* =========================
   DOM
========================= */

const heroSlider = document.getElementById("heroSlider");
const themeToggle = document.getElementById("themeToggle");
const catalogMenuInner = document.getElementById("catalogMenuInner");

const leagueImagePremierLeague = document.getElementById("leagueImagePremierLeague");
const leagueImageLaLiga = document.getElementById("leagueImageLaLiga");
const leagueImageSerieA = document.getElementById("leagueImageSerieA");
const leagueImageBundesliga = document.getElementById("leagueImageBundesliga");
const leagueImageLigue1 = document.getElementById("leagueImageLigue1");

let heroIntervalId = null;

/* =========================
   Helpers
========================= */

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key}:`, error);
    return fallback;
  }
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createImageTag(src, alt, className) {
  return `<img src="${src}" alt="${escapeHtml(alt)}" class="${className}">`;
}

/* =========================
   Theme
========================= */

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function updateThemeButton(theme) {
  if (!themeToggle) return;

  const nextThemeLabel =
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  themeToggle.setAttribute("aria-label", nextThemeLabel);
  themeToggle.setAttribute("title", nextThemeLabel);
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.classList.add("dark-theme");
  } else {
    document.body.classList.remove("dark-theme");
  }

  updateThemeButton(theme);
}

function initTheme() {
  const savedTheme = getSavedTheme();
  applyTheme(savedTheme);

  if (!themeToggle) return;

  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    const nextTheme = isDark ? "light" : "dark";

    localStorage.setItem(THEME_KEY, nextTheme);
    applyTheme(nextTheme);
  });
}

/* =========================
   Hero slider
========================= */

function getHeroData() {
  return readStorage(HERO_KEY, { slides: [] });
}

function renderHeroSlider() {
  if (!heroSlider) return;

  const hero = getHeroData();
  const slides = (hero.slides || []).filter(Boolean);

  if (heroIntervalId) {
    clearInterval(heroIntervalId);
    heroIntervalId = null;
  }

  if (!slides.length) {
    heroSlider.innerHTML = `<div class="hero-slide-placeholder">FCStoreUA</div>`;
    return;
  }

  heroSlider.innerHTML = slides
    .map((src, index) => {
      return `
        <img
          src="${src}"
          alt="Hero slide ${index + 1}"
          class="hero-slide-image ${index === 0 ? "active" : ""}"
          draggable="false"
        >
      `;
    })
    .join("");

  if (slides.length === 1) return;

  const images = heroSlider.querySelectorAll(".hero-slide-image");
  let currentIndex = 0;

  heroIntervalId = setInterval(() => {
    images[currentIndex].classList.remove("active");
    currentIndex = (currentIndex + 1) % images.length;
    images[currentIndex].classList.add("active");
  }, 3000);
}

/* =========================
   League images
========================= */

function renderLeagueImage(container, src, fallbackText, altText) {
  if (!container) return;

  if (src && src.trim() !== "") {
    container.innerHTML = createImageTag(src, altText, "collection-photo");
  } else {
    container.innerHTML = `<div class="collection-placeholder">${fallbackText}</div>`;
  }
}

function renderLeagueImages() {
  renderLeagueImage(
    leagueImagePremierLeague,
    "images/leagues/premier-league.png",
    "Premier League",
    "Premier League"
  );

  renderLeagueImage(
    leagueImageLaLiga,
    "images/leagues/laliga.png",
    "LALIGA",
    "LALIGA"
  );

  renderLeagueImage(
    leagueImageSerieA,
    "images/leagues/serie-a.png",
    "Serie A",
    "Serie A"
  );

  renderLeagueImage(
    leagueImageBundesliga,
    "images/leagues/bundesliga.png",
    "Bundesliga",
    "Bundesliga"
  );

  renderLeagueImage(
    leagueImageLigue1,
    "images/leagues/ligue-1.png",
    "Ligue 1",
    "Ligue 1"
  );
}

/* =========================
   League slider
========================= */

function initLeagueSlider() {
  const slider = document.getElementById("leagueSlider");
  const left = document.getElementById("leagueLeft");
  const right = document.getElementById("leagueRight");

  if (!slider) return;

  const cardWidth = 280;

  if (right) {
    right.addEventListener("click", () => {
      slider.scrollBy({
        left: cardWidth,
        behavior: "smooth"
      });
    });
  }

  if (left) {
    left.addEventListener("click", () => {
      slider.scrollBy({
        left: -cardWidth,
        behavior: "smooth"
      });
    });
  }
}

/* =========================
   Catalog from Supabase
========================= */

async function loadCatalogData() {
  const [{ data: sections, error: sectionsError }, { data: columns, error: columnsError }, { data: links, error: linksError }] =
    await Promise.all([
      supabaseClient
        .from("catalog_sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),

      supabaseClient
        .from("catalog_columns")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true }),

      supabaseClient
        .from("catalog_links")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
    ]);

  if (sectionsError) throw sectionsError;
  if (columnsError) throw columnsError;
  if (linksError) throw linksError;

  return {
    sections: sections || [],
    columns: columns || [],
    links: links || []
  };
}

function buildCatalogHtml(sections, columns, links) {
  if (!sections.length) {
    return `<div class="catalog-empty">Catalog is empty.</div>`;
  }

  const sidebarHtml = `
    <aside class="catalog-sidebar">
      ${sections
        .map((section, index) => {
          return `
            <button
              class="catalog-side-link ${index === 0 ? "active" : ""}"
              type="button"
              data-menu="${section.id}"
            >
              ${escapeHtml(section.name)}
            </button>
          `;
        })
        .join("")}
    </aside>
  `;

  const panelsHtml = `
    <div class="catalog-panels">
      ${sections
        .map((section, index) => {
          const sectionColumns = columns.filter(
            (column) => Number(column.section_id) === Number(section.id)
          );

          return `
            <div class="catalog-panel ${index === 0 ? "active" : ""}" data-panel="${section.id}">
              <div class="catalog-columns">
                ${sectionColumns
                  .map((column) => {
                    const columnLinks = links.filter(
                      (link) => Number(link.column_id) === Number(column.id)
                    );

                    return `
                      <div class="catalog-column">
                        <h4>${escapeHtml(column.title)}</h4>
                        ${columnLinks
                          .map((link) => {
                            return `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`;
                          })
                          .join("")}
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  return `${sidebarHtml}${panelsHtml}`;
}

function initCatalogHover() {
  const catalogLinks = document.querySelectorAll(".catalog-side-link");
  const catalogPanels = document.querySelectorAll(".catalog-panel");

  catalogLinks.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      const target = btn.dataset.menu;

      catalogLinks.forEach((item) => item.classList.remove("active"));
      catalogPanels.forEach((panel) => panel.classList.remove("active"));

      btn.classList.add("active");

      const activePanel = document.querySelector(
        `.catalog-panel[data-panel="${target}"]`
      );

      if (activePanel) {
        activePanel.classList.add("active");
      }
    });
  });
}

async function renderCatalogFromDatabase() {
  if (!catalogMenuInner) return;

  try {
    const { sections, columns, links } = await loadCatalogData();
    catalogMenuInner.innerHTML = buildCatalogHtml(sections, columns, links);
    initCatalogHover();
  } catch (error) {
    console.error("Catalog load failed:", error);
    catalogMenuInner.innerHTML = `<div class="catalog-empty">Failed to load catalog.</div>`;
  }
}

/* =========================
   Init
========================= */

function initStorefront() {
  initTheme();
  renderHeroSlider();
  renderLeagueImages();
  initLeagueSlider();
  renderCatalogFromDatabase();
}

document.addEventListener("DOMContentLoaded", initStorefront);