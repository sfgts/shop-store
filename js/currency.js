/* currency.js — dropdown currency switcher */

/* ── Set to true to show the currency switcher in the header ── */
const CURRENCY_SWITCHER_VISIBLE = false;

const CURRENCIES = {
  EUR: { symbol: "€", label: "EUR — Euro" },
  USD: { symbol: "$", label: "USD — Dollar" },
  UAH: { symbol: "₴", label: "UAH — Hryvnia" },
};

/* Exchange rates relative to EUR (fallback when per-currency prices not set) */
const CURRENCY_RATES = { EUR: 1, USD: 1.08, UAH: 44.5 };

const CURRENCY_KEY = "fcstoreua_currency";

function getSavedCurrency() {
  if (!CURRENCY_SWITCHER_VISIBLE) return "UAH";
  const s = localStorage.getItem(CURRENCY_KEY);
  return CURRENCIES[s] ? s : "UAH";
}
function saveCurrency(code) { localStorage.setItem(CURRENCY_KEY, code); }

function formatPrice(value, currencyCode) {
  if (value == null || value === "" || value == 0) return "—";
  const code = currencyCode || getSavedCurrency();
  const cur  = CURRENCIES[code] || CURRENCIES.EUR;
  return `${cur.symbol}${Number(value).toFixed(2)}`;
}

/* Refresh all price elements on page.
   Supports two data-attribute formats:
   1. data-price-eur / data-price-usd / data-price-uah  (preferred, per-field)
   2. data-eur-price  (legacy, auto-converts via rates)
*/
function refreshPrices() {
  const code = getSavedCurrency();
  const rate = CURRENCY_RATES[code] || 1;
  const sym  = CURRENCIES[code].symbol;

  /* Format 1: per-currency fields */
  document.querySelectorAll("[data-price-eur]").forEach(el => {
    const val = code === "USD" ? el.dataset.priceUsd :
                code === "UAH" ? el.dataset.priceUah :
                el.dataset.priceEur;
    /* fallback: convert from EUR */
    const eur = el.dataset.priceEur;
    const display = (val && val !== "") ? val : (eur ? Number(eur) * rate : null);
    if (display != null && display !== "") el.textContent = formatPrice(display, code);
  });

  document.querySelectorAll("[data-old-price-eur]").forEach(el => {
    const val = code === "USD" ? el.dataset.oldPriceUsd :
                code === "UAH" ? el.dataset.oldPriceUah :
                el.dataset.oldPriceEur;
    const eur = el.dataset.oldPriceEur;
    const display = (val && val !== "") ? val : (eur ? Number(eur) * rate : null);
    if (display != null && display !== "") {
      el.textContent = formatPrice(display, code);
      el.style.display = "";
    } else {
      el.style.display = "none";
    }
  });

  /* Format 2: legacy data-eur-price (auto-convert) */
  document.querySelectorAll("[data-eur-price]:not([data-price-eur])").forEach(el => {
    const eur = Number(el.dataset.eurPrice);
    if (!eur) return;
    el.textContent = `${sym}${(eur * rate).toFixed(2)}`;
  });
}

/* Build dropdown */
function buildCurrencyWidget() {
  const current = getSavedCurrency();
  const cur = CURRENCIES[current];
  return `
    <div class="currency-dropdown" id="currencyDropdown">
      <button type="button" class="currency-trigger" id="currencyTrigger">
        <span class="currency-symbol">${cur.symbol}</span>
        <span class="currency-code">${current}</span>
        <span class="currency-arrow">▾</span>
      </button>
      <div class="currency-menu" id="currencyMenu">
        ${Object.entries(CURRENCIES).map(([code, c]) => `
          <button type="button"
            class="currency-option${code === current ? " active" : ""}"
            data-currency="${code}">
            <span class="currency-option-symbol">${c.symbol}</span>
            <span>${c.label}</span>
          </button>`).join("")}
      </div>
    </div>`;
}

function initCurrencySwitcher(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  /* Switcher hidden — just init default currency and refresh prices silently */
  if (!CURRENCY_SWITCHER_VISIBLE) {
    container.style.display = "none";
    saveCurrency("UAH");
    refreshPrices();
    return;
  }

  container.innerHTML = buildCurrencyWidget();

  const trigger = document.getElementById("currencyTrigger");
  const menu    = document.getElementById("currencyMenu");

  trigger?.addEventListener("click", e => { e.stopPropagation(); menu?.classList.toggle("open"); });
  document.addEventListener("click", () => menu?.classList.remove("open"));

  container.querySelectorAll(".currency-option").forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.currency;
      saveCurrency(code);
      const cur = CURRENCIES[code];
      const sym = trigger?.querySelector(".currency-symbol");
      const cod = trigger?.querySelector(".currency-code");
      if (sym) sym.textContent = cur.symbol;
      if (cod) cod.textContent = code;
      container.querySelectorAll(".currency-option").forEach(b =>
        b.classList.toggle("active", b.dataset.currency === code));
      menu?.classList.remove("open");
      refreshPrices();
      window.dispatchEvent(new CustomEvent("currencyChanged", { detail: code }));
    });
  });
}
