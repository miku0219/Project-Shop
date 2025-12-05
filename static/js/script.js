// 🔹 假資料，之後可改成後端提供
const products = [
  {
    id: 1,
    name: "商品 A1",
    category: "A",
    price: 300,
    desc: "A1 商品介紹...",
    img: "",
  },
  {
    id: 2,
    name: "商品 B1",
    category: "B",
    price: 500,
    desc: "B1 商品介紹...",
    img: "",
  },
  {
    id: 3,
    name: "商品 C1",
    category: "C",
    price: 250,
    desc: "C1 商品介紹...",
    img: "",
  },
];

const productList = document.getElementById("productList");

// 🔹 渲染商品
function loadProducts(list) {
  productList.innerHTML = "";
  list.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td><img src="${p.img}" class="product-img"></td>
            <td class="product-name" data-id="${p.id}" style="color:blue;cursor:pointer;">
                ${p.name}
            </td>
            <td>${p.category}</td>
            <td>${p.price}</td>
            <td><button class="addCartBtn" data-id="${p.id}">加入</button></td>
        `;
    productList.appendChild(tr);
  });
}
loadProducts(products);

/* 🔹 商品簡介 Modal */
const modal = document.getElementById("productModal");
const modalClose = document.getElementById("modalClose");

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("product-name")) {
    const id = e.target.dataset.id;
    const p = products.find((x) => x.id == id);

    document.getElementById("modalName").innerText = p.name;
    document.getElementById("modalDesc").innerText = p.desc;
    modal.style.display = "block";
  }
});
modalClose.onclick = () => (modal.style.display = "none");

/* 🔹 加入購物車 Modal */
const cartModal = document.getElementById("cartModal");
const cartClose = document.getElementById("cartClose");
let currentProduct = null;

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("addCartBtn")) {
    const id = e.target.dataset.id;
    currentProduct = products.find((x) => x.id == id);

    document.getElementById("cartProductName").innerText = currentProduct.name;
    document.getElementById("subtotal").innerText = currentProduct.price;

    cartModal.style.display = "block";
  }
});

cartClose.onclick = () => (cartModal.style.display = "none");

// 🔹 小計更新
document.getElementById("quantityInput").addEventListener("input", function () {
  const qty = Number(this.value);
  document.getElementById("subtotal").innerText = qty * currentProduct.price;
});

// 🔹 確定加入購物車（未串後端）
document.getElementById("confirmAdd").onclick = () => {
  alert("已加入購物車！（未串後端）");
  cartModal.style.display = "none";
};

// ====== 篩選功能 ======
const filterCategory = document.getElementById("filterCategory");
const filterPrice = document.getElementById("filterPrice");
const applyFilterBtn = document.getElementById("applyFilter");

applyFilterBtn.addEventListener("click", () => {
  const category = filterCategory.value;
  const priceLimit = Number(filterPrice.value);

  let filtered = products;

  // ▲ 依種類篩選
  if (category !== "") {
    filtered = filtered.filter((p) => p.category === category);
  }

  // ▲ 依價格篩選
  if (priceLimit > 0) {
    filtered = filtered.filter((p) => p.price <= priceLimit);
  }

  // ▲ 渲染結果
  loadProducts(filtered);
});
