/* ==========================================================
   HOME PAGE SCRIPT - Travel Planner
   Toàn bộ dữ liệu hiển thị lấy từ home.php (MySQL).
   File này KHÔNG chứa dữ liệu mẫu, chỉ chứa logic render + action.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initSearch();
  loadRecommend();
  loadUpcomingTrips();
  loadPopularGuides();
  initPlanNewTripButton();
  initProfileButton();
});

/* ---------------- Search ---------------- */
function initSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  function doSearch() {
    const keyword = searchInput.value.trim();
    if (keyword.length === 0) return;
    window.location.href = "explore.html?q=" + encodeURIComponent(keyword);
  }

  searchBtn.addEventListener("click", doSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doSearch();
  });
}

/* ---------------- Recommend ---------------- */
function loadRecommend() {
  const container = document.getElementById("recommendList");
  const placeholder = document.getElementById("recommendPlaceholder");

  fetch("home.php?action=recommend")
    .then((res) => res.json())
    .then((data) => {
      container.innerHTML = "";

      if (!data.items || data.items.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Chưa có địa điểm gợi ý.</p>';
        return;
      }

      data.items.forEach((item) => {
        const card = document.createElement("a");
        card.href = "place-detail.html?id=" + encodeURIComponent(item.id);
        card.className = "place-card";
        card.dataset.id = item.id;

        card.innerHTML = `
          <img src="${item.image}" alt="${escapeHtml(item.title)}">
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description || "")}</p>
        `;

        container.appendChild(card);
      });
    })
    .catch(() => {
      if (placeholder) placeholder.textContent = "Không thể tải dữ liệu.";
    });
}

/* ---------------- Upcoming Trips ---------------- */
function loadUpcomingTrips() {
  const container = document.getElementById("upcomingList");

  fetch("home.php?action=upcoming")
    .then((res) => res.json())
    .then((data) => {
      container.innerHTML = "";

      if (!data.logged_in) {
        container.innerHTML =
          '<p class="login-required">Vui lòng <a href="login.html">đăng nhập</a> để xem chuyến đi của bạn.</p>';
        return;
      }

      if (!data.trips || data.trips.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Bạn chưa có chuyến đi nào. Nhấn "+ Plan new trip" để bắt đầu.</p>';
        return;
      }

      data.trips.forEach((trip) => {
        const card = document.createElement("div");
        card.className = "trip-card";
        card.dataset.id = trip.id;

        card.innerHTML = `
          <img src="${trip.cover_image}" alt="${escapeHtml(trip.title)}">
          <h3>${escapeHtml(trip.title)}</h3>
          <div class="trip-meta">
            <span>${escapeHtml(trip.date_range || "")}</span>
            <span>&middot;</span>
            <span>${escapeHtml(String(trip.members_count || 1))} người</span>
          </div>
        `;

        card.addEventListener("click", () => {
          window.location.href = "trip-detail.html?id=" + encodeURIComponent(trip.id);
        });

        container.appendChild(card);
      });
    })
    .catch(() => {
      container.innerHTML = '<p class="placeholder-text">Không thể tải dữ liệu.</p>';
    });
}

/* ---------------- Popular Guides ---------------- */
function loadPopularGuides() {
  const container = document.getElementById("popularList");

  fetch("home.php?action=popular")
    .then((res) => res.json())
    .then((data) => {
      container.innerHTML = "";

      if (!data.guides || data.guides.length === 0) {
        container.innerHTML =
          '<p class="placeholder-text">Chưa có Travel Guide nào.</p>';
        return;
      }

      data.guides.forEach((guide) => {
        const item = document.createElement("div");
        item.className = "popular-item";
        item.dataset.id = guide.id;

        item.innerHTML = `
          <img
            class="trip-thumb"
            src="${escapeHtml(guide.cover_image || "")}"
            alt="${escapeHtml(guide.title)}"
          >

          <div class="popular-info">
            <h3>${escapeHtml(guide.title)}</h3>

            <p class="popular-sub">
              ${escapeHtml(guide.region || "")}
            </p>

            <div class="popular-creator">
              <img
                src="${escapeHtml(guide.creator_avatar || "")}"
                alt="${escapeHtml(guide.creator_name || "")}"
              >
              <span>${escapeHtml(guide.creator_name || "")}</span>
            </div>

            <div class="popular-meta">
              ${Number(guide.views || 0)} views
              ·
              ${Number(guide.like_count || 0)} likes
            </div>
          </div>

          <div class="popular-actions">
            <button class="share-btn" type="button" aria-label="Share">
              <img src="images/icon-share.png" alt="">
            </button>

            <button
              class="like-btn ${guide.liked_by_user ? "liked" : ""}"
              type="button"
              aria-label="Like"
            >
              <img src="images/icon-heart.png" alt="">
            </button>
          </div>
        `;

        const openGuide = () => {
          window.location.href =
            "guide-detail.php?id=" + encodeURIComponent(guide.id);
        };

        item.querySelector(".popular-info")
          .addEventListener("click", openGuide);

        item.querySelector(".trip-thumb")
          .addEventListener("click", openGuide);

        item.querySelector(".like-btn")
          .addEventListener("click", (e) => {
            e.stopPropagation();
            toggleGuideLike(guide.id, e.currentTarget);
          });

        item.querySelector(".share-btn")
          .addEventListener("click", (e) => {
            e.stopPropagation();

            const url =
              window.location.origin +
              "/guide-detail.php?id=" +
              encodeURIComponent(guide.id);

            if (navigator.clipboard) {
              navigator.clipboard
                .writeText(url)
                .then(() => alert("Đã sao chép liên kết Guide."));
            } else {
              alert(url);
            }
          });

        container.appendChild(item);
      });
    })
    .catch((error) => {
      console.error("Load popular guides error:", error);
      container.innerHTML =
        '<p class="placeholder-text">Không thể tải dữ liệu.</p>';
    });
}

/* ---------------- Like / Unlike ---------------- */
function toggleGuideLike(guideId, btnEl) {
  fetch("home.php?action=toggle_like_guide", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "guide_id=" + encodeURIComponent(guideId)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) {
        window.location.href = "login.html";
        return;
      }

      if (data.success) {
        btnEl.classList.toggle("liked", data.liked);
      } else {
        alert(data.message || "Không thể Like Guide.");
      }
    })
    .catch((error) => {
      console.error("Toggle guide like error:", error);
    });
}

/* ---------------- Plan new trip ---------------- */
function initPlanNewTripButton() {
  const btn = document.getElementById("planNewTripBtn");
  btn.addEventListener("click", () => {
    window.location.href = "new-trip.html";
  });
}

/* ---------------- Profile ---------------- */
/* ---------------- Profile ---------------- */
function initProfileButton() {
  const btn = document.getElementById("profileBtn");

  btn.addEventListener("click", async () => {
    try {
      const response = await fetch("home.php?action=check_login");

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();

      if (data.logged_in) {
        // Đã đăng nhập → vào Profile
        window.location.href = "profile.html";
      } else {
        // Chưa đăng nhập → vào Login
        window.location.href = "login.html";
      }

    } catch (error) {
      console.error("Check login error:", error);

      // Không kiểm tra được session → cho user đăng nhập
      window.location.href = "login.html";
    }
  });
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
