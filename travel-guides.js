/* ==========================================================
   TRAVEL GUIDES PAGE SCRIPT - Travel Planner
   ========================================================== */

/*
 * Danh sách Travel Guide giờ lấy từ MySQL thật qua loadGuides(),
 * không còn dùng mảng mẫu viết cứng nữa.
 */
let allGuides = [];
let currentGuideFilter = "all";
let currentGuideKeyword = "";
let isLoggedIn = false;
let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
  checkLoginStatus();
  loadGuides();
  initGuideSearch();
  initGuideFilter();
  initGuideMenuPopup();
});

/* ---------------- Lấy dữ liệu Guide thật từ MySQL ---------------- */
function loadGuides() {
  const grid = document.getElementById("guidesGrid");
  grid.innerHTML = '<p class="placeholder-text">Đang tải danh sách guide...</p>';

  fetch("travel-guides.php?action=get_guides")
    .then((res) => res.json())
    .then((data) => {
      allGuides = (data.guides || []).map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description || "",
        author: g.author_name,
        author_id: g.author_id,
        avatar: g.author_avatar || "images/avatar-placeholder.png",
        cover: g.cover_image || "images/guide-placeholder.jpg",
        views: g.views || 0,
        likes: g.likes || 0,
        liked: !!g.liked_by_user,
        region: g.region
      }));
      renderGuides();
    })
    .catch((err) => {
      console.error("Không thể tải danh sách Travel Guides:", err);
      grid.innerHTML = '<p class="placeholder-text">Không thể tải dữ liệu. Kiểm tra Console (F12) để xem lỗi chi tiết.</p>';
    });
}

/* ---------------- Đăng nhập ---------------- */
function checkLoginStatus() {
  fetch("travel-guides.php?action=check_login")
    .then((res) => res.json())
    .then((data) => {
      isLoggedIn = !!data.logged_in;
      currentUserId = data.user_id || null;
    })
    .catch(() => {
      isLoggedIn = false;
      currentUserId = null;
    });
}

function showLoginRequiredToast() {
  const toast = document.getElementById("loginRequiredToast");
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

/* ---------------- Render danh sách ---------------- */
function renderGuides() {
  const grid = document.getElementById("guidesGrid");
  const noResults = document.getElementById("noGuidesResult");
  const keyword = currentGuideKeyword.trim().toLowerCase();

  const filtered = allGuides.filter((g) => {
    const matchRegion = currentGuideFilter === "all" || g.region === currentGuideFilter;
    const matchKeyword =
      keyword.length === 0 ||
      g.title.toLowerCase().includes(keyword) ||
      g.region.toLowerCase().includes(keyword) ||
      (g.description || "").toLowerCase().includes(keyword);
    return matchRegion && matchKeyword;
  });

  grid.innerHTML = "";

  if (filtered.length === 0) {
    noResults.classList.remove("hidden");
    return;
  }

  noResults.classList.add("hidden");
  filtered.forEach((guide) => grid.appendChild(buildGuideCard(guide)));
}

function buildGuideCard(guide) {
  const card = document.createElement("div");
  card.className = "guide-card";
  card.dataset.id = guide.id;

  card.innerHTML = `
    <div class="guide-cover-wrapper">
      <img class="guide-cover" src="${guide.cover}" alt="${escapeHtml(guide.title)}">
      <button type="button" class="guide-card-menu-btn" aria-label="More options">&#8942;</button>
    </div>
    <div class="guide-title">${escapeHtml(guide.title)}</div>
    <div class="guide-card-footer">
      <div class="guide-author">
        <img src="${guide.avatar}" alt="">
        <span>${escapeHtml(guide.author)}</span>
      </div>
      <div class="guide-stats">
        <span><img src="images/icon-eye.png" alt=""> ${formatCount(guide.views)}</span>
        <button type="button" class="guide-like-btn ${guide.liked ? "liked" : ""}">
          <img src="images/icon-heart.png" alt=""> <span class="like-count">${formatCount(guide.likes)}</span>
        </button>
      </div>
    </div>
  `;

  card.querySelector(".guide-cover-wrapper").addEventListener("click", () => goToGuideDetails(guide.id));
  card.querySelector(".guide-title").addEventListener("click", () => goToGuideDetails(guide.id));

  card.querySelector(".guide-card-menu-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openGuideMenuPopup(guide, e.currentTarget);
  });

  card.querySelector(".guide-like-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleGuideLike(guide, e.currentTarget);
  });

  return card;
}

function goToGuideDetails(guideId) {
  window.location.href = "guide-detail.php?id=" + encodeURIComponent(guideId);
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}

/* ---------------- Search (tên / khu vực / nội dung) ---------------- */
function initGuideSearch() {
  const input = document.getElementById("guideSearchInput");
  const btn = document.getElementById("guideSearchBtn");

  function doSearch() {
    currentGuideKeyword = input.value;
    renderGuides();
  }

  btn.addEventListener("click", doSearch);
  input.addEventListener("input", doSearch);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
}

/* ---------------- Filter (All / HCM / Vung Tau / Binh Duong) ---------------- */
function initGuideFilter() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      currentGuideFilter = pill.dataset.filter;
      renderGuides();
    });
  });
}

/* ---------------- Like (yêu cầu đăng nhập, gọi PHP thật) ---------------- */
function toggleGuideLike(guide, btnEl) {
  fetch("travel-guides.php?action=toggle_like_guide", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "guide_id=" + encodeURIComponent(guide.id)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) {
        showLoginRequiredToast();
        return;
      }
      if (data.success) {
        guide.liked = data.liked;
        guide.likes += data.liked ? 1 : -1;
        renderGuides();
      }
    })
    .catch((err) => {
      console.error("Lỗi khi Like guide:", err);
    });
}

/* ---------------- Menu "..." : Share (luôn có), Edit/Delete (chỉ khi là guide của mình) ---------------- */
function initGuideMenuPopup() {
  document.addEventListener("click", () => {
    document.getElementById("guideMenuPopup").classList.add("hidden");
  });
}

function openGuideMenuPopup(guide, anchorEl) {
  const popup = document.getElementById("guideMenuPopup");
  const isOwner = isLoggedIn && currentUserId !== null && guide.author_id === currentUserId;

  popup.innerHTML = `
    <button type="button" class="item-menu-option" data-action="share">Share</button>
    ${isOwner ? `
      <button type="button" class="item-menu-option" data-action="edit">Edit</button>
      <button type="button" class="item-menu-option danger" data-action="delete">Delete</button>
    ` : ""}
  `;

  popup.querySelectorAll(".item-menu-option").forEach((btn) => {
    btn.addEventListener("click", () => handleGuideMenuAction(btn.dataset.action, guide));
  });

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 4) + "px";
  popup.style.left = (rect.left + window.scrollX - 70) + "px";
  popup.classList.remove("hidden");
}

function handleGuideMenuAction(action, guide) {
  document.getElementById("guideMenuPopup").classList.add("hidden");

  if (action === "share") {
    shareGuide(guide.id);
  } else if (action === "edit") {
    // Nội dung chi tiết để sửa sẽ làm ở trang Traveler Guide Details (ngoài phạm vi trang này)
    window.location.href = "guide-detail.php?id=" + encodeURIComponent(guide.id) + "&edit=1";
  } else if (action === "delete") {
    deleteGuide(guide);
  }
}

function shareGuide(guideId) {
  const url = window.location.origin + "/guide-detail.php?id=" + encodeURIComponent(guideId);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("Đã sao chép liên kết guide."));
  } else {
    alert(url);
  }
}

function deleteGuide(guide) {
  const confirmed = confirm('Bạn có chắc muốn xoá Travel Guide "' + guide.title + '"?');
  if (!confirmed) return;

  fetch("travel-guides.php?action=delete_guide", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "guide_id=" + encodeURIComponent(guide.id)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) {
        showLoginRequiredToast();
        return;
      }
      if (data.success) {
        removeGuideFromList(guide.id);
      } else {
        alert(data.message || "Không thể xoá Travel Guide.");
      }
    })
    .catch((err) => {
      console.error("Lỗi khi xoá guide:", err);
      alert("Không thể kết nối máy chủ. Kiểm tra Console (F12).");
    });
}

function removeGuideFromList(guideId) {
  const index = allGuides.findIndex((g) => g.id === guideId);
  if (index !== -1) allGuides.splice(index, 1);
  renderGuides();
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}