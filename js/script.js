const THEME_KEY = "fcstoreua_theme";

const heroSlider = document.getElementById("heroSlider");
const themeToggle = document.getElementById("themeToggle");

const leagueImagePremierLeague = document.getElementById("leagueImagePremierLeague");
const leagueImageLaLiga = document.getElementById("leagueImageLaLiga");
const leagueImageSerieA = document.getElementById("leagueImageSerieA");
const leagueImageBundesliga = document.getElementById("leagueImageBundesliga");
const leagueImageLigue1 = document.getElementById("leagueImageLigue1");

let heroIntervalId = null;

const HERO_SLIDES = [
  "images/hero/hero-1.png",
  "images/hero/hero-2.png",
  "images/hero/hero-3.png"
];

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

/* theme */

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
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

/* hero */

function renderHeroSlider() {
  if (!heroSlider) return;

  if (heroIntervalId) {
    clearInterval(heroIntervalId);
    heroIntervalId = null;
  }

  const slides = HERO_SLIDES.filter(Boolean);

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
  }, 3500);
}

/* league images */

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

/* league slider */

function initLeagueSlider() {
  const slider = document.getElementById("leagueSlider");
  const left = document.getElementById("leagueLeft");
  const right = document.getElementById("leagueRight");

  if (!slider) return;

  const cardWidth = 298;

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

function initCatalog() {
  const catalogLinks = document.querySelectorAll(".catalog-side-link");
  const catalogPanels = document.querySelectorAll(".catalog-panel");

  if (!catalogLinks.length || !catalogPanels.length) return;

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

function initStorefront() {
  initTheme();
  initCatalog();
  renderHeroSlider();
  renderLeagueImages();
  initLeagueSlider();
}

document.addEventListener("DOMContentLoaded", initStorefront);