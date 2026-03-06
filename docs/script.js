let products = JSON.parse(localStorage.getItem("products")) || [];
let sales = JSON.parse(localStorage.getItem("sales")) || [];
let editingProductId = null;
let galleryMenuListenerAdded = false;

function normalizeProduct(product) {
if (product.cost === undefined) product.cost = "";
if (Array.isArray(product.images) && product.images.length > 0) return product;
if (product.image) {
product.images = [product.image];
} else {
product.images = [];
}
return product;
}

products = products.map(normalizeProduct);

function saveData() {
try {
localStorage.setItem("products", JSON.stringify(products));
return true;
} catch (error) {
return false;
}
}

function saveSales() {
try {
localStorage.setItem("sales", JSON.stringify(sales));
return true;
} catch (error) {
return false;
}
}

function fileToDataURL(file) {
return new Promise((resolve, reject) => {
let reader = new FileReader();
reader.onload = function () {
resolve(reader.result);
};
reader.onerror = function () {
reject(new Error("Failed to read image file."));
};
reader.readAsDataURL(file);
});
}

function compressImage(file, maxWidth = 1280, quality = 0.75) {
return new Promise(async (resolve, reject) => {
try {
let rawDataUrl = await fileToDataURL(file);
let image = new Image();
image.onload = function () {
let ratio = Math.min(1, maxWidth / image.width);
let width = Math.max(1, Math.round(image.width * ratio));
let height = Math.max(1, Math.round(image.height * ratio));

let canvas = document.createElement("canvas");
canvas.width = width;
canvas.height = height;
let context = canvas.getContext("2d");
context.drawImage(image, 0, 0, width, height);
resolve(canvas.toDataURL("image/jpeg", quality));
};
image.onerror = function () {
reject(new Error("Image decode failed."));
};
image.src = rawDataUrl;
} catch (error) {
reject(error);
}
});
}

async function addProduct(event) {
event.preventDefault();

let name = document.getElementById("name").value;
let quantity = parseInt(document.getElementById("quantity").value);
let price = document.getElementById("price").value;
let cost = document.getElementById("cost").value;
let rack = document.getElementById("rack").value;
let shelf = document.getElementById("shelf").value;
let imageInput = document.getElementById("image");
let files = Array.from(imageInput.files || []);

if (files.length === 0) return;

try {
let images = await Promise.all(files.map(file => compressImage(file)));

products.push({
id: Date.now(),
name,
quantity,
price,
cost,
rack,
shelf,
images
});

if (!saveData()) {
products.pop();
alert("Storage full. Please upload fewer/smaller images.");
return;
}

function submitProductFromIcon(event) {
event.preventDefault();
event.stopPropagation();
let submitButton = document.getElementById("addProductSubmitBtn");
if (!submitButton) return;
submitButton.click();
}
window.location.reload();
} catch (error) {
alert("Image upload failed. Please try again.");
}
}

function loadProducts() {
let container = document.getElementById("productContainer");
if (!container) return;

container.innerHTML = "";

let search = document.getElementById("search")?.value.toLowerCase() || "";
let rackFilter = document.getElementById("rackFilter")?.value.toLowerCase().trim() || "all";

let filtered = products.filter(p => {
return (
p.name.toLowerCase().includes(search) &&
(rackFilter === "" ||
rackFilter === "all" ||
rackFilter === "all racks" ||
p.rack.toLowerCase().includes(rackFilter))
);
});

filtered.forEach(p => {
let galleryCount = Math.max((p.images?.length || 0) - 1, 0);
let previewImage = p.images?.[0] || "";
let isEditing = editingProductId === p.id;

container.innerHTML += `
<div class="product-card">
${previewImage ? `<img src="${previewImage}" alt="${p.name}" onclick="openImage('${previewImage}')">` : ""}
${isEditing ? `
<input id="edit-name-${p.id}" type="text" value="${p.name}">
<input id="edit-price-${p.id}" type="number" value="${p.price}">
<input id="edit-cost-${p.id}" type="number" value="${p.cost ?? ""}">
<input id="edit-rack-${p.id}" type="text" value="${p.rack}">
<input id="edit-shelf-${p.id}" type="text" value="${p.shelf}">
<p>
<button class="qty-btn" onclick="adjustEditQty(${p.id},-1)">-</button>
<span id="edit-qty-${p.id}">${p.quantity}</span>
<button class="qty-btn" onclick="adjustEditQty(${p.id},1)">+</button>
</p>
` : `
<h3>${p.name}</h3>
<p>Price: ${p.price}</p>
<p>Cost: ${p.cost ?? "-"}</p>
<p>Rack: ${p.rack} | Shelf: ${p.shelf}</p>
<p>Quantity: ${p.quantity}</p>
`}
${galleryCount > 0 ? `<button class="folder-btn" onclick="openGallery(${p.id})">View Product</button>` : ""}
${isEditing ? `<button class="qty-btn" onclick="saveProductEdits(${p.id})">Save</button>
<button class="folder-btn" onclick="cancelProductEdit()">Cancel</button>` : `<button class="qty-btn" onclick="startProductEdit(${p.id})">Edit</button>`}
${!isEditing ? `<button class="sell-btn" onclick="openSellPopup(${p.id})">Sell</button>` : ""}
<button class="delete-btn" onclick="deleteProduct(${p.id})">Delete</button>
</div>
`;
});
}

function startProductEdit(id) {
editingProductId = id;
loadProducts();
}

function cancelProductEdit() {
editingProductId = null;
loadProducts();
}

function adjustEditQty(id, val) {
let qtyEl = document.getElementById(`edit-qty-${id}`);
if (!qtyEl) return;
let qty = Number(qtyEl.innerText || 0) + val;
qtyEl.innerText = String(Math.max(0, qty));
}

function saveProductEdits(id) {
let name = document.getElementById(`edit-name-${id}`)?.value?.trim() || "";
let price = document.getElementById(`edit-price-${id}`)?.value ?? "";
let cost = document.getElementById(`edit-cost-${id}`)?.value ?? "";
let rack = document.getElementById(`edit-rack-${id}`)?.value?.trim() || "";
let shelf = document.getElementById(`edit-shelf-${id}`)?.value?.trim() || "";
let quantity = Number(document.getElementById(`edit-qty-${id}`)?.innerText || 0);

if (!name || !rack || !shelf || price === "") {
alert("Please fill all required fields.");
return;
}

products = products.map(p => {
if (p.id !== id) return p;
return {
...p,
name,
price,
cost,
rack,
shelf,
quantity: Math.max(0, quantity)
};
});

saveData();
editingProductId = null;
loadProducts();
}

function ensureImageModal() {
let modal = document.getElementById("imageModal");
if (modal) return modal;

modal = document.createElement("div");
modal.id = "imageModal";
modal.className = "image-modal";
modal.innerHTML = `
<button class="image-modal-close" type="button" aria-label="Close image">&times;</button>
<img id="imageModalPreview" src="" alt="Preview">
`;

modal.addEventListener("click", event => {
if (event.target === modal) closeImageModal();
});

modal.querySelector(".image-modal-close").addEventListener("click", closeImageModal);
document.body.appendChild(modal);

document.addEventListener("keydown", event => {
if (event.key === "Escape") closeImageModal();
});

return modal;
}

function openImage(src) {
let modal = ensureImageModal();
let preview = document.getElementById("imageModalPreview");
if (!preview) return;

preview.src = src;
modal.classList.add("active");
document.body.style.overflow = "hidden";
}

function closeImageModal() {
let modal = document.getElementById("imageModal");
if (!modal) return;

modal.classList.remove("active");
document.body.style.overflow = "";
}

function ensureSellModal() {
let modal = document.getElementById("sellModal");
if (modal) return modal;

modal = document.createElement("div");
modal.id = "sellModal";
modal.className = "sell-modal";
modal.innerHTML = `
<div class="sell-modal-content">
<h3 id="sellTitle">Sell Product</h3>
<p id="sellInfo"></p>
<input id="sellQtyInput" type="number" min="1" placeholder="Enter quantity">
<div class="sell-modal-actions">
<button class="qty-btn" onclick="confirmSell()">Confirm</button>
<button class="delete-btn" onclick="closeSellPopup()">Cancel</button>
</div>
</div>
`;

modal.addEventListener("click", event => {
if (event.target === modal) closeSellPopup();
});

document.body.appendChild(modal);
return modal;
}

function openSellPopup(id) {
let product = products.find(p => p.id === id);
if (!product) return;

let modal = ensureSellModal();
let title = document.getElementById("sellTitle");
let info = document.getElementById("sellInfo");
let input = document.getElementById("sellQtyInput");
if (!title || !info || !input) return;

modal.dataset.productId = String(id);
title.innerText = `Sell ${product.name}`;
info.innerText = `Available quantity: ${product.quantity}`;
input.value = "";
input.max = String(Math.max(1, product.quantity));
modal.classList.add("active");
input.focus();
}

function closeSellPopup() {
let modal = document.getElementById("sellModal");
if (!modal) return;
modal.classList.remove("active");
}

function confirmSell() {
let modal = document.getElementById("sellModal");
let input = document.getElementById("sellQtyInput");
if (!modal || !input) return;

let id = Number(modal.dataset.productId);
let sellQty = Number(input.value);
let product = products.find(p => p.id === id);
if (!product) return;

if (!Number.isInteger(sellQty) || sellQty <= 0) {
alert("Please enter valid quantity.");
return;
}
if (sellQty > product.quantity) {
alert("Sell quantity is greater than available stock.");
return;
}

let price = Number(product.price) || 0;
let cost = Number(product.cost) || 0;
let profitPerUnit = price - cost;

product.quantity -= sellQty;
sales.push({
id: Date.now(),
productId: product.id,
name: product.name,
quantity: sellQty,
price,
cost,
profit: profitPerUnit * sellQty,
createdAt: new Date().toISOString()
});

if (!saveData() || !saveSales()) {
alert("Unable to save sale. Storage may be full.");
return;
}

closeSellPopup();
window.location.href = "hisab.html";
}

function openGallery(id) {
let isEditMode = editingProductId === id ? 1 : 0;
window.location.href = `gallery.html?id=${id}&edit=${isEditMode}`;
}

function getGalleryProductId() {
let params = new URLSearchParams(window.location.search);
return Number(params.get("id"));
}

async function addImagesToGalleryProduct(files) {
let id = getGalleryProductId();
let productIndex = products.findIndex(p => p.id === id);
if (productIndex === -1) {
alert("Product not found.");
return;
}

try {
let newImages = await Promise.all(files.map(file => compressImage(file)));
products[productIndex].images = [...(products[productIndex].images || []), ...newImages];

if (!saveData()) {
alert("Storage full. Please upload fewer/smaller images.");
return;
}

loadGallery();
} catch (error) {
alert("Image upload failed. Please try again.");
}
}

async function addImagesToCurrentProduct(event) {
event.preventDefault();

let input = document.getElementById("galleryImageInput") || document.getElementById("image");
let files = Array.from(input?.files || []);
if (files.length === 0) return;

await addImagesToGalleryProduct(files);
if (input) input.value = "";
closeGalleryMenus();
}

function triggerGalleryImagePicker(event) {
event.stopPropagation();
let input = document.getElementById("galleryImageInput") || document.getElementById("image");
if (!input) return;
input.click();
}

async function handleGalleryImagePick(event) {
event.stopPropagation();
let files = Array.from(event.target?.files || []);
if (files.length === 0) return;

await addImagesToGalleryProduct(files);
event.target.value = "";
closeGalleryMenus();
}

function addProductImgFromMenu(event) {
event.stopPropagation();

let picker = document.createElement("input");
picker.type = "file";
picker.accept = "image/*";
picker.multiple = true;
picker.onchange = async function () {
let files = Array.from(picker.files || []);
if (files.length === 0) return;
await addImagesToGalleryProduct(files);
closeGalleryMenus();
};

picker.click();
}

function deleteGalleryImage(productId, imageIndex) {
let product = products.find(p => p.id === productId);
if (!product || !Array.isArray(product.images)) return;

product.images = product.images.filter((_, idx) => idx !== imageIndex);
saveData();
loadGallery();
}

function toggleGalleryMenu(event, imageIndex) {
event.stopPropagation();
let menu = document.getElementById(`galleryMenu-${imageIndex}`);
if (!menu) return;

let allMenus = document.querySelectorAll(".gallery-menu");
allMenus.forEach(m => {
if (m !== menu) m.classList.remove("active");
});

menu.classList.toggle("active");
}

function closeGalleryMenus() {
let allMenus = document.querySelectorAll(".gallery-menu");
allMenus.forEach(menu => menu.classList.remove("active"));
closeGalleryToolsMenu();
}

function toggleGalleryToolsMenu(event) {
event.stopPropagation();
let menu = document.getElementById("galleryToolsMenu");
if (!menu) return;

let allMenus = document.querySelectorAll(".gallery-menu");
allMenus.forEach(m => m.classList.remove("active"));
menu.classList.toggle("active");
}

function closeGalleryToolsMenu() {
let menu = document.getElementById("galleryToolsMenu");
if (!menu) return;
menu.classList.remove("active");
}

function loadGallery() {
let container = document.getElementById("galleryContainer");
let title = document.getElementById("galleryTitle");
let toolsWrap = document.getElementById("galleryToolsMenuWrap");
if (!container || !title) return;

if (!galleryMenuListenerAdded) {
document.addEventListener("click", closeGalleryMenus);
galleryMenuListenerAdded = true;
}

let id = getGalleryProductId();
let product = products.find(p => p.id === id);
let params = new URLSearchParams(window.location.search);
let canEditGallery = params.get("edit") === "1";

if (toolsWrap) {
toolsWrap.style.display = canEditGallery ? "block" : "none";
if (!canEditGallery) closeGalleryToolsMenu();
}

if (!product) {
title.innerText = "Product not found";
container.innerHTML = "";
return;
}

title.innerText = `${product.name} - Image Folder`;

if (!product.images || product.images.length === 0) {
container.innerHTML = "<p>No images found.</p>";
return;
}

container.innerHTML = product.images
.map((img, index) => `
<div class="gallery-item">
${canEditGallery ? `<button class="gallery-menu-toggle" onclick="toggleGalleryMenu(event, ${index})" aria-label="Open menu">&#8942;</button>
<div class="gallery-menu" id="galleryMenu-${index}">
<button class="folder-btn gallery-menu-delete" onclick="addProductImgFromMenu(event)">Add Product Img</button>
<button class="delete-btn gallery-menu-delete" onclick="deleteGalleryImage(${id},${index})">Delete</button>
</div>` : ""}
<img src="${img}" class="gallery-img" alt="${product.name}" onclick="openImage('${img}')">
</div>
`)
.join("");

}

function loadHisab() {
let summary = document.getElementById("hisabSummary");
let container = document.getElementById("hisabContainer");
if (!summary || !container) return;

if (!Array.isArray(sales) || sales.length === 0) {
summary.innerHTML = '<div class="product-card"><h3>No Sales Yet</h3><p>Products page se Sell button use karein.</p></div>';
container.innerHTML = "";
return;
}

let totalProfit = sales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
let totalSoldQty = sales.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);

summary.innerHTML = `
<div class="product-card">
<h3>Total Sold Quantity</h3>
<p>${totalSoldQty}</p>
</div>
<div class="product-card">
<h3>Total Profit</h3>
<p>${totalProfit.toFixed(2)}</p>
</div>
`;

let grouped = {};
sales.forEach(s => {
if (!grouped[s.productId]) {
grouped[s.productId] = {
name: s.name,
qty: 0,
profit: 0
};
}
grouped[s.productId].qty += Number(s.quantity) || 0;
grouped[s.productId].profit += Number(s.profit) || 0;
});

container.innerHTML = Object.values(grouped)
.map(item => `
<div class="product-card">
<h3>${item.name}</h3>
<p>Sold Quantity: ${item.qty}</p>
<p>Total Profit: ${item.profit.toFixed(2)}</p>
</div>
`)
.join("");
}

function changeQty(id, val) {
products = products.map(p => {
if (p.id === id) {
p.quantity += val;
if (p.quantity < 0) p.quantity = 0;
}
return p;
});
saveData();
loadProducts();
}

function deleteProduct(id) {
products = products.filter(p => p.id !== id);
saveData();
if (editingProductId === id) editingProductId = null;
loadProducts();
}

function loadDashboard() {
if (document.getElementById("totalProducts"))
document.getElementById("totalProducts").innerText = products.length;
}

function loadRacks() {
let container = document.getElementById("rackContainer");
if (!container) return;

container.innerHTML = "";
let racks = {};

products.forEach(p => {
if (!racks[p.rack]) racks[p.rack] = [];
racks[p.rack].push(p);
});

for (let rack in racks) {
container.innerHTML += `<div class="product-card">
<h3>${rack}</h3>
${racks[rack].map(p => `<p>${p.name} (${p.quantity}) - Shelf ${p.shelf}</p>`).join("")}
</div>`;
}
}

