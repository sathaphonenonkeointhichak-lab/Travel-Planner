/* ==========================================================
   PLACE DETAIL PAGE SCRIPT - Travel Planner
   ========================================================== */

/*
 * SAMPLE_PLACES_DETAIL: dữ liệu mẫu CŨ, KHÔNG còn được dùng nữa kể từ khi
 * loadPlaceDetail() đã đổi sang gọi place-detail.php?action=get_place thật.
 * Giữ lại object này chỉ để tham khảo cấu trúc UI khi cần debug offline.
 */
const SAMPLE_PLACES_DETAIL = {
  h1: {
    id: "h1",
    type: "hotel",
    name: "La Siesta Premium Saigon",
    rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)",
    shortInfo: "Khách sạn 5 sao ngay trung tâm Quận 1.",
    price: "Từ 1.500.000đ / đêm",
    about: "Mô tả chi tiết về La Siesta Premium Saigon (nội dung mẫu, sẽ được cập nhật dữ liệu thật sau).",
    images: ["images/hotel-1.jpg", "images/hotel-1-thumb1.jpg", "images/hotel-1-thumb2.jpg"],
    info: {
      "Amenities": "Hồ bơi, Spa, Nhà hàng, Wifi miễn phí (mẫu)",
      "Room information": "Deluxe, Superior, Suite (mẫu)"
    }
  },
  h2: {
    id: "h2", type: "hotel", name: "Riverside Hotel In Saigon", rating: 4.5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Khách sạn view sông.",
    price: "Từ 1.200.000đ / đêm",
    about: "Mô tả chi tiết về Riverside Hotel In Saigon (nội dung mẫu).",
    images: ["images/hotel-2.jpg"],
    info: { "Amenities": "Wifi, Nhà hàng (mẫu)", "Room information": "Standard, Deluxe (mẫu)" }
  },
  h3: {
    id: "h3", type: "hotel", name: "Liberty Hotel Saigon Riverview", rating: 4,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Khách sạn gần chợ Bến Thành.",
    price: "Từ 900.000đ / đêm",
    about: "Mô tả chi tiết về Liberty Hotel Saigon Riverview (nội dung mẫu).",
    images: ["images/hotel-3.jpg"],
    info: { "Amenities": "Wifi, Gym (mẫu)", "Room information": "Standard (mẫu)" }
  },
  p1: {
    id: "p1", type: "place", name: "Nguyen Hue Walking Street", rating: 4.5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Phố đi bộ trung tâm Sài Gòn.",
    price: "Miễn phí",
    about: "Mô tả chi tiết về Nguyen Hue Walking Street (nội dung mẫu).",
    images: ["images/place-1.jpg"],
    info: { "Opening hours": "Cả ngày (mẫu)", "Ticket price": "Miễn phí" }
  },
  p2: {
    id: "p2", type: "place", name: "Saigon Central Post Office", rating: 4.5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Kiến trúc Pháp cổ nổi tiếng.",
    price: "Miễn phí",
    about: "Mô tả chi tiết về Saigon Central Post Office (nội dung mẫu).",
    images: ["images/place-2.jpg"],
    info: { "Opening hours": "7:00 - 19:00 (mẫu)", "Ticket price": "Miễn phí" }
  },
  p3: {
    id: "p3", type: "place", name: "The Independence Palace", rating: 4.5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Di tích lịch sử quan trọng.",
    price: "65.000đ / vé",
    about: "Mô tả chi tiết về The Independence Palace (nội dung mẫu).",
    images: ["images/place-3.jpg"],
    info: { "Opening hours": "7:30 - 17:00 (mẫu)", "Ticket price": "65.000đ (mẫu)" }
  },
  c1: {
    id: "c1", type: "cafe", name: "Nghia Cafe", rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Cafe sân vườn yên tĩnh.",
    price: "30.000đ - 60.000đ",
    about: "Mô tả chi tiết về Nghia Cafe (nội dung mẫu).",
    images: ["images/cafe-1.jpg"],
    info: { "Type of cafe": "Sân vườn (mẫu)", "Price range": "30.000đ - 60.000đ (mẫu)" }
  },
  c2: {
    id: "c2", type: "cafe", name: "The Cafe Apartment", rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Cafe nổi tiếng trong chung cư cổ.",
    price: "35.000đ - 70.000đ",
    about: "Mô tả chi tiết về The Cafe Apartment (nội dung mẫu).",
    images: ["images/cafe-2.jpg"],
    info: { "Type of cafe": "Chung cư cổ (mẫu)", "Price range": "35.000đ - 70.000đ (mẫu)" }
  },
  c3: {
    id: "c3", type: "cafe", name: "Cafe Mien Thoi Moc", rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Cafe phong cách vintage.",
    price: "25.000đ - 55.000đ",
    about: "Mô tả chi tiết về Cafe Mien Thoi Moc (nội dung mẫu).",
    images: ["images/cafe-3.jpg"],
    info: { "Type of cafe": "Vintage (mẫu)", "Price range": "25.000đ - 55.000đ (mẫu)" }
  },
  r1: {
    id: "r1", type: "restaurant", name: "Bonham Princess - Luxurious Dining Cruise", rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Nhà hàng du thuyền cao cấp.",
    price: "800.000đ - 1.500.000đ / người",
    about: "Mô tả chi tiết về Bonham Princess (nội dung mẫu).",
    images: ["images/restaurant-1.jpg"],
    info: { "Cuisine": "Âu - Á (mẫu)", "Price range": "800.000đ - 1.500.000đ (mẫu)" }
  },
  r2: {
    id: "r2", type: "restaurant", name: "Legacy Cafe - Belgian Beer & Coffee Lounge", rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Không gian bia Bỉ độc đáo.",
    price: "150.000đ - 400.000đ / người",
    about: "Mô tả chi tiết về Legacy Cafe (nội dung mẫu).",
    images: ["images/restaurant-2.jpg"],
    info: { "Cuisine": "Bỉ - Âu (mẫu)", "Price range": "150.000đ - 400.000đ (mẫu)" }
  },
  r3: {
    id: "r3", type: "restaurant", name: "Hoang's Kitchen - Vietnamese Cuisine & Vegan Food 3", rating: 5,
    address: "(địa chỉ mẫu - Q.1, TP.HCM)", shortInfo: "Món Việt & món chay.",
    price: "80.000đ - 250.000đ / người",
    about: "Mô tả chi tiết về Hoang's Kitchen (nội dung mẫu).",
    images: ["images/restaurant-3.jpg"],
    info: { "Cuisine": "Việt Nam - Chay (mẫu)", "Price range": "80.000đ - 250.000đ (mẫu)" }
  }
};

const INFO_LABELS_BY_TYPE = {
  hotel: ["Amenities", "Room information"],
  restaurant: ["Cuisine", "Price range"],
  cafe: ["Type of cafe", "Price range"],
  attraction: ["Opening hours", "Ticket price"]
};

/*
 * SAMPLE_REVIEWS: dữ liệu review mẫu theo đúng ví dụ trong yêu cầu,
 * gắn với địa điểm "h1" (La Siesta) để minh hoạ giao diện.
 * isOwner = false vì đây là review của user khác, không cho sửa/xoá.
 */
const SAMPLE_REVIEWS = {
  h1: [
    {
      id: "rev1",
      userName: "User A",
      avatar: "images/avatar-placeholder.png",
      rating: 5,
      comment: "Very nice place and the food was great.",
      date: "September 5, 2026",
      isOwner: false
    },
    {
      id: "rev2",
      userName: "User B",
      avatar: "images/avatar-placeholder.png",
      rating: 4,
      comment: "Good place to visit.",
      date: "September 3, 2026",
      isOwner: false
    }
  ]
};

let currentPlace = null;
let currentReviews = [];
let isLoggedIn = false;
let editingReviewId = null;
let selectedStarValue = 0;
let selectedPlaceIdForTrip = null;

document.addEventListener("DOMContentLoaded", () => {
  loadPlaceDetail();
  initBackButton();
  initFavoriteButton();
  initAddToTripModal();
  initReviewForm();
  checkLoginStatus();
  initProfileButton();
});

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

/* ---------------- Load dữ liệu địa điểm thật từ MySQL ---------------- */
let currentPlaceId = null;

function loadPlaceDetail() {
  const params = new URLSearchParams(window.location.search);
  currentPlaceId = params.get("id");

  const main = document.querySelector("main");

  if (!currentPlaceId) {
    main.innerHTML = '<p class="placeholder-text">Không tìm thấy địa điểm (thiếu id trên URL).</p>';
    return;
  }

  fetch("place-detail.php?action=get_place&id=" + encodeURIComponent(currentPlaceId))
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) throw new Error("HTTP " + res.status + ": " + text);
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error("PHP không trả JSON hợp lệ: " + text);
      }
    })
    .then((data) => {
      if (!data.place) {
        main.innerHTML = '<p class="placeholder-text">Không tìm thấy địa điểm.</p>';
        return;
      }

      currentPlace = data.place;

      renderPlaceInfo();
      renderGallery();
      renderInfoSection();
      applyFavoriteState();
      loadReviews();
    })
    .catch((error) => {
      console.error("Load place detail error:", error);
      main.innerHTML =
        '<p class="placeholder-text">Không thể tải dữ liệu địa điểm.<br>' +
        escapeHtml(error.message) + '</p>';
    });
}

/* ---------------- Load review thật từ MySQL ---------------- */
function loadReviews() {
  const list = document.getElementById("reviewList");
  const summary = document.getElementById("reviewsSummary");
  summary.innerHTML = '<span class="review-count">Đang tải review...</span>';
  list.innerHTML = "";

  fetch("place-detail.php?action=get_reviews&place_id=" + encodeURIComponent(currentPlaceId))
    .then((res) => res.json())
    .then((data) => {
      currentReviews = data.reviews || [];
      renderReviews();
    })
    .catch((error) => {
      console.error("Load reviews error:", error);
      summary.innerHTML = '<span class="review-count">Không thể tải review.</span>';
    });
}

/* ---------------- Render thông tin chính ---------------- */
function renderPlaceInfo() {
  document.getElementById("placeName").textContent = currentPlace.name;
  document.getElementById("placeRating").innerHTML =
    `<span class="rating-stars">${renderStars(currentPlace.rating)}</span><span class="rating-number">${currentPlace.rating}</span>`;
  document.getElementById("placeAddress").textContent = currentPlace.address;
  document.getElementById("placeShortInfo").textContent = currentPlace.shortInfo;
  document.getElementById("placePrice").textContent = currentPlace.price || "";
  document.title = "Travel Planner - " + currentPlace.name;
}

/* ---------------- Gallery ---------------- */
function renderGallery() {
  const mainImage = document.getElementById("mainImage");
  const thumbList = document.getElementById("thumbnailList");

  mainImage.src = currentPlace.images[0];
  mainImage.alt = currentPlace.name;

  thumbList.innerHTML = "";
  currentPlace.images.forEach((src, index) => {
    const thumb = document.createElement("img");
    thumb.src = src;
    thumb.alt = currentPlace.name + " " + (index + 1);
    if (index === 0) thumb.classList.add("active");

    thumb.addEventListener("click", () => {
      mainImage.src = src;
      thumbList.querySelectorAll("img").forEach((el) => el.classList.remove("active"));
      thumb.classList.add("active");
    });

    thumbList.appendChild(thumb);
  });
}

/* ---------------- Information section (khác nhau theo loại) ---------------- */
function renderInfoSection() {
  const infoTitle = document.getElementById("infoTitle");
  const infoList = document.getElementById("infoList");
  const aboutDescription = document.getElementById("aboutDescription");

  aboutDescription.textContent = currentPlace.about;

  const labels = INFO_LABELS_BY_TYPE[currentPlace.type] || [];
  infoTitle.textContent = "Information";

  infoList.innerHTML = "";
  labels.forEach((label) => {
    const value = currentPlace.info[label] || "";
    const row = document.createElement("div");
    row.className = "info-row";
    row.innerHTML = `<span class="info-label">${escapeHtml(label)}:</span><span class="info-value">${escapeHtml(value)}</span>`;
    infoList.appendChild(row);
  });
}

/* ---------------- Reviews ---------------- */
function renderReviews() {
  const summary = document.getElementById("reviewsSummary");
  const list = document.getElementById("reviewList");

  const count = currentReviews.length;
  const avg = count > 0
    ? (currentReviews.reduce((sum, r) => sum + r.rating, 0) / count)
    : 0;

  summary.innerHTML = count > 0
    ? `<span class="avg-stars">${renderStars(avg)}</span><span class="avg-rating">${avg.toFixed(1)}</span><span class="review-count">(${count} reviews)</span>`
    : `<span class="review-count">Chưa có review nào.</span>`;

  list.innerHTML = "";
  currentReviews.forEach((review) => list.appendChild(buildReviewItem(review)));
}

function buildReviewItem(review) {
  const item = document.createElement("div");
  item.className = "review-item";
  item.dataset.id = review.id;

  item.innerHTML = `
    <img class="review-avatar" src="${review.avatar}" alt="${escapeHtml(review.userName)}">
    <div class="review-body">
      <div class="review-header">
        <span class="review-username">${escapeHtml(review.userName)}</span>
        <span class="review-stars">${renderStars(review.rating)}</span>
        <span class="review-date">${escapeHtml(review.date)}</span>
      </div>
      <p class="review-comment">${escapeHtml(review.comment)}</p>
      ${review.isOwner ? `
        <div class="review-owner-actions">
          <button type="button" class="edit-review-btn">Edit Review</button>
          <button type="button" class="delete-review-btn">Delete Review</button>
        </div>
      ` : ""}
    </div>
  `;

  if (review.isOwner) {
    item.querySelector(".edit-review-btn").addEventListener("click", () => startEditReview(review));
    item.querySelector(".delete-review-btn").addEventListener("click", () => deleteReview(review.id));
  }

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

/* ---------------- Đăng nhập (kiểm tra qua PHP) ---------------- */
function checkLoginStatus() {
  fetch("place-detail.php?action=check_login")
    .then((res) => res.json())
    .then((data) => {
      isLoggedIn = !!data.logged_in;
      updateWriteReviewVisibility();
    })
    .catch(() => {
      isLoggedIn = false;
      updateWriteReviewVisibility();
    });
}

function updateWriteReviewVisibility() {
  document.getElementById("writeReviewArea").classList.toggle("hidden", !isLoggedIn);
  document.getElementById("loginRequiredMsg").classList.toggle("hidden", isLoggedIn);
}

/* ---------------- Review form ---------------- */
function initReviewForm() {
  const writeBtn = document.getElementById("writeReviewBtn");
  const form = document.getElementById("reviewForm");
  const cancelBtn = document.getElementById("cancelReviewBtn");
  const starButtons = document.querySelectorAll(".star-input-btn");
  const errorEl = document.getElementById("reviewError");

  writeBtn.addEventListener("click", () => {
    editingReviewId = null;
    selectedStarValue = 0;
    document.getElementById("reviewComment").value = "";
    updateStarInputUI();
    errorEl.classList.add("hidden");
    form.classList.remove("hidden");
    writeBtn.classList.add("hidden");
  });

  cancelBtn.addEventListener("click", () => closeReviewForm());

  starButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedStarValue = parseInt(btn.dataset.value, 10);
      updateStarInputUI();
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitReview();
  });
}

function updateStarInputUI() {
  document.querySelectorAll(".star-input-btn").forEach((btn) => {
    const value = parseInt(btn.dataset.value, 10);
    btn.classList.toggle("selected", value <= selectedStarValue);
  });
}

function closeReviewForm() {
  document.getElementById("reviewForm").classList.add("hidden");
  document.getElementById("writeReviewBtn").classList.remove("hidden");
  editingReviewId = null;
}

function submitReview() {
  const comment = document.getElementById("reviewComment").value.trim();
  const errorEl = document.getElementById("reviewError");

  if (selectedStarValue < 1) {
    errorEl.textContent = "Vui lòng chọn số sao đánh giá.";
    errorEl.classList.remove("hidden");
    return;
  }

  if (comment.length === 0) {
    errorEl.textContent = "Vui lòng nhập nội dung review.";
    errorEl.classList.remove("hidden");
    return;
  }

  errorEl.classList.add("hidden");

  const action = editingReviewId ? "edit_review" : "add_review";
  const bodyParts = [
    "rating=" + encodeURIComponent(selectedStarValue),
    "comment=" + encodeURIComponent(comment)
  ];
  if (editingReviewId) {
    bodyParts.push("review_id=" + encodeURIComponent(editingReviewId));
  } else {
    bodyParts.push("place_id=" + encodeURIComponent(currentPlaceId));
  }

  fetch("place-detail.php?action=" + action, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: bodyParts.join("&")
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        errorEl.textContent = data.message || "Không thể lưu review.";
        errorEl.classList.remove("hidden");
        return;
      }
      closeReviewForm();
      loadReviews();
    })
    .catch(() => {
      errorEl.textContent = "Không thể kết nối máy chủ (cần kết nối MySQL).";
      errorEl.classList.remove("hidden");
    });
}

function startEditReview(review) {
  editingReviewId = review.id;
  selectedStarValue = review.rating;
  document.getElementById("reviewComment").value = review.comment;
  updateStarInputUI();
  document.getElementById("reviewError").classList.add("hidden");
  document.getElementById("reviewForm").classList.remove("hidden");
  document.getElementById("writeReviewBtn").classList.add("hidden");
}

function deleteReview(reviewId) {
  const confirmed = window.confirm("Bạn có chắc muốn xoá review này?");
  if (!confirmed) return;

  fetch("place-detail.php?action=delete_review", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "review_id=" + encodeURIComponent(reviewId)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        loadReviews();
      } else {
        alert(data.message || "Không thể xoá review.");
      }
    })
    .catch(() => {
      alert("Không thể kết nối máy chủ (cần kết nối MySQL).");
    });
}

function formatTodayVN() {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  return months[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear();
}

/* ---------------- Back button ---------------- */
function initBackButton() {
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "explore.html";
  });
}

/* ---------------- Favorite (gọi API thật) ---------------- */
function applyFavoriteState() {
  const btn = document.getElementById("favoriteBtn");
  btn.classList.toggle("active", !!currentPlace.is_favorited);
}

function initFavoriteButton() {
  const btn = document.getElementById("favoriteBtn");
  btn.addEventListener("click", () => {
    fetch("place-detail.php?action=toggle_favorite", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "place_id=" + encodeURIComponent(currentPlaceId)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.require_login) {
          window.location.href = "login.html";
          return;
        }
        if (data.success) {
          currentPlace.is_favorited = data.favorited;
          btn.classList.toggle("active", data.favorited);
        }
      })
      .catch(() => {
        alert("Không thể kết nối máy chủ (cần kết nối MySQL).");
      });
  });
}

/* ---------------- Add to Trip modal ---------------- */
function initAddToTripModal() {
  const modal = document.getElementById("addToTripModal");
  const closeBtn = document.getElementById("closeAddToTripModal");
  const backBtn = document.getElementById("backToTripStep");
  const addBtn = document.getElementById("addToTripBtn");

  addBtn.addEventListener("click", () => openAddToTripModal());
  closeBtn.addEventListener("click", () => closeAddToTripModal());
  modal.addEventListener("click", (e) => { if (e.target === modal) closeAddToTripModal(); });
  backBtn.addEventListener("click", () => showTripStep());
}

function openAddToTripModal() {
  selectedPlaceIdForTrip = currentPlace.id;
  document.getElementById("addToTripModal").classList.remove("hidden");
  showTripStep();
  loadUserTrips();
}

function closeAddToTripModal() {
  document.getElementById("addToTripModal").classList.add("hidden");
}

function showTripStep() {
  document.getElementById("tripStep").classList.remove("hidden");
  document.getElementById("dayStep").classList.add("hidden");
  document.getElementById("addedStep").classList.add("hidden");
}

function showDayStep() {
  document.getElementById("tripStep").classList.add("hidden");
  document.getElementById("dayStep").classList.remove("hidden");
  document.getElementById("addedStep").classList.add("hidden");
}

function showAddedStep() {
  document.getElementById("tripStep").classList.add("hidden");
  document.getElementById("dayStep").classList.add("hidden");
  document.getElementById("addedStep").classList.remove("hidden");
}

function loadUserTrips() {
  const container = document.getElementById("tripListContainer");
  const createBtn = document.getElementById("createNewTripBtn");
  container.innerHTML = '<p class="placeholder-text">Đang tải danh sách trip...</p>';
  createBtn.classList.add("hidden");
  createBtn.onclick = () => { window.location.href = "new-trip.html"; };

  fetch("place-detail.php?action=get_trips")
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
        btn.addEventListener("click", () => loadTripDays(trip.id));
        container.appendChild(btn);
      });
    })
    .catch(() => {
      container.innerHTML = '<p class="placeholder-text">Không thể tải danh sách trip (cần kết nối MySQL).</p>';
    });
}

function loadTripDays(tripId) {
  const container = document.getElementById("dayListContainer");
  container.innerHTML = '<p class="placeholder-text">Đang tải danh sách ngày...</p>';
  showDayStep();

  fetch("place-detail.php?action=get_days&trip_id=" + encodeURIComponent(tripId))
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

function addPlaceToDay(dayId) {
  fetch("place-detail.php?action=add_to_trip", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "place_id=" + encodeURIComponent(selectedPlaceIdForTrip) + "&day_id=" + encodeURIComponent(dayId)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAddedStep();
      } else {
        alert(data.message || "Không thể thêm địa điểm vào trip.");
      }
    })
    .catch(() => {
      alert("Không thể kết nối máy chủ (cần kết nối MySQL).");
    });
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}