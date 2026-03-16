console.log("admin.js loaded");

/* =========================
   Supabase
========================= */

const SUPABASE_URL = "https://puoaaphhdozbhqtdaejw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_nPQPfB6BPwVDVyD01u0gZQ_-FTbOOF-";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

console.log("supabase client ready", supabaseClient);

/* =========================
   Local storage keys
========================= */

const HERO_KEY = "fcstoreua_hero";
const COLLECTIONS_KEY = "fcstoreua_collections";
const PRODUCTS_KEY = "fcstoreua_products";

/* =========================
   Main existing admin DOM
========================= */

const heroForm = document.getElementById("heroForm");
const collectionsForm = document.getElementById("collectionsForm");
const productForm = document.getElementById("productForm");
const productsList = document.getElementById("productsList");

let editProductId = null;

/* =========================
   Catalog DOM
========================= */

const catalogSectionForm = document.getElementById("catalogSectionForm");
const catalogColumnForm = document.getElementById("catalogColumnForm");
const catalogLinkForm = document.getElementById("catalogLinkForm");

const sectionNameInput = document.getElementById("sectionName");
const sectionSlugInput = document.getElementById("sectionSlug");
const sectionOrderInput = document.getElementById("sectionOrder");
const sectionActiveInput = document.getElementById("sectionActive");

const columnSectionSelect = document.getElementById("columnSection");
const columnTitleInput = document.getElementById("columnTitle");
const columnOrderInput = document.getElementById("columnOrder");

const linkColumnSelect = document.getElementById("linkColumn");
const linkLabelInput = document.getElementById("linkLabel");
const linkUrlInput = document.getElementById("linkUrl");
const linkOrderInput = document.getElementById("linkOrder");
const linkActiveInput = document.getElementById("linkActive");

const catalogSectionsList = document.getElementById("catalogSectionsList");
const catalogColumnsList = document.getElementById("catalogColumnsList");
const catalogLinksList = document.getElementById("catalogLinksList");

/* =========================
   Catalog state
========================= */

let sectionsState = [];
let columnsState = [];
let linksState = [];

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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function showError(error, fallback = "Something went wrong.") {
  console.error(error);
  alert(error?.message || fallback);
}

function sectionNameById(sectionId) {
  const match = sectionsState.find((item) => Number(item.id) === Number(sectionId));
  return match ? match.name : `Section #${sectionId}`;
}

function columnTitleById(columnId) {
  const match = columnsState.find((item) => Number(item.id) === Number(columnId));
  return match ? match.title : `Column #${columnId}`;
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

  const heroImage1 = document.getElementById("heroImage1");
  const heroImage2 = document.getElementById("heroImage2");
  const heroImage3 = document.getElementById("heroImage3");
  const heroImage4 = document.getElementById("heroImage4");

  if (heroImage1) heroImage1.value = slides[0] || "";
  if (heroImage2) heroImage2.value = slides[1] || "";
  if (heroImage3) heroImage3.value = slides[2] || "";
  if (heroImage4) heroImage4.value = slides[3] || "";
}

heroForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const slides = [
    document.getElementById("heroImage1")?.value.trim(),
    document.getElementById("heroImage2")?.value.trim(),
    document.getElementById("heroImage3")?.value.trim(),
    document.getElementById("heroImage4")?.value.trim()
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

  const collectionHome = document.getElementById("collectionHome");
  const collectionAway = document.getElementById("collectionAway");
  const collectionThird = document.getElementById("collectionThird");
  const collectionRetro = document.getElementById("collectionRetro");

  if (collectionHome) collectionHome.value = collections.home || "";
  if (collectionAway) collectionAway.value = collections.away || "";
  if (collectionThird) collectionThird.value = collections.third || "";
  if (collectionRetro) collectionRetro.value = collections.retro || "";
}

collectionsForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    home: document.getElementById("collectionHome")?.value.trim() || "",
    away: document.getElementById("collectionAway")?.value.trim() || "",
    third: document.getElementById("collectionThird")?.value.trim() || "",
    retro: document.getElementById("collectionRetro")?.value.trim() || ""
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
  if (!productForm) return;

  productForm.reset();

  const inStockInput = document.getElementById("inStock");
  if (inStockInput) inStockInput.checked = true;

  editProductId = null;

  const submitBtn = productForm.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = "Save product";
}

function fillProductForm(product) {
  const title = document.getElementById("title");
  const price = document.getElementById("price");
  const oldPrice = document.getElementById("oldPrice");
  const category = document.getElementById("category");
  const badge = document.getElementById("badge");
  const description = document.getElementById("description");
  const image = document.getElementById("image");
  const featured = document.getElementById("featured");
  const inStock = document.getElementById("inStock");

  if (title) title.value = product.title || "";
  if (price) price.value = product.price || "";
  if (oldPrice) oldPrice.value = product.oldPrice || "";
  if (category) category.value = product.category || "";
  if (badge) badge.value = product.badge || "";
  if (description) description.value = product.description || "";
  if (image) image.value = product.image || "";
  if (featured) featured.checked = !!product.featured;
  if (inStock) inStock.checked = !!product.inStock;

  editProductId = product.id;

  const submitBtn = productForm?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.textContent = "Update product";

  const productsPanel = document.getElementById("productsPanel");
  if (productsPanel) {
    window.scrollTo({
      top: productsPanel.offsetTop - 20,
      behavior: "smooth"
    });
  }
}

function renderProducts() {
  if (!productsList) return;

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

  const title = document.getElementById("title")?.value.trim() || "";
  const price = document.getElementById("price")?.value || "";
  const oldPrice = document.getElementById("oldPrice")?.value || "";
  const category = document.getElementById("category")?.value || "";
  const badge = document.getElementById("badge")?.value || "";
  const description = document.getElementById("description")?.value.trim() || "";
  const image = document.getElementById("image")?.value.trim() || "";
  const featured = document.getElementById("featured")?.checked || false;
  const inStock = document.getElementById("inStock")?.checked || false;

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
   Catalog load data
========================= */

async function loadSections() {
  const { data, error } = await supabaseClient
    .from("catalog_sections")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  sectionsState = data || [];
  renderSections();
  renderSectionOptions();
}

async function loadColumns() {
  const { data, error } = await supabaseClient
    .from("catalog_columns")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  columnsState = data || [];
  renderColumns();
  renderColumnOptions();
}

async function loadLinks() {
  const { data, error } = await supabaseClient
    .from("catalog_links")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;

  linksState = data || [];
  renderLinks();
}

async function refreshCatalogData() {
  await loadSections();
  await loadColumns();
  await loadLinks();
}

/* =========================
   Catalog render
========================= */

function renderSections() {
  if (!catalogSectionsList) return;

  if (!sectionsState.length) {
    catalogSectionsList.innerHTML = `<div class="empty-state">No catalog sections added yet.</div>`;
    return;
  }

  catalogSectionsList.innerHTML = sectionsState
    .map((section) => {
      return `
        <div class="catalog-entity-item">
          <div class="catalog-entity-info">
            <div class="catalog-entity-title">${escapeHtml(section.name)}</div>
            <div class="catalog-entity-meta">
              slug: ${escapeHtml(section.slug)}<br>
              order: ${escapeHtml(section.sort_order)} · active: ${section.is_active ? "yes" : "no"}
            </div>
          </div>

          <div class="catalog-entity-actions">
            <button class="delete-btn" type="button" data-delete-section="${section.id}">
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderColumns() {
  if (!catalogColumnsList) return;

  if (!columnsState.length) {
    catalogColumnsList.innerHTML = `<div class="empty-state">No columns added yet.</div>`;
    return;
  }

  catalogColumnsList.innerHTML = columnsState
    .map((column) => {
      return `
        <div class="catalog-entity-item">
          <div class="catalog-entity-info">
            <div class="catalog-entity-title">${escapeHtml(column.title)}</div>
            <div class="catalog-entity-meta">
              section: ${escapeHtml(sectionNameById(column.section_id))}<br>
              order: ${escapeHtml(column.sort_order)}
            </div>
          </div>

          <div class="catalog-entity-actions">
            <button class="delete-btn" type="button" data-delete-column="${column.id}">
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderLinks() {
  if (!catalogLinksList) return;

  if (!linksState.length) {
    catalogLinksList.innerHTML = `<div class="empty-state">No links added yet.</div>`;
    return;
  }

  catalogLinksList.innerHTML = linksState
    .map((link) => {
      return `
        <div class="catalog-entity-item">
          <div class="catalog-entity-info">
            <div class="catalog-entity-title">${escapeHtml(link.label)}</div>
            <div class="catalog-entity-meta">
              column: ${escapeHtml(columnTitleById(link.column_id))}<br>
              url: ${escapeHtml(link.url)}<br>
              order: ${escapeHtml(link.sort_order)} · active: ${link.is_active ? "yes" : "no"}
            </div>
          </div>

          <div class="catalog-entity-actions">
            <button class="delete-btn" type="button" data-delete-link="${link.id}">
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderSectionOptions() {
  if (!columnSectionSelect) return;

  const currentValue = columnSectionSelect.value;

  columnSectionSelect.innerHTML = `
    <option value="">Select section</option>
    ${sectionsState
      .map((section) => `<option value="${section.id}">${escapeHtml(section.name)}</option>`)
      .join("")}
  `;

  if (sectionsState.some((item) => String(item.id) === currentValue)) {
    columnSectionSelect.value = currentValue;
  }
}

function renderColumnOptions() {
  if (!linkColumnSelect) return;

  const currentValue = linkColumnSelect.value;

  linkColumnSelect.innerHTML = `
    <option value="">Select column</option>
    ${columnsState
      .map((column) => {
        return `<option value="${column.id}">${escapeHtml(sectionNameById(column.section_id))} → ${escapeHtml(column.title)}</option>`;
      })
      .join("")}
  `;

  if (columnsState.some((item) => String(item.id) === currentValue)) {
    linkColumnSelect.value = currentValue;
  }
}

/* =========================
   Catalog create
========================= */

async function handleCreateSection(event) {
  event.preventDefault();

  const name = sectionNameInput?.value.trim() || "";
  const slug = (sectionSlugInput?.value.trim() || slugify(name));
  const sortOrder = Number(sectionOrderInput?.value || 0);
  const isActive = !!sectionActiveInput?.checked;

  if (!name) {
    alert("Section name is required.");
    return;
  }

  if (!slug) {
    alert("Slug is required.");
    return;
  }

  const { error } = await supabaseClient
    .from("catalog_sections")
    .insert({
      name,
      slug,
      sort_order: sortOrder,
      is_active: isActive
    });

  if (error) throw error;

  catalogSectionForm.reset();
  if (sectionActiveInput) sectionActiveInput.checked = true;
  await refreshCatalogData();
}

async function handleCreateColumn(event) {
  event.preventDefault();

  const sectionId = Number(columnSectionSelect?.value || 0);
  const title = columnTitleInput?.value.trim() || "";
  const sortOrder = Number(columnOrderInput?.value || 0);

  if (!sectionId) {
    alert("Select parent section.");
    return;
  }

  if (!title) {
    alert("Column title is required.");
    return;
  }

  const { error } = await supabaseClient
    .from("catalog_columns")
    .insert({
      section_id: sectionId,
      title,
      sort_order: sortOrder
    });

  if (error) throw error;

  catalogColumnForm.reset();
  await refreshCatalogData();
}

async function handleCreateLink(event) {
  event.preventDefault();

  const columnId = Number(linkColumnSelect?.value || 0);
  const label = linkLabelInput?.value.trim() || "";
  const url = linkUrlInput?.value.trim() || "";
  const sortOrder = Number(linkOrderInput?.value || 0);
  const isActive = !!linkActiveInput?.checked;

  if (!columnId) {
    alert("Select parent column.");
    return;
  }

  if (!label) {
    alert("Link label is required.");
    return;
  }

  if (!url) {
    alert("URL is required.");
    return;
  }

  const { error } = await supabaseClient
    .from("catalog_links")
    .insert({
      column_id: columnId,
      label,
      url,
      sort_order: sortOrder,
      is_active: isActive
    });

  if (error) throw error;

  catalogLinkForm.reset();
  if (linkActiveInput) linkActiveInput.checked = true;
  await refreshCatalogData();
}

/* =========================
   Catalog delete
========================= */

async function handleDeleteSection(sectionId) {
  const confirmed = window.confirm("Delete this section? All related columns and links will also be removed.");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("catalog_sections")
    .delete()
    .eq("id", sectionId);

  if (error) throw error;

  await refreshCatalogData();
}

async function handleDeleteColumn(columnId) {
  const confirmed = window.confirm("Delete this column? All related links will also be removed.");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("catalog_columns")
    .delete()
    .eq("id", columnId);

  if (error) throw error;

  await refreshCatalogData();
}

async function handleDeleteLink(linkId) {
  const confirmed = window.confirm("Delete this link?");
  if (!confirmed) return;

  const { error } = await supabaseClient
    .from("catalog_links")
    .delete()
    .eq("id", linkId);

  if (error) throw error;

  await refreshCatalogData();
}

function initDeleteDelegation() {
  if (catalogSectionsList) {
    catalogSectionsList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-section]");
      if (!button) return;

      try {
        await handleDeleteSection(Number(button.dataset.deleteSection));
      } catch (error) {
        showError(error, "Failed to delete section.");
      }
    });
  }

  if (catalogColumnsList) {
    catalogColumnsList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-column]");
      if (!button) return;

      try {
        await handleDeleteColumn(Number(button.dataset.deleteColumn));
      } catch (error) {
        showError(error, "Failed to delete column.");
      }
    });
  }

  if (catalogLinksList) {
    catalogLinksList.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-delete-link]");
      if (!button) return;

      try {
        await handleDeleteLink(Number(button.dataset.deleteLink));
      } catch (error) {
        showError(error, "Failed to delete link.");
      }
    });
  }
}

/* =========================
   Catalog form init
========================= */

function initSectionForm() {
  if (!catalogSectionForm) return;

  sectionNameInput?.addEventListener("input", () => {
    if (!sectionSlugInput) return;

    if (!sectionSlugInput.dataset.touched) {
      sectionSlugInput.value = slugify(sectionNameInput.value);
    }
  });

  sectionSlugInput?.addEventListener("input", () => {
    sectionSlugInput.dataset.touched = "true";
  });

  catalogSectionForm.addEventListener("submit", async (event) => {
    try {
      await handleCreateSection(event);
      if (sectionSlugInput) delete sectionSlugInput.dataset.touched;
    } catch (error) {
      showError(error, "Failed to save section.");
    }
  });

  catalogSectionForm.addEventListener("reset", () => {
    setTimeout(() => {
      if (sectionActiveInput) sectionActiveInput.checked = true;
      if (sectionSlugInput) delete sectionSlugInput.dataset.touched;
    }, 0);
  });
}

function initColumnForm() {
  if (!catalogColumnForm) return;

  catalogColumnForm.addEventListener("submit", async (event) => {
    try {
      await handleCreateColumn(event);
    } catch (error) {
      showError(error, "Failed to save column.");
    }
  });
}

function initLinkForm() {
  if (!catalogLinkForm) return;

  catalogLinkForm.addEventListener("submit", async (event) => {
    try {
      await handleCreateLink(event);
    } catch (error) {
      showError(error, "Failed to save link.");
    }
  });

  catalogLinkForm.addEventListener("reset", () => {
    setTimeout(() => {
      if (linkActiveInput) linkActiveInput.checked = true;
    }, 0);
  });
}

/* =========================
   Init
========================= */

async function initCatalogAdmin() {
  initSectionForm();
  initColumnForm();
  initLinkForm();
  initDeleteDelegation();
  await refreshCatalogData();
}

function initAdmin() {
  loadHeroForm();
  loadCollectionsForm();
  renderProducts();
}

document.addEventListener("DOMContentLoaded", async () => {
  initAdmin();

  try {
    await initCatalogAdmin();
  } catch (error) {
    showError(error, "Catalog admin failed to initialize.");
  }
});