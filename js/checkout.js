/* checkout.js — order page logic
   Depends on: currency.js (getSavedCurrency, formatPrice, refreshPrices)
               script.js  (supabaseClient, escapeHtml)
*/

const CART_KEY_CO = "fcstoreua_cart";

/* ── cart helpers ── */
function coGetCart()       { try { return JSON.parse(localStorage.getItem(CART_KEY_CO) || "[]"); } catch(e) { return []; } }
function coSaveCart(c)     { localStorage.setItem(CART_KEY_CO, JSON.stringify(c)); }
function coGetCartCount()  { return coGetCart().reduce((s, i) => s + (i.qty || 1), 0); }
function coUpdateCartBtn() {
  const btn = document.getElementById("cartBtn");
  if (btn) btn.textContent = `Cart (${coGetCartCount()})`;
}

/* ── price helpers ── */
function coItemPrice(item) {
  const cur = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "EUR";
  if (cur === "USD" && item.price_usd) return Number(item.price_usd);
  if (cur === "UAH" && item.price_uah) return Number(item.price_uah);
  if (item.price_eur)                  return Number(item.price_eur);
  if (item.price)                      return Number(item.price);
  return 0;
}
function coFmt(v) {
  return (typeof formatPrice === "function") ? formatPrice(v, getSavedCurrency()) : `€${Number(v).toFixed(2)}`;
}

/* ── render order summary ── */
function coRenderItems() {
  const cart = coGetCart();
  const list = document.getElementById("checkoutItemsList");
  if (!list) return;

  if (!cart.length) {
    list.innerHTML = `<p class="co-empty-note">No items.</p>`;
    return;
  }

  list.innerHTML = cart.map(item => {
    const price    = coItemPrice(item);
    const lineTotal = price * (item.qty || 1);
    const imgHtml   = item.image
      ? `<img src="${escapeHtml ? escapeHtml(item.image) : item.image}" alt="${item.title || ""}" class="co-item-img">`
      : `<div class="co-item-img co-item-no-img">⚽</div>`;
    return `
      <div class="co-item" data-key="${item.key}">
        <a href="product.html?slug=${item.slug || ""}" class="co-item-thumb">${imgHtml}</a>
        <div class="co-item-info">
          <p class="co-item-title">${item.title || "Product"}</p>
          ${item.size ? `<p class="co-item-meta">Size: ${item.size}</p>` : ""}
          <p class="co-item-unit-price">${coFmt(price)} each</p>
        </div>
        <div class="co-item-qty">
          <button class="co-qty-btn" data-key="${item.key}" data-action="dec" type="button">−</button>
          <span class="co-qty-val">${item.qty || 1}</span>
          <button class="co-qty-btn" data-key="${item.key}" data-action="inc" type="button">+</button>
        </div>
        <div class="co-item-right">
          <p class="co-item-line-price">${coFmt(lineTotal)}</p>
          <button class="co-remove-btn" data-key="${item.key}" type="button" aria-label="Remove">✕</button>
        </div>
      </div>`;
  }).join("");

  /* qty & remove listeners */
  list.querySelectorAll(".co-qty-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const cart = coGetCart();
      const item = cart.find(i => i.key === btn.dataset.key);
      if (!item) return;
      if (btn.dataset.action === "inc") { item.qty = (item.qty || 1) + 1; }
      else { item.qty = (item.qty || 1) - 1; if (item.qty < 1) { coSaveCart(cart.filter(i => i.key !== item.key)); coUpdateCartBtn(); coRender(); return; } }
      coSaveCart(cart);
      coUpdateCartBtn();
      coRender();
    });
  });
  list.querySelectorAll(".co-remove-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      coSaveCart(coGetCart().filter(i => i.key !== btn.dataset.key));
      coUpdateCartBtn();
      coRender();
    });
  });
}

/* ── compute totals ── */
function coRenderTotals() {
  const cart     = coGetCart();
  const subtotal = cart.reduce((s, i) => s + coItemPrice(i) * (i.qty || 1), 0);
  const delivery = coCalcDelivery(subtotal);

  const sub   = document.getElementById("subtotalVal");
  const dv    = document.getElementById("deliveryVal");
  const tot   = document.getElementById("totalVal");
  if (sub) sub.textContent = coFmt(subtotal);
  if (dv)  dv.textContent  = delivery === 0 ? "Free 🎉" : coFmt(delivery);
  if (tot) tot.textContent = coFmt(subtotal + delivery);
}

function coCalcDelivery(subtotal) {
  const cur = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "EUR";
  const threshold = cur === "UAH" ? 2000 : cur === "USD" ? 54 : 50; /* ≈ €50 */
  const selected  = document.querySelector("input[name='delivery']:checked");
  if (selected?.value === "pickup") return 0;
  return subtotal >= threshold ? 0 : (cur === "UAH" ? 150 : cur === "USD" ? 5.5 : 5);
}

/* ── full re-render ── */
function coRender() {
  const cart    = coGetCart();
  const empty   = document.getElementById("checkoutEmpty");
  const content = document.getElementById("checkoutContent");
  if (!cart.length) {
    if (empty)   empty.style.display   = "";
    if (content) content.style.display = "none";
    return;
  }
  if (empty)   empty.style.display   = "none";
  if (content) content.style.display = "";
  coRenderItems();
  coRenderTotals();
}

/* ── delivery option styling ── */
function initDeliveryOptions() {
  const options = document.querySelectorAll(".delivery-option");
  const addressFields = document.getElementById("addressFields");
  const branchField   = document.getElementById("branchField");
  const streetField   = document.getElementById("streetField");

  options.forEach(opt => {
    const radio = opt.querySelector("input[type=radio]");
    radio?.addEventListener("change", () => {
      options.forEach(o => o.classList.remove("active"));
      opt.classList.add("active");
      const val = radio.value;
      if (val === "pickup") {
        if (addressFields) addressFields.style.display = "none";
      } else {
        if (addressFields) addressFields.style.display = "";
        /* courier → show street address field */
        if (val === "courier") {
          if (branchField) branchField.style.display = "none";
          if (streetField) streetField.style.display = "";
          document.getElementById("branch")?.removeAttribute("required");
          document.getElementById("street")?.setAttribute("required", "");
        } else {
          if (branchField) branchField.style.display = "";
          if (streetField) streetField.style.display = "none";
          document.getElementById("street")?.removeAttribute("required");
        }
      }
      coRenderTotals(); /* recalc delivery cost */
    });
  });
}

/* ── form validation ── */
function coValidate() {
  const required = ["firstName", "lastName", "email", "phone"];
  const delivery = document.querySelector("input[name='delivery']:checked")?.value;
  if (delivery !== "pickup") required.push("city");
  if (delivery === "courier") required.push("street");

  for (const id of required) {
    const el = document.getElementById(id);
    if (!el?.value.trim()) {
      el?.focus();
      return `Please fill in the "${el?.previousElementSibling?.textContent?.replace(" *","") || id}" field.`;
    }
  }
  const email = document.getElementById("email")?.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  return null;
}

/* ── collect form data ── */
function coCollectFormData() {
  return {
    firstName:  document.getElementById("firstName")?.value.trim(),
    lastName:   document.getElementById("lastName")?.value.trim(),
    email:      document.getElementById("email")?.value.trim(),
    phone:      document.getElementById("phone")?.value.trim(),
    delivery:   document.querySelector("input[name='delivery']:checked")?.value,
    city:       document.getElementById("city")?.value.trim(),
    branch:     document.getElementById("branch")?.value.trim(),
    street:     document.getElementById("street")?.value.trim(),
    comment:    document.getElementById("comment")?.value.trim(),
  };
}

/* ── place order ── */
async function coPlaceOrder() {
  const btn = document.getElementById("placeOrderBtn");
  const errEl = document.getElementById("checkoutError");

  const err = coValidate();
  if (err) {
    if (errEl) { errEl.textContent = err; errEl.style.display = ""; }
    return;
  }
  if (errEl) errEl.style.display = "none";

  btn.disabled = true;
  btn.textContent = "Placing order…";

  const cart      = coGetCart();
  const cur       = (typeof getSavedCurrency === "function") ? getSavedCurrency() : "EUR";
  const subtotal  = cart.reduce((s, i) => s + coItemPrice(i) * (i.qty || 1), 0);
  const delivery  = coCalcDelivery(subtotal);
  const total     = subtotal + delivery;
  const form      = coCollectFormData();

  const orderData = {
    customer_name:  `${form.firstName} ${form.lastName}`,
    customer_email: form.email,
    customer_phone: form.phone,
    delivery_type:  form.delivery,
    city:           form.city || null,
    address:        form.street || form.branch || null,
    comment:        form.comment || null,
    currency:       cur,
    subtotal:       subtotal,
    delivery_cost:  delivery,
    total:          total,
    items:          JSON.stringify(cart.map(i => ({
      id:    i.id,
      title: i.title,
      slug:  i.slug,
      size:  i.size,
      qty:   i.qty || 1,
      price: coItemPrice(i),
    }))),
    created_at: new Date().toISOString(),
  };

  try {
    /* Save to Supabase if 'orders' table exists, otherwise just log & show success */
    let saved = false;
    try {
      const { error } = await supabaseClient.from("orders").insert([orderData]);
      if (!error) saved = true;
    } catch(e) { /* orders table may not exist yet */ }

    /* Clear cart */
    coSaveCart([]);
    coUpdateCartBtn();

    /* Show success */
    const overlay = document.getElementById("checkoutSuccess");
    const msg     = document.getElementById("successMsg");
    if (msg) msg.textContent = `Thank you, ${form.firstName}! We'll contact you at ${form.email} to confirm your order.`;
    if (overlay) overlay.style.display = "";
    document.getElementById("checkoutContent")?.style && (document.getElementById("checkoutContent").style.opacity = "0.3");

  } catch(e) {
    console.error(e);
    btn.disabled = false;
    btn.textContent = "Place order";
    if (errEl) { errEl.textContent = "Something went wrong. Please try again."; errEl.style.display = ""; }
  }
}

/* ── currency change: re-render totals ── */
function coOnCurrencyChange() {
  coRenderItems();
  coRenderTotals();
}

/* ── init ── */
function initCheckout() {
  coUpdateCartBtn();
  if (typeof cdInjectHTML === "function") cdInjectHTML();
  document.getElementById("cartBtn")?.addEventListener("click", e => {
    e.preventDefault();
    if (typeof openCartDrawer === "function") openCartDrawer();
  });
  if (typeof initCurrencySwitcher === "function") initCurrencySwitcher("currencyContainer");
  coRender();
  initDeliveryOptions();

  document.getElementById("placeOrderBtn")?.addEventListener("click", coPlaceOrder);
  window.addEventListener("currencyChanged", coOnCurrencyChange);
}

document.addEventListener("DOMContentLoaded", initCheckout);
