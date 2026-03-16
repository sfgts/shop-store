const HERO_KEY = "fcstoreua_hero";
const COLLECTIONS_KEY = "fcstoreua_collections";
const PRODUCTS_KEY = "fcstoreua_products";

const heroForm = document.getElementById("heroForm");
const collectionsForm = document.getElementById("collectionsForm");
const productForm = document.getElementById("productForm");
const productsList = document.getElementById("productsList");

let editProductId = null;

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

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to write ${key}:`, error);
    alert("Could not save data. Check browser storage limit or invalid data.");
    return false;
  }
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) return "—";
  return `€${Number(value).toFixed(2)}`;
}

function getCategoryLabel(category) {
  const map = {
    home: "Home Kit",
    away: "Away Kit",
    third: "Third Kit",
    retro: "Retro"
  };
  return map[category] || category || "No category";
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

/* =========================
   Hero
========================= */

function getHeroData() {
  return readStorage(HERO_KEY, {
    slides: []
  });
}

function loadHeroForm() {
  const hero = getHeroData();
  const slides = hero.slides || [];

  document.getElementById("heroImage1").value = slides[0] || "";
  document.getElementById("heroImage2").value = slides[1] || "";
  document.getElementById("heroImage3").value = slides[2] || "";
  document.getElementById("heroImage4").value = slides[3] || "";
}

heroForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const slides = [
    document.getElementById("heroImage1").value.trim(),
    document.getElementById("heroImage2").value.trim(),
    document.getElementById("heroImage3").value.trim(),
    document.getElementById("heroImage4").value.trim()
  ].filter(Boolean);

  const ok = writeStorage(HERO_KEY, { slides });
  if (ok) {
    alert("Hero slider saved.");
  }
});

/* =========================
   Collections
========================= */

function getCollectionsData() {
  return readStorage(COLLECTIONS_KEY, {
    home: "",
    away: "",
    third: "",
    retro: ""
  });
}

function loadCollectionsForm() {
  const collections = getCollectionsData();

  document.getElementById("collectionHome").value = collections.home || "";
  document.getElementById("collectionAway").value = collections.away || "";
  document.getElementById("collectionThird").value = collections.third || "";
  document.getElementById("collectionRetro").value = collections.retro || "";
}

collectionsForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    home: document.getElementById("collectionHome").value.trim(),
    away: document.getElementById("collectionAway").value.trim(),
    third: document.getElementById("collectionThird").value.trim(),
    retro: document.getElementById("collectionRetro").value.trim()
  };

  const ok = writeStorage(COLLECTIONS_KEY, data);
  if (ok) {
    alert("Collection images saved.");
  }
});

/* =========================
   Products
========================= */

function getProducts() {
  return readStorage(PRODUCTS_KEY, []);
}

function saveProducts(products) {
  return writeStorage(PRODUCTS_KEY, products);
}

function clearProductForm() {
  productForm.reset();
  document.getElementById("inStock").checked = true;
  editProductId = null;

  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.textContent = "Save product";
}

function fillProductForm(product) {
  document.getElementById("title").value = product.title || "";
  document.getElementById("price").value = product.price || "";
  document.getElementById("oldPrice").value = product.oldPrice || "";
  document.getElementById("category").value = product.category || "";
  document.getElementById("badge").value = product.badge || "";
  document.getElementById("description").value = product.description || "";
  document.getElementById("image").value = product.image || "";
  document.getElementById("featured").checked = !!product.featured;
  document.getElementById("inStock").checked = !!product.inStock;

  editProductId = product.id;

  const submitBtn = productForm.querySelector('button[type="submit"]');
  submitBtn.textContent = "Update product";

  window.scrollTo({
    top: document.getElementById("productsPanel").offsetTop - 20,
    behavior: "smooth"
  });
}

function renderProducts() {
  const products = getProducts();

  if (!products.length) {
    productsList.innerHTML = `
      <div class="empty-state">No products added yet.</div>
    `;
    return;
  }

  productsList.innerHTML = products
    .map((product) => {
      return `
        <div class="product-item">
          <div class="product-info">
            <div class="product-title">${escapeHtml(product.title)}</div>
            <div class="product-price">
              ${formatPrice(product.price)}
              ${product.oldPrice ? ` / <s>${formatPrice(product.oldPrice)}</s>` : ""}
            </div>
            <div class="product-price">
              ${escapeHtml(getCategoryLabel(product.category))}
              ${product.badge ? ` • ${escapeHtml(product.badge)}` : ""}
              ${product.featured ? " • featured" : ""}
              ${product.inStock ? " • in stock" : " • out of stock"}
            </div>
            <div class="product-price">
              ${product.image ? escapeHtml(product.image) : "No image path"}
            </div>
          </div>

          <div class="product-actions">
            <button class="edit-btn" data-id="${product.id}">Edit</button>
            <button class="delete-btn" data-id="${product.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");

  bindProductActions();
}

function bindProductActions() {
  const editButtons = document.querySelectorAll(".edit-btn");
  const deleteButtons = document.querySelectorAll(".delete-btn");

  editButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const products = getProducts();
      const product = products.find((item) => item.id === id);

      if (!product) return;
      fillProductForm(product);
    });
  });

  deleteButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const products = getProducts().filter((item) => item.id !== id);

      const ok = saveProducts(products);
      if (!ok) return;

      if (editProductId === id) {
        clearProductForm();
      }

      renderProducts();
    });
  });
}

productForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const price = document.getElementById("price").value;
  const oldPrice = document.getElementById("oldPrice").value;
  const category = document.getElementById("category").value;
  const badge = document.getElementById("badge").value;
  const description = document.getElementById("description").value.trim();
  const image = document.getElementById("image").value.trim();
  const featured = document.getElementById("featured").checked;
  const inStock = document.getElementById("inStock").checked;

  if (!title || !price || !category) {
    alert("Please fill title, price and category.");
    return;
  }

  const products = getProducts();

  if (editProductId) {
    const updatedProducts = products.map((product) => {
      if (product.id === editProductId) {
        return {
          ...product,
          title,
          price: Number(price),
          oldPrice: oldPrice ? Number(oldPrice) : "",
          category,
          badge,
          description,
          image,
          featured,
          inStock
        };
      }
      return product;
    });

    const ok = saveProducts(updatedProducts);
    if (!ok) return;
  } else {
    const newProduct = {
      id: Date.now(),
      title,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : "",
      category,
      badge,
      description,
      image,
      featured,
      inStock,
      createdAt: new Date().toISOString()
    };

    products.unshift(newProduct);

    const ok = saveProducts(products);
    if (!ok) return;
  }

  clearProductForm();
  renderProducts();
});

productForm?.addEventListener("reset", () => {
  setTimeout(() => {
    clearProductForm();
  }, 0);
});

/* =========================
   Init
========================= */

function initAdmin() {
  loadHeroForm();
  loadCollectionsForm();
  renderProducts();
}

initAdmin();