// GLOBALS
let products = [];
let cart = JSON.parse(localStorage.getItem("cart")||"[]");
let currentSlide = 0;

// load products.json if not loaded
async function loadProducts(){
  if(products && products.length) return products;
  try{
    const res = await fetch("products.json");
    products = await res.json();
    return products;
  }catch(err){
    console.error("Could not load products.json", err);
    products = [];
    return products;
  }
}

/* -------- SHOP RENDERER (image + name only) -------- */
function displayProductsOnly(list){
  const container = document.getElementById("product-list");
  if(!container) return;
  container.innerHTML = "";
  list.forEach(p=>{
    const card = document.createElement("div");
    card.className = "product-card";
    const img = (p.images && p.images.length>0) ? p.images[0] : "";
    card.innerHTML = `
      <img src="${img}" alt="${escapeHtml(p.PRODUCT_NAME)}">
      <h3>${escapeHtml(p.PRODUCT_NAME)}</h3>
    `;
    card.onclick = ()=> viewProduct(p.PRODUCT_ID);
    container.appendChild(card);
  });
}

/* -------- VIEW PRODUCT -------- */
function viewProduct(id){
  localStorage.setItem("selectedProduct", id);
  window.location.href = "product.html";
}

/* -------- SINGLE PRODUCT PAGE (slider + thumbnails + filters + add to cart) -------- */
function loadSingleProductSlider(){
  const id = localStorage.getItem("selectedProduct");
  const p = products.find(x=>x.PRODUCT_ID === id);
  if(!p){
    console.warn("Product not found:", id);
    return;
  }

  const slider = document.getElementById("slider-images");
  const thumbs = document.getElementById("thumbnails");
  const colorSel = document.getElementById("product-color");
  const sizeSel = document.getElementById("product-size");
  const qtyInput = document.getElementById("product-qty");

  if(slider) slider.innerHTML = "";
  if(thumbs) thumbs.innerHTML = "";
  if(colorSel) colorSel.innerHTML = "";
  if(sizeSel) sizeSel.innerHTML = "";

  // images
  (p.images||[]).forEach((img, i)=>{
    const im = document.createElement("img");
    im.src = img;
    im.alt = `${p.PRODUCT_NAME} ${i+1}`;
    slider.appendChild(im);

    const t = document.createElement("img");
    t.src = img;
    t.alt = `thumb-${i+1}`;
    t.onclick = ()=>{ currentSlide = i; updateSlider(); };
    t.className = i===0 ? "active" : "";
    thumbs.appendChild(t);
  });

  // color options
  (p.COLOURS||"").split(",").map(c=>c.trim()).forEach((c,i)=>{
    const o = document.createElement("option"); o.value=c; o.innerText = c;
    colorSel.appendChild(o);
  });

  // size options
  (p.SIZE||"").split(",").map(s=>s.trim()).forEach((s,i)=>{
    const o = document.createElement("option"); o.value=s; o.innerText = s;
    sizeSel.appendChild(o);
  });

  // fill details
  document.getElementById("product-name").innerText = p.PRODUCT_NAME;
  document.getElementById("product-type").innerText = `Type: ${p.TYPE}`;
  document.getElementById("product-price").innerText = `PKR ${p.PRICE_PKR}`;

  // add to cart button
  const addBtn = document.getElementById("add-cart-btn");
  addBtn.onclick = ()=>{
    const selectedColor = colorSel.value || null;
    const selectedSize = sizeSel.value || null;
    const qty = Math.max(1, parseInt(qtyInput.value||1));
    addToCart(p.PRODUCT_ID, selectedColor, selectedSize, qty);
  };

  currentSlide = 0; updateSlider();
}

// slider nav
document.addEventListener("click", function(e){
  if(e.target.matches(".prev-btn")){ currentSlide--; updateSlider(); }
  if(e.target.matches(".next-btn")){ currentSlide++; updateSlider(); }
});

function updateSlider(){
  const slider = document.getElementById("slider-images");
  if(!slider) return;
  const total = slider.children.length; if(total===0) return;
  if(currentSlide < 0) currentSlide = total - 1;
  if(currentSlide >= total) currentSlide = 0;
  slider.style.transform = `translateX(-${currentSlide * 100}%)`;
  const thumbs = document.getElementById("thumbnails")?.children;
  if(thumbs){
    for(let i=0;i<thumbs.length;i++) thumbs[i].classList.remove("active");
    thumbs[currentSlide].classList.add("active");
  }
}

/* -------- CART FUNCTIONS -------- */
function addToCart(id, color=null, size=null, qty=1){
  const p = products.find(x=>x.PRODUCT_ID===id);
  if(!p) return alert("Product not found");
  const existing = cart.find(item => item.PRODUCT_ID === id && item.selectedColor === color && item.selectedSize === size);
  if(existing){
    existing.qty = (existing.qty || 1) + qty;
  } else {
    cart.push({
      PRODUCT_ID: p.PRODUCT_ID,
      PRODUCT_NAME: p.PRODUCT_NAME,
      PRICE_PKR: p.PRICE_PKR,
      images: p.images,
      selectedColor: color,
      selectedSize: size,
      qty: qty
    });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  alert("Added to cart ✅");
  // update header counts
  document.querySelectorAll('#header-cart-count, #header-cart-count-2, #header-cart-count-3').forEach(el=>{
    if(el) el.innerText = cart.length;
  });
  // if cart page present, refresh
  if(document.getElementById("cart-items")) loadCart();
}

function loadCart(){
  const c = document.getElementById("cart-items");
  const totalBox = document.getElementById("cart-total");
  if(!c) return;
  c.innerHTML = "";
  if(!cart.length){
    c.innerHTML = "<p>Your cart is empty.</p>";
    if(totalBox) totalBox.innerText = "PKR 0";
    return;
  }
  let sum = 0;
  cart.forEach((item, i)=>{
    sum += (item.PRICE_PKR * (item.qty||1));
    const div = document.createElement("div");
    div.className = "cart-card";
    div.innerHTML = `
      <img src="${item.images && item.images[0] || ''}" class="cart-img" alt="${escapeHtml(item.PRODUCT_NAME)}">
      <div style="flex:1">
        <h4>${escapeHtml(item.PRODUCT_NAME)}</h4>
        <p>PKR ${item.PRICE_PKR} × ${item.qty}</p>
        <p style="color:#aaa;font-size:13px">Color: ${escapeHtml(item.selectedColor || '-') } • Size: ${escapeHtml(item.selectedSize || '-')}</p>
        <div style="margin-top:8px">
          <button onclick="changeQty(${i}, -1)" class="remove-btn">-</button>
          <button onclick="changeQty(${i}, 1)" class="remove-btn">+</button>
          <button onclick="removeFromCart(${i})" class="remove-btn">Remove</button>
        </div>
      </div>
    `;
    c.appendChild(div);
  });
  if(totalBox) totalBox.innerText = `PKR ${sum}`;
}

function changeQty(index, delta){
  cart[index].qty = Math.max(1, (cart[index].qty||1) + delta);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

function removeFromCart(i){
  cart.splice(i,1);
  localStorage.setItem("cart", JSON.stringify(cart));
  loadCart();
}

/* UTIL */
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }

/* INITIALIZERS - run depending on page */
if(document.getElementById("product-list")){
  loadProducts().then(()=> displayProductsOnly(products) );
}
if(document.getElementById("slider-images")){
  loadProducts().then(()=> loadSingleProductSlider() );
}
if(document.getElementById("cart-items")){
  loadProducts().then(()=> { cart = JSON.parse(localStorage.getItem("cart")||"[]"); loadCart(); } );
}
