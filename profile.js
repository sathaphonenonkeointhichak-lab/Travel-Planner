/* PROFILE PAGE SCRIPT - Travel Planner
*/


let currentUser = null;
let isLoggedIn = false;

document.addEventListener("DOMContentLoaded", () => {
  checkLoginAndLoadProfile();
  initHeaderProfileMenu();
  initTabs();
  initEditProfile();
  initShareProfileModal();
  initCardMenuPopupGlobalClose();
});

/* ---------------- Đăng nhập + load profile ---------------- */
function checkLoginAndLoadProfile() {
  fetch("profile.php?action=get_profile")
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) {
        window.location.href = "login.html";
        return;
      }

      isLoggedIn = true;
      currentUser = data.user;

      if (!currentUser) {
        throw new Error("Không có dữ liệu user.");
      }

      renderProfileCard();
      loadMyTrips();
      loadMyGuides();
      loadFavorites();
    })
    .catch((error) => {
      console.error("Load profile error:", error);
      window.location.href = "login.html";
    });
}
function loadFavorites() {
  loadFavoritePlaces();
  loadFavoriteGuides();
}

function renderProfileCard() {
  document.getElementById("profileAvatar").src = currentUser.avatar;
  document.getElementById("headerAvatar").src = currentUser.avatar;
  document.getElementById("profileName").textContent = currentUser.name;
  document.getElementById("profileEmail").textContent = currentUser.email;
  document.getElementById("followersCount").textContent = currentUser.followers;
  document.getElementById("followingCount").textContent = currentUser.following;
}

/* ---------------- Header dropdown: My Profile / Setting / Logout ---------------- */
function initHeaderProfileMenu() {
  const btn = document.getElementById("profileBtn");
  const menu = document.getElementById("profileHeaderMenu");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });
  document.addEventListener("click", () => menu.classList.add("hidden"));

  document.getElementById("settingLink").addEventListener("click", (e) => {
    e.preventDefault();
    alert("Trang Setting sẽ được làm ở bước sau.");
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    fetch("profile.php?action=logout", { method: "POST" })
      .then(() => { window.location.href = "home.html"; })
      .catch(() => { window.location.href = "home.html"; });
  });
}

/* ---------------- Tabs ---------------- */
function initTabs() {
  const tabs = document.querySelectorAll(".profile-tab");
  const panels = {
    trips: document.getElementById("tripsPanel"),
    guides: document.getElementById("guidesPanel"),
    favorites: document.getElementById("favoritesPanel")
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      Object.values(panels).forEach((p) => p.classList.add("hidden"));
      panels[tab.dataset.tab].classList.remove("hidden");
    });
  });
}

/* ---------------- Load từng tab (gọi PHP thật) ---------------- */
function loadMyTrips() {
  fetch("profile.php?action=get_my_trips")
    .then((res) => res.json())
    .then((data) => renderCardsGrid("tripsGrid", data.trips || SAMPLE_MY_TRIPS, "trip"))
    .catch(() => renderCardsGrid("tripsGrid", SAMPLE_MY_TRIPS, "trip"));
}

function loadMyGuides() {
  fetch("profile.php?action=get_my_guides")
    .then((res) => res.json())
    .then((data) => renderCardsGrid("guidesGrid", data.guides || SAMPLE_MY_GUIDES, "guide"))
    .catch(() => renderCardsGrid("guidesGrid", SAMPLE_MY_GUIDES, "guide"));
}

function loadFavoritePlaces() {
  fetch("profile.php?action=get_favorite_places")
    .then((res) => res.json())
    .then((data) => {
      renderCardsGrid(
        "favoritePlacesGrid",
        data.places || [],
        "favorite-place"
      );
    })
    .catch((error) => {
      console.error("Load favorite places error:", error);
      renderCardsGrid("favoritePlacesGrid", [], "favorite-place");
    });
}
function loadFavoriteGuides() {
  fetch("profile.php?action=get_favorite_guides")
    .then((res) => res.json())
    .then((data) => {
      renderCardsGrid(
        "favoriteGuidesGrid",
        data.guides || [],
        "favorite"
      );
    })
    .catch((error) => {
      console.error("Load favorite guides error:", error);
      renderCardsGrid("favoriteGuidesGrid", [], "favorite");
    });
}

/* ---------------- Render card cho từng tab ---------------- */
function renderCardsGrid(containerId, items, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="placeholder-text">Chưa có dữ liệu.</p>';
    return;
  }

  items.forEach((item) => container.appendChild(buildCard(item, type)));
}

function buildCard(item, type) {
  const card = document.createElement("div");
  card.className = "pf-card";
  card.dataset.id = item.id;
  card.dataset.type = type;

  if (type === "trip") {
    card.innerHTML = `
      <div class="pf-card-cover-wrapper">
        <img src="${item.cover}" alt="${escapeHtml(item.title)}">
        <button type="button" class="pf-card-menu-btn" aria-label="More">&#8942;</button>
      </div>
      <div class="pf-card-body">
        <div class="pf-card-title">${escapeHtml(item.title)}</div>
        <div class="pf-card-meta">
          <img class="pf-avatar" src="${item.memberAvatar}" alt="">
          <span>${escapeHtml(item.dateRange)} &middot; ${item.placesCount} places</span>
        </div>
      </div>
    `;
    card.querySelector(".pf-card-cover-wrapper").addEventListener("click", () => {
      window.location.href = "trip.html?id=" + encodeURIComponent(item.id);
    });
    card.querySelector(".pf-card-title").addEventListener("click", () => {
      window.location.href = "trip.html?id=" + encodeURIComponent(item.id);
    });
  } else {
    // guide (của mình) hoặc favorite (guide đã like)
    card.innerHTML = `
      <div class="pf-card-cover-wrapper">
        <img src="${item.cover}" alt="${escapeHtml(item.title)}">
        <button type="button" class="pf-card-menu-btn" aria-label="More">&#8942;</button>
      </div>
      <div class="pf-card-body">
        <div class="pf-card-title">${escapeHtml(item.title)}</div>
        <div class="pf-card-stats">
          <span><img src="images/icon-eye.png" alt=""> ${formatCount(item.views)}</span>
          <span><img src="images/icon-heart.png" alt=""> ${formatCount(item.likes)}</span>
        </div>
      </div>
    `;
    card.querySelector(".pf-card-cover-wrapper").addEventListener("click", () => {
      window.location.href = "guide-detail.php?id=" + encodeURIComponent(item.id);
    });
    card.querySelector(".pf-card-title").addEventListener("click", () => {
      window.location.href = "guide-detail.php?id=" + encodeURIComponent(item.id);
    });
  }

  card.querySelector(".pf-card-menu-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openCardMenuPopup(item, type, e.currentTarget);
  });

  return card;
}

function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n || 0);
}

/* ---------------- Menu "..." trên mỗi card ---------------- */
function initCardMenuPopupGlobalClose() {
  document.addEventListener("click", () => {
    document.getElementById("cardMenuPopup").classList.add("hidden");
  });
}

function openCardMenuPopup(item, type, anchorEl) {
  const popup = document.getElementById("cardMenuPopup");
  let optionsHtml = '<button type="button" class="item-menu-option" data-action="share">Share</button>';

  if (type === "trip") {
    optionsHtml += '<button type="button" class="item-menu-option danger" data-action="delete-trip">Delete</button>';
  } else if (type === "guide") {
    optionsHtml += '<button type="button" class="item-menu-option" data-action="edit-guide">Edit</button>';
    optionsHtml += '<button type="button" class="item-menu-option danger" data-action="delete-guide">Delete</button>';
  } else if (type === "favorite") {
    optionsHtml += '<button type="button" class="item-menu-option danger" data-action="unfavorite-guide">Remove from favorites</button>';
  }

  popup.innerHTML = optionsHtml;
  popup.querySelectorAll(".item-menu-option").forEach((btn) => {
    btn.addEventListener("click", () => handleCardMenuAction(btn.dataset.action, item, type));
  });

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 4) + "px";
  popup.style.left = (rect.left + window.scrollX - 90) + "px";
  popup.classList.remove("hidden");
}

function handleCardMenuAction(action, item, type) {
  document.getElementById("cardMenuPopup").classList.add("hidden");

  if (action === "share") {
    const path = type === "trip" ? "trip.html?id=" : "guide-detail.php?id=";
    const url = window.location.origin + "/" + path + encodeURIComponent(item.id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => alert("Đã sao chép liên kết."));
    } else {
      alert(url);
    }
    return;
  }

  if (action === "delete-trip") {
    if (!confirm('Xoá trip "' + item.title + '"?')) return;
    fetch("profile.php?action=delete_trip", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "trip_id=" + encodeURIComponent(item.id)
    })
      .then((res) => res.json())
      .then((data) => { if (data.success) loadMyTrips(); else alert(data.message || "Không thể xoá trip."); })
      .catch(() => loadMyTrips()); // fallback demo: coi như đã xoá, load lại (vẫn mẫu)
    return;
  }

  if (action === "edit-guide") {
    window.location.href = "guide-detail.php?id=" + encodeURIComponent(item.id) + "&edit=1";
    return;
  }

  if (action === "delete-guide") {
    if (!confirm('Xoá guide "' + item.title + '"?')) return;
    fetch("profile.php?action=delete_guide", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "guide_id=" + encodeURIComponent(item.id)
    })
      .then((res) => res.json())
      .then((data) => { if (data.success) loadMyGuides(); else alert(data.message || "Không thể xoá guide."); })
      .catch(() => loadMyGuides());
    return;
  }

  if (action === "unfavorite-guide") {
    fetch("profile.php?action=toggle_favorite_guide", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "guide_id=" + encodeURIComponent(item.id)
    })
      .then(() => loadFavoriteGuides())
      .catch(() => loadFavoriteGuides());
    return;
  }
}

/* ---------------- Edit Profile ---------------- */
function initEditProfile() {
  const editBtn = document.getElementById("editProfileBtn");
  const form = document.getElementById("editProfileForm");
  const cancelBtn = document.getElementById("cancelProfileEditBtn");
  const saveBtn = document.getElementById("saveProfileBtn");

  editBtn.addEventListener("click", () => {
    document.getElementById("editNameInput").value = currentUser.name;
    document.getElementById("editAvatarInput").value = currentUser.avatar;
    document.getElementById("editProfileError").classList.add("hidden");
    form.classList.remove("hidden");
  });

  cancelBtn.addEventListener("click", () => form.classList.add("hidden"));

  saveBtn.addEventListener("click", () => {
    const name = document.getElementById("editNameInput").value.trim();
    const avatar = document.getElementById("editAvatarInput").value.trim();
    const errorEl = document.getElementById("editProfileError");

    if (!name) {
      errorEl.textContent = "Tên hiển thị không được để trống.";
      errorEl.classList.remove("hidden");
      return;
    }
    errorEl.classList.add("hidden");

    fetch("profile.php?action=update_profile", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "name=" + encodeURIComponent(name) + "&avatar=" + encodeURIComponent(avatar || "images/avatar-placeholder.png")
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          currentUser.name = name;
          currentUser.avatar = avatar || "images/avatar-placeholder.png";
          renderProfileCard();
          form.classList.add("hidden");
        } else {
          errorEl.textContent = data.message || "Không thể lưu thay đổi.";
          errorEl.classList.remove("hidden");
        }
      })
      .catch(() => {
        // Fallback demo khi chưa có DB
        currentUser.name = name;
        currentUser.avatar = avatar || "images/avatar-placeholder.png";
        renderProfileCard();
        form.classList.add("hidden");
      });
  });
}

/* ---------------- Share Profile ---------------- */
function initShareProfileModal() {
  const modal = document.getElementById("shareProfileModal");
  document.getElementById("shareProfileBtn").addEventListener("click", () => {
    document.getElementById("shareProfileLinkInput").value =
      window.location.origin + "/profile.html?user=" + encodeURIComponent(currentUser.id);
    modal.classList.remove("hidden");
  });
  document.getElementById("closeShareProfileModal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  document.getElementById("copyShareProfileLinkBtn").addEventListener("click", () => {
    const input = document.getElementById("shareProfileLinkInput");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value).then(() => alert("Đã sao chép liên kết."));
    } else {
      input.select();
      document.execCommand("copy");
    }
  });
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
