/* ==========================================================
   EXPLORE PAGE SCRIPT - Travel Planner
   ========================================================== */

/*
 * SAMPLE_PLACES: DỮ LIỆU MẪU tạm thời để hoàn thiện giao diện,
 * lấy theo đúng các mục đã có trong thiết kế Figma (Hotel/Places/Cafe/Restaurant).
 * ⚠️ Đây KHÔNG phải dữ liệu thật — địa chỉ/mô tả đang để dạng placeholder
 * vì ảnh Figma không đọc rõ được chi tiết. Khi có MySQL, hàm loadPlaces()
 * bên dưới sẽ được đổi sang fetch("explore.php?action=list_places") thay vì
 * dùng mảng này.
 */

const CATEGORY_LABELS = {
  hotel: "Hotel",
  attraction: "Places",
  cafe: "Cafe",
  restaurant: "Restaurant"
};
let places = [];
let currentFilter = "all";
let currentKeyword = "";
let favoriteIds = new Set(); // trạng thái favorite tạm thời phía client
let selectedPlaceIdForTrip = null;
let selectedTripIdForDay = null;

document.addEventListener("DOMContentLoaded", () => {
  loadPlaces();
  initSearch();
  initFilterDropdown();
  initAddToTripModal();
  initItemMenuPopup();
  initProfileButton();
});

function loadPlaces() {
    const container = document.getElementById("exploreResults");

    container.innerHTML =
        '<p class="placeholder-text">Đang tải dữ liệu...</p>';

    fetch("explore.php?action=list_places")
        .then(async (res) => {
            const text = await res.text();

            console.log("HTTP status:", res.status);
            console.log("Response:", text);

            if (!res.ok) {
                throw new Error(
                    "HTTP " + res.status + ": " + text
                );
            }

            try {
                return JSON.parse(text);
            } catch (error) {
                throw new Error(
                    "PHP không trả JSON hợp lệ: " + text
                );
            }
        })
        .then((data) => {
            console.log("Places data:", data);

            places = data.places || [];

            renderPlaces();
        })
        .catch((error) => {
            console.error("Load places error:", error);

            container.innerHTML =
                '<p class="placeholder-text">' +
                'Không thể tải dữ liệu địa điểm.<br>' +
                error.message +
                '</p>';
        });
}
/* ---------------- Profile (đồng bộ với home.js) ---------------- */
function initProfileButton() {
  const btn = document.getElementById("profileBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    fetch("login.php?action=check_login")
      .then((res) => res.json())
      .then((data) => {
        window.location.href = data.logged_in ? "profile.html" : "login.html";
      })
      .catch(() => { window.location.href = "login.html"; });
  });
}

/* ---------------- Render danh sách theo filter + search ---------------- */
function renderPlaces() {
    const container = document.getElementById("exploreResults");

    if (!container) {
        console.error("Không tìm thấy #exploreResults");
        return;
    }

    const keyword = currentKeyword.trim().toLowerCase();

    const categories = currentFilter === "all"
        ? ["hotel", "attraction", "cafe", "restaurant"]
        : [currentFilter];

    container.innerHTML = "";

    let totalResults = 0;

    categories.forEach((cat) => {
        const items = places.filter((place) => {
            const matchCategory = place.type === cat;

            const searchText = (
                (place.name || "") + " " +
                (place.address || "") + " " +
                (place.description || "")
            ).toLowerCase();

            const matchKeyword =
                keyword.length === 0 ||
                searchText.includes(keyword);

            return matchCategory && matchKeyword;
        });

        if (items.length === 0) {
            return;
        }

        totalResults += items.length;

        const group = document.createElement("div");
        group.className = "category-group";

        const title = document.createElement("h3");
        title.className = "category-title";
        title.textContent = CATEGORY_LABELS[cat] || cat;

        const list = document.createElement("div");
        list.className = "place-list";

        items.forEach((place) => {
            list.appendChild(buildPlaceItem(place));
        });

        group.appendChild(title);
        group.appendChild(list);

        container.appendChild(group);
    });

    if (totalResults === 0) {
        const noResults = document.createElement("p");
        noResults.className = "no-results";
        noResults.textContent = "No results found";

        container.appendChild(noResults);
    }
}

/* ---------------- Tạo 1 item địa điểm ---------------- */
function buildPlaceItem(place) {
    const item = document.createElement("div");
    item.className = "place-item";
    item.dataset.id = place.id;

    const isFavorite = favoriteIds.has(Number(place.id));

    item.innerHTML = `
        <img
            class="place-thumb"
            src="${escapeHtml(place.image_url || '')}"
            alt="${escapeHtml(place.name)}"
        >

        <div class="place-info">
            <div class="place-name">
                ${escapeHtml(place.name)}
            </div>

            <div class="place-address">
                ${escapeHtml(place.address || '')}
            </div>

            ${
                place.price
                    ? `<div class="place-price">
                        ${escapeHtml(place.price)}
                       </div>`
                    : ""
            }

            ${
                place.description
                    ? `<div class="place-description">
                        ${escapeHtml(place.description)}
                       </div>`
                    : ""
            }
        </div>

        <div class="place-actions">
            <button class="add-trip-btn" type="button">
                +
            </button>

            <button
                class="favorite-btn ${isFavorite ? "active" : ""}"
                type="button"
            >
                ♡
            </button>

            <button class="menu-btn" type="button">
                ⋮
            </button>
        </div>
    `;

    item.querySelector(".place-thumb")
        .addEventListener("click", () => {
            goToPlaceDetail(place.id);
        });

    item.querySelector(".place-info")
        .addEventListener("click", () => {
            goToPlaceDetail(place.id);
        });

    item.querySelector(".add-trip-btn")
        .addEventListener("click", (e) => {
            e.stopPropagation();
            openAddToTripModal(place.id);
        });

    item.querySelector(".favorite-btn")
        .addEventListener("click", (e) => {
            e.stopPropagation();
            toggleFavorite(Number(place.id), e.currentTarget);
        });

    item.querySelector(".menu-btn")
        .addEventListener("click", (e) => {
            e.stopPropagation();
            openItemMenuPopup(place.id, e.currentTarget);
        });

    return item;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  let stars = "★".repeat(full);
  if (hasHalf) stars += "☆";
  while (stars.length < 5) stars += "☆";
  return stars;
}

function goToPlaceDetail(placeId) {
  window.location.href = "place-detail.html?id=" + encodeURIComponent(placeId);
}

/* ---------------- Search ---------------- */
function initSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");

  function doSearch() {
    currentKeyword = input.value;
    renderPlaces();
  }

  btn.addEventListener("click", doSearch);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
  input.addEventListener("input", doSearch);
}

/* ---------------- Filter dropdown ---------------- */
function initFilterDropdown() {
  const toggleBtn = document.getElementById("filterToggleBtn");
  const menu = document.getElementById("filterMenu");
  const label = document.getElementById("filterToggleLabel");
  const options = menu.querySelectorAll(".filter-option");

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      options.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      currentFilter = opt.dataset.filter;
      label.textContent = opt.textContent;
      menu.classList.add("hidden");
      renderPlaces();
    });
  });

  document.addEventListener("click", () => menu.classList.add("hidden"));
}

/* ---------------- Favorite (xử lý client-side, TODO nối PHP sau) ---------------- */
function toggleFavorite(placeId, btnEl) {
  if (favoriteIds.has(placeId)) {
    favoriteIds.delete(placeId);
    btnEl.classList.remove("active");
  } else {
    favoriteIds.add(placeId);
    btnEl.classList.add("active");
  }

  /*
   * TODO: Khi có MySQL/PHP, gọi API để lưu favorite theo user, ví dụ:
   *
   * fetch("explore.php?action=toggle_favorite", {
   *   method: "POST",
   *   headers: { "Content-Type": "application/x-www-form-urlencoded" },
   *   body: "place_id=" + encodeURIComponent(placeId)
   * });
   */
}

/* ---------------- Add to Trip modal ---------------- */
function initAddToTripModal() {
  const modal = document.getElementById("addToTripModal");
  const closeBtn = document.getElementById("closeAddToTripModal");
  const backBtn = document.getElementById("backToTripStep");

  closeBtn.addEventListener("click", () => closeAddToTripModal());
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeAddToTripModal();
  });
  backBtn.addEventListener("click", () => showTripStep());
}

function openAddToTripModal(placeId) {
  selectedPlaceIdForTrip = placeId;
  document.getElementById("addToTripModal").classList.remove("hidden");
  showTripStep();
  loadUserTrips();
}

function closeAddToTripModal() {
  document.getElementById("addToTripModal").classList.add("hidden");
  selectedPlaceIdForTrip = null;
  selectedTripIdForDay = null;
}

function showTripStep() {
  document.getElementById("tripStep").classList.remove("hidden");
  document.getElementById("dayStep").classList.add("hidden");
}

function showDayStep() {
  document.getElementById("tripStep").classList.add("hidden");
  document.getElementById("dayStep").classList.remove("hidden");
}

/* Lấy danh sách Trip của user đang đăng nhập, gọi từ explore.php */
function loadUserTrips() {
  const container = document.getElementById("tripListContainer");
  const createBtn = document.getElementById("createNewTripBtn");
  container.innerHTML = '<p class="placeholder-text">Đang tải danh sách trip...</p>';
  createBtn.classList.add("hidden");
  createBtn.onclick = () => { window.location.href = "new-trip.html"; };

  fetch("explore.php?action=get_trips")
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) {
        container.innerHTML = '<p class="placeholder-text">Vui lòng <a href="login.html">đăng nhập</a> để thêm vào Trip.</p>';
        return;
      }

      if (!data.trips || data.trips.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Bạn chưa có Trip nào.</p>';
        createBtn.classList.remove("hidden");
        return;
      }

      container.innerHTML = "";
      data.trips.forEach((trip) => {
        const btn = document.createElement("button");
        btn.className = "modal-list-item";
        btn.type = "button";
        btn.textContent = trip.title;
        btn.addEventListener("click", () => {
          selectedTripIdForDay = trip.id;
          loadTripDays(trip.id);
        });
        container.appendChild(btn);
      });
    })
    .catch(() => {
      container.innerHTML = '<p class="placeholder-text">Không thể tải danh sách trip (cần kết nối MySQL).</p>';
    });
}

/* Lấy danh sách Day của 1 Trip, gọi từ explore.php */
function loadTripDays(tripId) {
  const container = document.getElementById("dayListContainer");
  container.innerHTML = '<p class="placeholder-text">Đang tải danh sách ngày...</p>';
  showDayStep();

  fetch("explore.php?action=get_days&trip_id=" + encodeURIComponent(tripId))
    .then((res) => res.json())
    .then((data) => {
      if (!data.days || data.days.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Trip này chưa có ngày nào. Vui lòng thêm ngày trong trang chi tiết trip trước.</p>';
        return;
      }

      container.innerHTML = "";
      data.days.forEach((day) => {
        const btn = document.createElement("button");
        btn.className = "modal-list-item";
        btn.type = "button";
        btn.textContent = "Day " + day.day_number + " - " + day.day_date;
        btn.addEventListener("click", () => addPlaceToDay(day.id));
        container.appendChild(btn);
      });
    })
    .catch(() => {
      container.innerHTML = '<p class="placeholder-text">Không thể tải danh sách ngày (cần kết nối MySQL).</p>';
    });
}

/* Thêm địa điểm vào 1 ngày cụ thể, gọi từ explore.php */
function addPlaceToDay(dayId) {
  fetch("explore.php?action=add_to_trip", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "place_id=" + encodeURIComponent(selectedPlaceIdForTrip) + "&day_id=" + encodeURIComponent(dayId)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        closeAddToTripModal();
      } else {
        alert(data.message || "Không thể thêm địa điểm vào trip.");
      }
    })
    .catch(() => {
      alert("Không thể kết nối máy chủ (cần kết nối MySQL).");
    });
}

/* ---------------- Item menu popup (Share / Delete) ---------------- */
function initItemMenuPopup() {
  const popup = document.getElementById("itemMenuPopup");

  popup.querySelectorAll(".item-menu-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const placeId = popup.dataset.placeId;

      if (action === "share") {
        sharePlace(placeId);
      } else if (action === "delete") {
        /*
         * TODO: chưa rõ "Delete" ở đây nghĩa là xoá gì (xoá khỏi favorite,
         * xoá khỏi trip, hay chỉ dành cho admin xoá địa điểm). Cần bạn xác
         * nhận thêm trước khi nối logic thật.
         */
        alert("Chức năng Delete cần được xác nhận rõ ý nghĩa trước khi hoàn thiện.");
      }

      popup.classList.add("hidden");
    });
  });

  document.addEventListener("click", () => popup.classList.add("hidden"));
}

function openItemMenuPopup(placeId, anchorEl) {
  const popup = document.getElementById("itemMenuPopup");
  popup.dataset.placeId = placeId;

  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = (rect.bottom + window.scrollY + 4) + "px";
  popup.style.left = (rect.left + window.scrollX - 80) + "px";
  popup.classList.remove("hidden");
}

function sharePlace(placeId) {
  const url = window.location.origin + "/place-detail.html?id=" + encodeURIComponent(placeId);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("Đã sao chép liên kết địa điểm."));
  } else {
    alert(url);
  }
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
