/* ================================================
   admin.js — FCStoreUA admin panel (final version)
================================================ */

const SB_URL = "https://puoaaphhdozbhqtdaejw.supabase.co";
const SB_KEY = "sb_publishable_nPQPfB6BPwVDVyD01u0gZQ_-FTbOOF-";
const sb     = window.supabase.createClient(SB_URL, SB_KEY);

const HERO_KEY        = "fcstoreua_hero";
const COLLECTIONS_KEY = "fcstoreua_collections";
const ADMIN_THEME_KEY = "fcstoreua_admin_theme";
const STORAGE_BUCKET  = "products";

/* ── state ── */
let sectionsState = [];
let columnsState  = [];
let linksState    = [];
let editProductId = null;
let productImages = [null,null,null,null];
let productSizes  = [];

/* ── helpers ── */
function esc(t){if(t==null)return"";return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function slugify(v){return String(v).toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");}
function numOrNull(v){return(v!==null&&v!==undefined&&v!=="")?Number(v):null;}
function setMsg(id,msg,type=""){const el=document.getElementById(id);if(el){el.textContent=msg;el.className="status-msg "+type;}}
function readLS(k,fb){try{const r=localStorage.getItem(k);return r?JSON.parse(r):fb;}catch{return fb;}}
function writeLS(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{alert("Storage full.");return false;}}
function sectionName(id){return sectionsState.find(s=>Number(s.id)===Number(id))?.name||`#${id}`;}
function columnTitle(id){return columnsState.find(c=>Number(c.id)===Number(id))?.title||`#${id}`;}

/* ════════════════════════════════════════
   DARK THEME
════════════════════════════════════════ */
function initTheme(){
  const saved=localStorage.getItem(ADMIN_THEME_KEY)||"light";
  applyTheme(saved);
  document.getElementById("adminThemeBtn")?.addEventListener("click",()=>{
    const next=document.body.classList.contains("dark")?"light":"dark";
    localStorage.setItem(ADMIN_THEME_KEY,next);applyTheme(next);
  });
}
function applyTheme(t){
  const dark=t==="dark";
  document.body.classList.toggle("dark",dark);
  const icon=document.getElementById("adminThemeIcon");
  const lbl=document.getElementById("adminThemeLabel");
  if(icon) icon.textContent=dark?"☾":"☀";
  if(lbl)  lbl.textContent=dark?"Light mode":"Dark mode";
}

/* ════════════════════════════════════════
   ACCORDION
════════════════════════════════════════ */
function initAccordion(){
  document.querySelectorAll(".panel-head").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const panel=btn.closest(".panel");if(!panel)return;
      panel.classList.toggle("open");
    });
  });
  /* sidebar nav */
  document.querySelectorAll(".sidebar-nav a[data-panel]").forEach(link=>{
    link.addEventListener("click",e=>{
      e.preventDefault();
      const id=link.dataset.panel;
      const panel=document.getElementById(id);if(!panel)return;
      const wasOpen=panel.classList.contains("open");
      panel.classList.toggle("open",!wasOpen);
      if(!wasOpen) setTimeout(()=>panel.scrollIntoView({behavior:"smooth",block:"start"}),50);
      document.querySelectorAll(".sidebar-nav a").forEach(a=>a.classList.remove("active"));
      link.classList.add("active");
    });
  });
}

/* ════════════════════════════════════════
   HERO  (Supabase Storage + settings table)
════════════════════════════════════════ */
const HERO_SETTINGS_KEY = "hero_slider";
let heroImages = [null, null, null, null];

/* helper — reuse product slot renderers but for hero slots */
function heroSlotId(slot){ return `heroSlot${slot}`; }

function renderHeroSlotPreview(slotEl, url, slot){
  slotEl.querySelector(".img-uploading")?.remove();
  slotEl.querySelector(".img-slot-inner")?.remove();
  slotEl.querySelector(".img-preview")?.remove();
  slotEl.querySelector(".img-remove")?.remove();
  const img = document.createElement("img");
  img.src = url; img.className = "img-preview"; slotEl.appendChild(img);
  const rb = document.createElement("button");
  rb.type = "button"; rb.className = "img-remove"; rb.textContent = "×";
  rb.addEventListener("click", e => {
    e.preventDefault(); e.stopPropagation();
    heroImages[slot] = null;
    resetHeroSlot(slotEl, slot);
  });
  slotEl.appendChild(rb);
  slotEl.classList.add("has-img");
}

function resetHeroSlot(slotEl, slot){
  slotEl.querySelector(".img-preview")?.remove();
  slotEl.querySelector(".img-remove")?.remove();
  slotEl.classList.remove("has-img");
  const inner = document.createElement("div"); inner.className = "img-slot-inner";
  inner.innerHTML = `<span class="img-icon">+</span><span class="img-label">Slide ${slot + 1}</span>`;
  slotEl.appendChild(inner);
  const inp = slotEl.querySelector("input[type=file]"); if(inp) inp.value = "";
}

async function uploadHeroSlot(file, slot){
  const slotEl = document.getElementById(heroSlotId(slot));
  setMsg("heroUploadStatus", "Uploading…", "loading");
  let ov = slotEl.querySelector(".img-uploading");
  if(!ov){ ov = document.createElement("div"); ov.className = "img-uploading"; ov.textContent = "Uploading…"; slotEl.appendChild(ov); }
  try{
    const ext  = file.name.split(".").pop();
    const path = `hero/${Date.now()}_${slot}.${ext}`;
    const { error } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: true });
    if(error) throw error;
    const { data } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    heroImages[slot] = data.publicUrl;
    renderHeroSlotPreview(slotEl, data.publicUrl, slot);
    setMsg("heroUploadStatus", `Slide ${slot + 1} uploaded ✓`, "ok");
  } catch(err){
    console.error(err);
    setMsg("heroUploadStatus", `Upload failed: ${err.message}`, "err");
    ov?.remove();
  }
}

async function loadHeroFromDB(){
  try{
    const { data } = await sb.from("store_settings").select("value").eq("key", HERO_SETTINGS_KEY).single();
    const slides = data?.value?.slides || [];
    heroImages = [null, null, null, null];
    slides.slice(0, 4).forEach((url, i) => {
      if(!url) return;
      heroImages[i] = url;
      const slotEl = document.getElementById(heroSlotId(i));
      if(slotEl) renderHeroSlotPreview(slotEl, url, i);
    });
  } catch(e){ /* no row yet — first launch */ }
}

async function saveHeroDB(){
  setMsg("heroSaveStatus", "Saving…", "loading");
  const slides = heroImages.filter(Boolean);
  try{
    const { error } = await sb.from("store_settings")
      .upsert({ key: HERO_SETTINGS_KEY, value: { slides } }, { onConflict: "key" });
    if(error) throw error;
    setMsg("heroSaveStatus", "Saved ✓", "ok");
  } catch(err){
    setMsg("heroSaveStatus", `Error: ${err.message}`, "err");
  }
}

function initHero(){
  document.querySelectorAll(".hero-file-input").forEach(inp => {
    inp.addEventListener("change", async e => {
      const file = e.target.files[0], slot = Number(inp.dataset.slot);
      if(file) await uploadHeroSlot(file, slot);
    });
  });
  document.getElementById("heroSaveBtn")?.addEventListener("click", saveHeroDB);
}

/* ════════════════════════════════════════
   COLLECTIONS
════════════════════════════════════════ */
function loadCollectionsForm(){
  const c=readLS(COLLECTIONS_KEY,{});
  ["Home","Away","Third","Retro"].forEach(k=>{const el=document.getElementById(`collection${k}`);if(el)el.value=c[k.toLowerCase()]||"";});
}
document.getElementById("collectionsForm")?.addEventListener("submit",e=>{
  e.preventDefault();
  const d={};["Home","Away","Third","Retro"].forEach(k=>{d[k.toLowerCase()]=document.getElementById(`collection${k}`)?.value.trim()||"";});
  if(writeLS(COLLECTIONS_KEY,d))alert("Saved.");
});

/* ════════════════════════════════════════
   PRODUCTS
════════════════════════════════════════ */

/* category select */
function renderCategoryOptions(cur=""){
  const sel=document.getElementById("category");if(!sel)return;
  sel.innerHTML=`<option value="">Select category</option>`+
    sectionsState.filter(s=>s.is_active!==false)
      .map(s=>`<option value="${esc(s.slug)}">${esc(s.name)}</option>`).join("");
  if(cur)sel.value=cur;
}

/* team cascade */
function renderTeamSection(curId=""){
  const sel=document.getElementById("teamSection");if(!sel)return;
  sel.innerHTML=`<option value="">— no team —</option>`+
    sectionsState.filter(s=>s.is_active!==false)
      .map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  if(curId)sel.value=curId;
  renderTeamColumn(curId);
}
function renderTeamColumn(secId,curId=""){
  const sel=document.getElementById("teamColumn");if(!sel)return;
  const cols=columnsState.filter(c=>Number(c.section_id)===Number(secId));
  sel.innerHTML=`<option value="">Select league</option>`+
    cols.map(c=>`<option value="${c.id}">${esc(c.title)}</option>`).join("");
  sel.disabled=!cols.length;if(curId)sel.value=curId;
  renderTeamLink(curId);
}
function renderTeamLink(colId,curId=""){
  const sel=document.getElementById("teamLink");if(!sel)return;
  const lnks=linksState.filter(l=>Number(l.column_id)===Number(colId));
  sel.innerHTML=`<option value="">Select team</option>`+
    lnks.map(l=>`<option value="${l.id}" data-slug="${esc(l.slug||slugify(l.label))}">${esc(l.label)}</option>`).join("");
  sel.disabled=!lnks.length;if(curId)sel.value=curId;
}
function getTeamSlug(){const sel=document.getElementById("teamLink");return sel?.options[sel.selectedIndex]?.dataset.slug||"";}
function getTeamName(){return document.getElementById("teamLink")?.options[document.getElementById("teamLink").selectedIndex]?.textContent?.trim()||"";}

function initTeamCascade(){
  document.getElementById("teamSection")?.addEventListener("change",e=>renderTeamColumn(e.target.value));
  document.getElementById("teamColumn")?.addEventListener("change",e=>renderTeamLink(e.target.value));
}

/* slug auto-fill */
function initSlug(){
  const t=document.getElementById("title"),s=document.getElementById("productSlug");
  if(!t||!s)return;
  t.addEventListener("input",()=>{if(!s.dataset.touched)s.value=slugify(t.value);});
  s.addEventListener("input",()=>{s.dataset.touched="1";});
}

/* image slots */
function initImageSlots(){
  document.querySelectorAll(".img-file-input").forEach(inp=>{
    inp.addEventListener("change",async e=>{
      const file=e.target.files[0],slot=Number(inp.dataset.slot);
      if(file)await uploadSlot(file,slot);
    });
  });
}
async function uploadSlot(file,slot){
  const slotEl=document.getElementById(`slot${slot}`);
  setMsg("imgUploadStatus","Uploading...","loading");
  let ov=slotEl.querySelector(".img-uploading");
  if(!ov){ov=document.createElement("div");ov.className="img-uploading";ov.textContent="Uploading…";slotEl.appendChild(ov);}
  try{
    const ext=file.name.split(".").pop();
    const path=`products/${Date.now()}_${slot}.${ext}`;
    const{error}=await sb.storage.from(STORAGE_BUCKET).upload(path,file,{upsert:true});
    if(error)throw error;
    const{data}=sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    productImages[slot]=data.publicUrl;
    renderSlotPreview(slotEl,data.publicUrl,slot);
    setMsg("imgUploadStatus",`Photo ${slot+1} uploaded ✓`,"ok");
  }catch(err){console.error(err);setMsg("imgUploadStatus",`Upload failed: ${err.message}`,"err");ov?.remove();}
}
function renderSlotPreview(slotEl,url,slot){
  slotEl.querySelector(".img-uploading")?.remove();
  slotEl.querySelector(".img-slot-inner")?.remove();
  slotEl.querySelector(".img-preview")?.remove();
  slotEl.querySelector(".img-remove")?.remove();
  const img=document.createElement("img");img.src=url;img.className="img-preview";slotEl.appendChild(img);
  const rb=document.createElement("button");rb.type="button";rb.className="img-remove";rb.textContent="×";
  rb.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();productImages[slot]=null;resetSlot(slotEl,slot);});
  slotEl.appendChild(rb);slotEl.classList.add("has-img");
}
function resetSlot(slotEl,slot){
  slotEl.querySelector(".img-preview")?.remove();slotEl.querySelector(".img-remove")?.remove();
  slotEl.classList.remove("has-img");
  const inner=document.createElement("div");inner.className="img-slot-inner";
  inner.innerHTML=`<span class="img-icon">+</span><span class="img-label">Photo ${slot+1}</span>`;
  slotEl.appendChild(inner);
  const inp=slotEl.querySelector("input[type=file]");if(inp)inp.value="";
}

/* sizes */
function initSizes(){
  document.querySelectorAll(".size-preset").forEach(btn=>{
    btn.addEventListener("click",()=>{
      if(productSizes.find(s=>s.size===btn.dataset.size))return;
      addSize(btn.dataset.size);btn.classList.add("active");
    });
  });
  const ci=document.getElementById("customSizeInput"),ab=document.getElementById("addCustomSizeBtn");
  ab?.addEventListener("click",()=>{const v=ci?.value.trim();if(!v||productSizes.find(s=>s.size===v))return;addSize(v);if(ci)ci.value="";});
  ci?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();ab?.click();}});
}
function addSize(size){productSizes.push({size,in_stock:true});renderSizes();}
function removeSize(size){
  productSizes=productSizes.filter(s=>s.size!==size);
  document.querySelectorAll(".size-preset").forEach(b=>{if(b.dataset.size===size)b.classList.remove("active");});
  renderSizes();
}
function renderSizes(){
  const el=document.getElementById("sizesList");if(!el)return;
  el.innerHTML=productSizes.map(s=>`
    <div class="size-row">
      <span class="size-row-name">${esc(s.size)}</span>
      <label class="size-row-stock"><input type="checkbox" class="size-stock-chk" data-size="${esc(s.size)}" ${s.in_stock?"checked":""}> In stock</label>
      <button type="button" class="size-row-del" data-size="${esc(s.size)}">×</button>
    </div>`).join("");
  el.querySelectorAll(".size-stock-chk").forEach(cb=>{cb.addEventListener("change",()=>{const e=productSizes.find(s=>s.size===cb.dataset.size);if(e)e.in_stock=cb.checked;});});
  el.querySelectorAll(".size-row-del").forEach(b=>{b.addEventListener("click",()=>removeSize(b.dataset.size));});
}

/* clear / fill form */
function clearProductForm(){
  document.getElementById("productForm")?.reset();
  editProductId=null;productImages=[null,null,null,null];productSizes=[];
  for(let i=0;i<4;i++){const s=document.getElementById(`slot${i}`);if(s)resetSlot(s,i);}
  renderSizes();
  document.querySelectorAll(".size-preset").forEach(b=>b.classList.remove("active"));
  const si=document.getElementById("productSlug");if(si)delete si.dataset.touched;
  const is=document.getElementById("inStock");if(is)is.checked=true;
  const iv=document.getElementById("isVisible");if(iv)iv.checked=true;
  const sb=document.getElementById("productSubmitBtn");if(sb)sb.textContent="Save product";
  setMsg("productSaveStatus","");setMsg("imgUploadStatus","");
  renderTeamSection();
}

function fillProductForm(p){
  ["title","description"].forEach(f=>{const el=document.getElementById(f);if(el)el.value=p[f]||"";});
  const fields={priceEur:"price_eur",priceUsd:"price_usd",priceUah:"price_uah",
                oldPriceEur:"old_price_eur",oldPriceUsd:"old_price_usd",oldPriceUah:"old_price_uah"};
  Object.entries(fields).forEach(([elId,field])=>{const el=document.getElementById(elId);if(el)el.value=p[field]||"";});
  renderCategoryOptions(p.category||"");
  const bd=document.getElementById("badge");if(bd)bd.value=p.badge||"";
  const ft=document.getElementById("featured");if(ft)ft.checked=!!p.featured;
  const is=document.getElementById("inStock");if(is)is.checked=!!p.in_stock;
  const iv=document.getElementById("isVisible");if(iv)iv.checked=p.is_visible!==false;
  const sl=document.getElementById("productSlug");if(sl){sl.value=p.slug||"";sl.dataset.touched="1";}
  /* images */
  const imgs=Array.isArray(p.images)?p.images:[];
  productImages=[null,null,null,null];
  imgs.slice(0,4).forEach((url,i)=>{productImages[i]=url;const s=document.getElementById(`slot${i}`);if(s&&url)renderSlotPreview(s,url,i);});
  /* sizes */
  productSizes=Array.isArray(p.sizes)?[...p.sizes]:[];renderSizes();
  document.querySelectorAll(".size-preset").forEach(b=>{if(productSizes.find(s=>s.size===b.dataset.size))b.classList.add("active");});
  /* team */
  if(p.team_slug){
    const link=linksState.find(l=>(l.slug||slugify(l.label||""))===p.team_slug);
    if(link){const col=columnsState.find(c=>Number(c.id)===Number(link.column_id));
      if(col){renderTeamSection(col.section_id);renderTeamColumn(col.section_id,col.id);renderTeamLink(col.id,link.id);}}
  }else renderTeamSection();
  editProductId=p.id;
  const sb=document.getElementById("productSubmitBtn");if(sb)sb.textContent="Update product";
  document.getElementById("productsPanel")?.scrollIntoView({behavior:"smooth",block:"start"});
}

/* render product list */
async function renderProducts(){
  const list=document.getElementById("productsList");if(!list)return;
  list.innerHTML=`<div class="empty-state">Loading...</div>`;
  try{
    const{data,error}=await sb.from("products")
      .select("id,title,price_eur,price_usd,price_uah,category,badge,featured,in_stock,is_visible,slug,images,team_name")
      .order("created_at",{ascending:false});
    if(error)throw error;
    if(!data?.length){list.innerHTML=`<div class="empty-state">No products yet.</div>`;return;}
    list.innerHTML=data.map(p=>{
      const thumb=Array.isArray(p.images)&&p.images[0]
        ?`<img src="${esc(p.images[0])}" class="product-thumb" alt="">`
        :`<div class="product-thumb-empty"></div>`;
      const vis=p.is_visible!==false;
      const priceStr=[p.price_eur?`€${Number(p.price_eur).toFixed(2)}`:"",p.price_usd?`$${Number(p.price_usd).toFixed(2)}`:"",p.price_uah?`₴${Number(p.price_uah).toFixed(0)}`:""].filter(Boolean).join(" / ")||"—";
      const url=p.slug?`product.html?slug=${esc(p.slug)}`:"";
      return `
        <div class="product-item${vis?"":" hidden"}" data-id="${p.id}">
          ${thumb}
          <div class="product-info">
            <div class="product-name">
              ${esc(p.title)}
              <span class="vis-badge ${vis?"vis-on":"vis-off"}">${vis?"● Visible":"● Hidden"}</span>
            </div>
            <div class="product-detail">${priceStr} · ${esc(p.category||"")}${p.badge?` · ${esc(p.badge)}`:""}</div>
            <div class="product-detail">${p.team_name?`${esc(p.team_name)} · `:""}${p.featured?"featured · ":""}${p.in_stock?"in stock":"out of stock"}</div>
            ${url?`<a href="${url}" target="_blank" class="product-link">${url}</a>`:""}
          </div>
          <div class="product-actions">
            <button class="btn-vis" data-id="${p.id}" data-vis="${vis}">${vis?"👁 Hide":"👁 Show"}</button>
            <button class="btn-edit" data-id="${p.id}">Edit</button>
            <button class="btn-delete" data-id="${p.id}">Delete</button>
          </div>
        </div>`;
    }).join("");
    bindProductActions(data);
  }catch(err){list.innerHTML=`<div class="empty-state">Failed to load.</div>`;console.error(err);}
}

function bindProductActions(data){
  document.querySelectorAll(".btn-edit").forEach(b=>{
    b.addEventListener("click",()=>{const p=data.find(p=>p.id===b.dataset.id);if(p)fillProductForm(p);});
  });
  document.querySelectorAll(".btn-delete").forEach(b=>{
    b.addEventListener("click",async()=>{
      if(!confirm("Delete this product?"))return;
      try{const{error}=await sb.from("products").delete().eq("id",b.dataset.id);if(error)throw error;await renderProducts();}
      catch(err){alert(err.message);}
    });
  });
  document.querySelectorAll(".btn-vis").forEach(b=>{
    b.addEventListener("click",async()=>{
      const vis=b.dataset.vis==="true";
      try{const{error}=await sb.from("products").update({is_visible:!vis}).eq("id",b.dataset.id);if(error)throw error;await renderProducts();}
      catch(err){alert(err.message);}
    });
  });
}

/* submit */
async function handleProductSubmit(e){
  e.preventDefault();
  const title=document.getElementById("title")?.value.trim()||"";
  const slug=document.getElementById("productSlug")?.value.trim()||slugify(title);
  const priceEur=numOrNull(document.getElementById("priceEur")?.value);
  const priceUsd=numOrNull(document.getElementById("priceUsd")?.value);
  const priceUah=numOrNull(document.getElementById("priceUah")?.value);
  const oldPriceEur=numOrNull(document.getElementById("oldPriceEur")?.value);
  const oldPriceUsd=numOrNull(document.getElementById("oldPriceUsd")?.value);
  const oldPriceUah=numOrNull(document.getElementById("oldPriceUah")?.value);
  const category=document.getElementById("category")?.value||"";
  const badge=document.getElementById("badge")?.value||"";
  const description=document.getElementById("description")?.value.trim()||"";
  const featured=document.getElementById("featured")?.checked||false;
  const inStock=document.getElementById("inStock")?.checked||false;
  const isVisible=document.getElementById("isVisible")?.checked!==false;
  const teamSlug=getTeamSlug();const teamName=getTeamName();

  if(!title||!category){alert("Fill in title and category.");return;}
  if(!priceEur&&!priceUsd&&!priceUah){alert("Enter at least one price.");return;}

  setMsg("productSaveStatus","Saving...","loading");
  const btn=document.getElementById("productSubmitBtn");if(btn)btn.disabled=true;

  const payload={
    title,slug,
    price_eur:priceEur,price_usd:priceUsd,price_uah:priceUah,
    old_price_eur:oldPriceEur,old_price_usd:oldPriceUsd,old_price_uah:oldPriceUah,
    price:priceEur,old_price:oldPriceEur,
    category,badge:badge||null,description,featured,
    in_stock:inStock,is_visible:isVisible,
    images:productImages.filter(Boolean),sizes:productSizes,
    team_slug:teamSlug||null,team_name:teamName||null,
  };

  try{
    if(editProductId){const{error}=await sb.from("products").update(payload).eq("id",editProductId);if(error)throw error;}
    else{const{error}=await sb.from("products").insert(payload);if(error)throw error;}
    setMsg("productSaveStatus",editProductId?"Updated ✓":"Saved ✓","ok");
    clearProductForm();await renderProducts();
  }catch(err){setMsg("productSaveStatus",`Error: ${err.message}`,"err");console.error(err);}
  finally{if(btn)btn.disabled=false;}
}

function initProductForm(){
  initSlug();initImageSlots();initSizes();initTeamCascade();
  document.getElementById("productForm")?.addEventListener("submit",handleProductSubmit);
  document.getElementById("productForm")?.addEventListener("reset",()=>setTimeout(clearProductForm,0));
}

/* ════════════════════════════════════════
   CATALOG LOAD
════════════════════════════════════════ */
async function loadSections(){
  const{data,error}=await sb.from("catalog_sections").select("*").order("sort_order",{ascending:true}).order("id",{ascending:true});
  if(error)throw error;
  sectionsState=data||[];
  renderSectionsList();renderSectionSelect();renderCategoryOptions();renderTeamSection();
}
async function loadColumns(){
  const{data,error}=await sb.from("catalog_columns").select("*").order("sort_order",{ascending:true}).order("id",{ascending:true});
  if(error)throw error;
  columnsState=data||[];renderColumnsList();renderColumnSelect();
}
async function loadLinks(){
  const{data,error}=await sb.from("catalog_links").select("*").order("sort_order",{ascending:true}).order("id",{ascending:true});
  if(error)throw error;
  linksState=data||[];renderLinksList();
}
async function refreshCatalog(){await loadSections();await loadColumns();await loadLinks();}

/* ════════════════════════════════════════
   CATALOG RENDER
════════════════════════════════════════ */
function renderSectionsList(){
  const el=document.getElementById("catalogSectionsList");if(!el)return;
  if(!sectionsState.length){el.innerHTML=`<div class="empty-state">No sections yet.</div>`;return;}
  el.innerHTML=sectionsState.map(s=>{
    const onHP=!!s.show_on_homepage;
    return `<div class="entity-item">
      <div class="entity-info">
        <div class="entity-title">${esc(s.name)}</div>
        <div class="entity-meta">slug: ${esc(s.slug)} · order: ${s.sort_order} · active: ${s.is_active?"yes":"no"}</div>
        <div class="entity-meta" style="margin-top:3px"><span class="hp-flag ${onHP?"on":""}">${onHP?"✓ On homepage":"Not on homepage"}</span></div>
      </div>
      <div class="entity-actions">
        <button class="btn-hp" data-hp-id="${s.id}" data-hp-cur="${onHP}">${onHP?"Hide":"Show"}</button>
        <button class="btn-delete" data-del-section="${s.id}">Delete</button>
      </div>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-hp-id]").forEach(b=>{
    b.addEventListener("click",async()=>{
      const cur=b.dataset.hpCur==="true";
      try{const{error}=await sb.from("catalog_sections").update({show_on_homepage:!cur}).eq("id",b.dataset.hpId);if(error)throw error;await refreshCatalog();}
      catch(err){alert(err.message);}
    });
  });
  el.querySelectorAll("[data-del-section]").forEach(b=>{
    b.addEventListener("click",async()=>{
      if(!confirm("Delete section?"))return;
      try{const{error}=await sb.from("catalog_sections").delete().eq("id",Number(b.dataset.delSection));if(error)throw error;await refreshCatalog();}
      catch(err){alert(err.message);}
    });
  });
}

function renderColumnsList(){
  const el=document.getElementById("catalogColumnsList");if(!el)return;
  if(!columnsState.length){el.innerHTML=`<div class="empty-state">No columns yet.</div>`;return;}
  el.innerHTML=columnsState.map(c=>`
    <div class="entity-item">
      <div class="entity-info">
        <div class="entity-title">${esc(c.title)}</div>
        <div class="entity-meta">section: ${esc(sectionName(c.section_id))} · order: ${c.sort_order}</div>
      </div>
      <div class="entity-actions"><button class="btn-delete" data-del-column="${c.id}">Delete</button></div>
    </div>`).join("");
  el.querySelectorAll("[data-del-column]").forEach(b=>{
    b.addEventListener("click",async()=>{
      if(!confirm("Delete column?"))return;
      try{const{error}=await sb.from("catalog_columns").delete().eq("id",Number(b.dataset.delColumn));if(error)throw error;await refreshCatalog();}
      catch(err){alert(err.message);}
    });
  });
}

function renderLinksList(){
  const el=document.getElementById("catalogLinksList");if(!el)return;
  if(!linksState.length){el.innerHTML=`<div class="empty-state">No links yet.</div>`;return;}
  el.innerHTML=linksState.map(l=>`
    <div class="entity-item">
      <div class="entity-info">
        <div class="entity-title">${esc(l.label)}</div>
        <div class="entity-meta">col: ${esc(columnTitle(l.column_id))} · url: ${esc(l.url)}</div>
      </div>
      <div class="entity-actions"><button class="btn-delete" data-del-link="${l.id}">Delete</button></div>
    </div>`).join("");
  el.querySelectorAll("[data-del-link]").forEach(b=>{
    b.addEventListener("click",async()=>{
      if(!confirm("Delete link?"))return;
      try{const{error}=await sb.from("catalog_links").delete().eq("id",Number(b.dataset.delLink));if(error)throw error;await refreshCatalog();}
      catch(err){alert(err.message);}
    });
  });
}

function renderSectionSelect(){
  const sel=document.getElementById("columnSection");if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=`<option value="">Select section</option>`+sectionsState.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
  if(sectionsState.some(s=>String(s.id)===cur))sel.value=cur;
}
function renderColumnSelect(){
  const sel=document.getElementById("linkColumn");if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=`<option value="">Select column</option>`+columnsState.map(c=>`<option value="${c.id}">${esc(sectionName(c.section_id))} → ${esc(c.title)}</option>`).join("");
  if(columnsState.some(c=>String(c.id)===cur))sel.value=cur;
}

/* ════════════════════════════════════════
   CATALOG CREATE
════════════════════════════════════════ */
function initCatalogForms(){
  /* section */
  const snI=document.getElementById("sectionName"),ssI=document.getElementById("sectionSlug");
  snI?.addEventListener("input",()=>{if(!ssI?.dataset.touched)ssI.value=slugify(snI.value);});
  ssI?.addEventListener("input",()=>{ssI.dataset.touched="1";});

  document.getElementById("catalogSectionForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const name=snI?.value.trim()||"";const slug=ssI?.value.trim()||slugify(name);
    const sortOrder=Number(document.getElementById("sectionOrder")?.value||0);
    const isActive=!!document.getElementById("sectionActive")?.checked;
    const showHP=!!document.getElementById("sectionShowHomepage")?.checked;
    if(!name){alert("Name required.");return;}
    try{const{error}=await sb.from("catalog_sections").insert({name,slug,sort_order:sortOrder,is_active:isActive,show_on_homepage:showHP});if(error)throw error;
      document.getElementById("catalogSectionForm").reset();document.getElementById("sectionActive").checked=true;
      if(ssI)delete ssI.dataset.touched;await refreshCatalog();}
    catch(err){alert(err.message);}
  });
  document.getElementById("catalogSectionForm")?.addEventListener("reset",()=>{setTimeout(()=>{if(ssI)delete ssI.dataset.touched;},0);});

  /* link auto-url */
  const llI=document.getElementById("linkLabel"),luI=document.getElementById("linkUrl"),lcSel=document.getElementById("linkColumn");
  function autoUrl(){
    if(!luI||luI.dataset.touched)return;
    const cId=Number(lcSel?.value||0),label=llI?.value.trim()||"";
    if(!cId||!label){luI.value="";return;}
    const col=columnsState.find(c=>Number(c.id)===cId);if(!col)return;
    const sec=sectionsState.find(s=>Number(s.id)===Number(col.section_id));
    luI.value=`catalog.html?s=${sec?.slug||""}&c=${col.slug||slugify(col.title||"")}&l=${slugify(label)}`;
  }
  llI?.addEventListener("input",autoUrl);lcSel?.addEventListener("change",autoUrl);
  luI?.addEventListener("input",()=>{luI.dataset.touched="1";});

  document.getElementById("catalogColumnForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const sId=Number(document.getElementById("columnSection")?.value||0);
    const title=document.getElementById("columnTitle")?.value.trim()||"";
    const sortOrder=Number(document.getElementById("columnOrder")?.value||0);
    if(!sId){alert("Select section.");return;}if(!title){alert("Title required.");return;}
    try{const{error}=await sb.from("catalog_columns").insert({section_id:sId,title,slug:slugify(title),sort_order:sortOrder});if(error)throw error;
      document.getElementById("catalogColumnForm").reset();await refreshCatalog();}
    catch(err){alert(err.message);}
  });

  document.getElementById("catalogLinkForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const cId=Number(lcSel?.value||0),label=llI?.value.trim()||"";
    const url=luI?.value.trim()||"";
    const sortOrder=Number(document.getElementById("linkOrder")?.value||0);
    const isActive=!!document.getElementById("linkActive")?.checked;
    if(!cId){alert("Select column.");return;}if(!label){alert("Label required.");return;}
    const resolvedUrl=url||(()=>{const col=columnsState.find(c=>Number(c.id)===cId);if(!col)return"";const sec=sectionsState.find(s=>Number(s.id)===Number(col.section_id));return`catalog.html?s=${sec?.slug||""}&c=${col.slug||slugify(col.title||"")}&l=${slugify(label)}`;})();
    try{const{error}=await sb.from("catalog_links").insert({column_id:cId,label,url:resolvedUrl,sort_order:sortOrder,is_active:isActive});if(error)throw error;
      document.getElementById("catalogLinkForm").reset();document.getElementById("linkActive").checked=true;if(luI)delete luI.dataset.touched;await refreshCatalog();}
    catch(err){alert(err.message);}
  });
  document.getElementById("catalogLinkForm")?.addEventListener("reset",()=>{setTimeout(()=>{if(luI)delete luI.dataset.touched;},0);});
}

/* ════════════════════════════════════════
   PERSONALIZATION SETTINGS
════════════════════════════════════════ */
async function loadPersonalization(){
  try{
    const{data}=await sb.from("store_settings").select("value").eq("key","personalization").single();
    if(!data)return;const s=data.value;
    const el=id=>document.getElementById(id);
    if(el("personalEnabled"))el("personalEnabled").checked=!!s.enabled;
    if(el("personalPriceEur")&&s.price_eur!=null)el("personalPriceEur").value=s.price_eur;
    if(el("personalPriceUsd")&&s.price_usd!=null)el("personalPriceUsd").value=s.price_usd;
    if(el("personalPriceUah")&&s.price_uah!=null)el("personalPriceUah").value=s.price_uah;
  }catch(e){console.warn("personalization settings:",e.message);}
}
function initPersonalizationForm(){
  document.getElementById("personalizationForm")?.addEventListener("submit",async e=>{
    e.preventDefault();setMsg("personalizationStatus","Saving...","loading");
    const value={
      enabled:!!document.getElementById("personalEnabled")?.checked,
      price_eur:Number(document.getElementById("personalPriceEur")?.value||30),
      price_usd:Number(document.getElementById("personalPriceUsd")?.value||32),
      price_uah:Number(document.getElementById("personalPriceUah")?.value||1200),
    };
    try{const{error}=await sb.from("store_settings").upsert({key:"personalization",value},{onConflict:"key"});if(error)throw error;
      setMsg("personalizationStatus","Saved ✓","ok");}
    catch(err){setMsg("personalizationStatus",`Error: ${err.message}`,"err");}
  });
}

/* ════════════════════════════════════════
   INIT
════════════════════════════════════════ */
document.addEventListener("DOMContentLoaded",async()=>{
  initTheme();
  initAccordion();
  initHero();
  loadCollectionsForm();
  initProductForm();
  initCatalogForms();
  initPersonalizationForm();

  try{
    await refreshCatalog();
    await renderProducts();
    await loadPersonalization();
    await loadHeroFromDB();
  }catch(err){console.error("Init error:",err);alert("Init failed: "+err.message);}
});
