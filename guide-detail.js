/* ==========================================================
   GUIDE DETAIL PAGE SCRIPT - Travel Planner
   Dữ liệu 100% thật từ guide-detail.php - không còn SAMPLE_GUIDE_DETAILS.
   ========================================================== */

const TYPE_LABELS = { hotel: "Hotel", cafe: "Cafe", restaurant: "Restaurant", attraction: "Place" };

let guideId = null;
let guideData = null;
let guideDays = [];
let comments = [];
let isLoggedIn = false;
let currentUserId = null;
let isOwner = false;
let selectedGuideDayIdForAddPlace = null;
let selectedItemIdForSave = null;

document.addEventListener("DOMContentLoaded", () => {
  guideId = (typeof GUIDE_ID !== "undefined" && GUIDE_ID) ? GUIDE_ID : new URLSearchParams(window.location.search).get("id");

  checkLoginStatus();
  loadGuide();
  initSaveToTripModal();
  initAddPlaceToGuideModal();
  initShareModal();
  initCommentForm();
  initEditGuideArea();
  initAddDayBtn();
});

/* ---------------- Đăng nhập ---------------- */
function checkLoginStatus() {
  fetch("guide-detail.php?action=check_login")
    .then((res) => res.json())
    .then((data) => {
      isLoggedIn = !!data.logged_in;
      currentUserId = data.user_id || null;
      updateCommentFormVisibility();
    })
    .catch((err) => {
      console.error("check_login lỗi:", err);
      isLoggedIn = false;
    });
}

/* ---------------- Load Guide (thật từ MySQL) ---------------- */
function loadGuide() {
  if (!guideId) {
    document.querySelector("main").innerHTML = '<p class="placeholder-text">Thiếu id guide trên URL.</p>';
    return;
  }

  fetch("guide-detail.php?action=get_guide&id=" + encodeURIComponent(guideId))
    .then((res) => res.json())
    .then((data) => {
      if (!data.guide) {
        document.querySelector("main").innerHTML = '<p class="placeholder-text">Không tìm thấy Travel Guide.</p>';
        return;
      }
      guideData = data.guide;
      guideDays = data.days || [];
      comments = data.comments || [];
      isOwner = !!guideData.is_owner;

      renderCoverAndTitle();
      renderAuthorRow();
      renderAboutSection();
      renderItinerary();
      renderComments();
      toggleOwnerOnlyControls();
    })
    .catch((err) => {
      console.error("get_guide lỗi:", err);
      document.querySelector("main").innerHTML = '<p class="placeholder-text">Không thể tải dữ liệu Guide (kiểm tra kết nối MySQL).</p>';
    });
}

function toggleOwnerOnlyControls() {
  document.querySelectorAll(".owner-only").forEach((el) => el.classList.toggle("hidden", !isOwner));
  document.getElementById("followBtn").classList.toggle("hidden", isOwner);
}

/* ---------------- Cover + Title ---------------- */
function renderCoverAndTitle() {
  document.getElementById("guideCover").src = guideData.cover_image || "images/trip-cover-placeholder.jpg";
  document.getElementById("guideTitleLarge").textContent = guideData.title;
  document.getElementById("guideShortInfo").textContent = guideData.description || "";
  document.title = "Travel Planner - " + guideData.title;
}

/* ---------------- Author row ---------------- */
function renderAuthorRow() {
  document.getElementById("authorAvatar").src = guideData.author.avatar || "images/icon-profile.png";
  document.getElementById("authorName").textContent = guideData.author.name;
  document.getElementById("authorDate").textContent = formatDate(guideData.created_at);
  document.getElementById("guideViews").textContent = formatCount(guideData.views);
  document.getElementById("guideLikesCount").textContent = formatCount(guideData.likes);
  document.getElementById("commentCountLabel").textContent = guideData.comment_count;

  const followBtn = document.getElementById("followBtn");
  followBtn.textContent = guideData.is_following ? "Following" : "Follow";
  followBtn.classList.toggle("following", guideData.is_following);
  followBtn.onclick = () => toggleFollow();

  const likeBtn = document.getElementById("guideLikeBtnMain");
  likeBtn.classList.toggle("liked", guideData.liked_by_user);
  likeBtn.onclick = () => toggleLike();

  document.getElementById("shareGuideBtn").onclick = () => openShareModal();
}

function formatCount(n) {
  n = n || 0;
  if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
  return String(n);
}

function formatDate(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr.replace(" ", "T"));
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
}

/* ---------------- Follow / Like ---------------- */
function toggleFollow() {
  fetch("guide-detail.php?action=toggle_follow", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "author_id=" + encodeURIComponent(guideData.author.id)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) { alert("Vui lòng đăng nhập để Follow."); return; }
      if (data.success) { guideData.is_following = data.following; renderAuthorRow(); }
      else if (data.message) { alert(data.message); }
    })
    .catch((err) => console.error("toggle_follow lỗi:", err));
}

function toggleLike() {
  fetch("guide-detail.php?action=toggle_like_guide", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "guide_id=" + encodeURIComponent(guideData.id)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) { alert("Vui lòng đăng nhập để Like."); return; }
      if (data.success) {
        guideData.liked_by_user = data.liked;
        guideData.likes += data.liked ? 1 : -1;
        renderAuthorRow();
      }
    })
    .catch((err) => console.error("toggle_like_guide lỗi:", err));
}

/* ---------------- About ---------------- */
function renderAboutSection() {
  document.getElementById("aboutContent").textContent = guideData.description || "Chưa có mô tả cho guide này.";
}

/* ---------------- Edit Guide (chỉ tác giả) ---------------- */
function initEditGuideArea() {
  const toggleBtn = document.getElementById("editGuideToggleBtn");
  const area = document.getElementById("editGuideArea");

  toggleBtn.addEventListener("click", () => {
    document.getElementById("editTitleInput").value = guideData.title;
    document.getElementById("editDescriptionInput").value = guideData.description || "";
    area.classList.remove("hidden");
  });

  document.getElementById("cancelGuideEditBtn").addEventListener("click", () => area.classList.add("hidden"));

  document.getElementById("saveGuideEditBtn").addEventListener("click", () => {
    const title = document.getElementById("editTitleInput").value.trim();
    const description = document.getElementById("editDescriptionInput").value.trim();
    if (!title) { alert("Tên guide không được để trống."); return; }

    fetch("guide-detail.php?action=update_guide", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "guide_id=" + encodeURIComponent(guideData.id) + "&title=" + encodeURIComponent(title) + "&description=" + encodeURIComponent(description)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          guideData.title = title;
          guideData.description = description;
          renderCoverAndTitle();
          renderAboutSection();
          area.classList.add("hidden");
        } else {
          alert(data.message || "Không thể lưu thay đổi.");
        }
      })
      .catch((err) => { console.error("update_guide lỗi:", err); alert("Không thể kết nối máy chủ."); });
  });
}

/* ---------------- Itinerary ---------------- */
function renderItinerary() {
  const container = document.getElementById("itineraryDaysList");
  container.innerHTML = "";

  if (guideDays.length === 0) {
    container.innerHTML = '<p class="placeholder-text">Guide này chưa có lịch trình.</p>';
    return;
  }

  guideDays.forEach((day) => {
    const block = document.createElement("div");
    block.className = "day-block";
    block.dataset.dayId = day.id;

    const header = document.createElement("div");
    header.className = "day-block-header-row";
    header.innerHTML = `
      <span class="day-block-title">Day ${day.day_number}</span>
      <div class="day-block-actions">
        <button type="button" class="btn-secondary-sm owner-only ${isOwner ? "" : "hidden"} add-place-to-day-btn">+ Add Place</button>
        <button type="button" class="delete-day-btn owner-only ${isOwner ? "" : "hidden"}" aria-label="Delete day">&times;</button>
      </div>
    `;
    block.appendChild(header);

    if (!day.items || day.items.length === 0) {
      block.innerHTML += '<p class="placeholder-text">Chưa có địa điểm nào trong ngày này.</p>';
    } else {
      day.items.forEach((item) => block.appendChild(buildItineraryPlaceCard(item)));
    }

    header.querySelector(".add-place-to-day-btn").addEventListener("click", () => openAddPlaceToGuideModal(day.id));
    header.querySelector(".delete-day-btn").addEventListener("click", () => deleteDay(day.id));

    container.appendChild(block);
  });
}

function buildItineraryPlaceCard(item) {
  const card = document.createElement("div");
  card.className = "itinerary-place-card";
  card.dataset.itemId = item.id;

  card.innerHTML = `
    <div class="ip-body">
      <div class="ip-top-row">
        <span class="ip-name">${escapeHtml(item.title)}<span class="ip-type-tag">${TYPE_LABELS[item.place_type || item.item_type] || "Place"}</span></span>
        <button type="button" class="inline-action-btn ${item.start_time ? "filled" : ""} owner-only ${isOwner ? "" : "hidden"}" data-action="time">
          ${item.start_time ? escapeHtml(item.start_time) : "Add time"}
        </button>
      </div>
      ${item.description ? `<span class="ip-note">${escapeHtml(item.description)}</span>` : ""}
      <div class="ip-bottom-row">
        <button type="button" class="inline-action-btn ${item.cost ? "filled" : ""} owner-only ${isOwner ? "" : "hidden"}" data-action="cost">
          ${item.cost ? formatMoney(item.cost) + "đ" : "Add cost"}
        </button>
        <div class="ip-item-actions">
          <button type="button" class="save-place-btn">
            <img src="images/icon-share.png" alt=""> Save
          </button>
          <button type="button" class="delete-item-btn owner-only ${isOwner ? "" : "hidden"}" aria-label="Delete">&times;</button>
        </div>
      </div>
    </div>
  `;

  card.querySelector(".save-place-btn").addEventListener("click", () => openSaveToTripModal(item));

  const timeBtn = card.querySelector('[data-action="time"]');
  if (timeBtn) timeBtn.addEventListener("click", () => {
    const value = prompt("Nhập thời gian (vd 09:00):", item.start_time || "");
    if (value !== null) updateItemField(item.id, "time", value.trim());
  });

  const costBtn = card.querySelector('[data-action="cost"]');
  if (costBtn) costBtn.addEventListener("click", () => {
    const value = prompt("Nhập chi phí (số, VND):", item.cost || "");
    if (value !== null) updateItemField(item.id, "cost", value.trim());
  });

  const deleteBtn = card.querySelector(".delete-item-btn");
  if (deleteBtn) deleteBtn.addEventListener("click", () => deleteItem(item.id));

  return card;
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function updateItemField(itemId, field, value) {
  fetch("guide-detail.php?action=update_item", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "item_id=" + encodeURIComponent(itemId) + "&" + field + "=" + encodeURIComponent(value)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) loadGuide();
      else alert(data.message || "Không thể lưu thay đổi.");
    })
    .catch((err) => console.error("update_item lỗi:", err));
}

function deleteItem(itemId) {
  if (!confirm("Xoá địa điểm này khỏi guide?")) return;
  fetch("guide-detail.php?action=delete_item", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "item_id=" + encodeURIComponent(itemId)
  })
    .then((res) => res.json())
    .then((data) => { if (data.success) loadGuide(); else alert(data.message || "Không thể xoá."); })
    .catch((err) => console.error("delete_item lỗi:", err));
}

/* ---------------- Add Day ---------------- */
function initAddDayBtn() {
  document.getElementById("addDayBtn").addEventListener("click", () => {
    fetch("guide-detail.php?action=add_day", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "guide_id=" + encodeURIComponent(guideId)
    })
      .then((res) => res.json())
      .then((data) => { if (data.success) loadGuide(); else alert(data.message || "Không thể thêm Day."); })
      .catch((err) => console.error("add_day lỗi:", err));
  });
}

function deleteDay(dayId) {
  if (!confirm("Xoá cả ngày này (và toàn bộ địa điểm trong ngày)?")) return;
  fetch("guide-detail.php?action=delete_day", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "day_id=" + encodeURIComponent(dayId)
  })
    .then((res) => res.json())
    .then((data) => { if (data.success) loadGuide(); else alert(data.message || "Không thể xoá Day."); })
    .catch((err) => console.error("delete_day lỗi:", err));
}

/* ---------------- Modal: Add Place to Guide Day (chỉ tác giả) ---------------- */
function initAddPlaceToGuideModal() {
  const modal = document.getElementById("addPlaceToGuideModal");
  document.getElementById("closeAddPlaceToGuideModal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  const searchInput = document.getElementById("guidePlaceSearchInput");
  searchInput.addEventListener("input", () => loadPlacesForGuide(searchInput.value));
}

function openAddPlaceToGuideModal(dayId) {
  selectedGuideDayIdForAddPlace = dayId;
  document.getElementById("guidePlaceSearchInput").value = "";
  document.getElementById("addPlaceToGuideModal").classList.remove("hidden");
  loadPlacesForGuide("");
}

function loadPlacesForGuide(keyword) {
  const container = document.getElementById("guidePlaceListContainer");
  container.innerHTML = '<p class="placeholder-text">Đang tải...</p>';

  fetch("guide-detail.php?action=list_places&keyword=" + encodeURIComponent(keyword))
    .then((res) => res.json())
    .then((data) => {
      container.innerHTML = "";
      if (!data.places || data.places.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Không tìm thấy địa điểm.</p>';
        return;
      }
      data.places.forEach((place) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "modal-list-item";
        btn.textContent = place.name + " (" + (TYPE_LABELS[place.type] || place.type) + ")";
        btn.addEventListener("click", () => addPlaceToGuideDay(place.id));
        container.appendChild(btn);
      });
    })
    .catch((err) => {
      console.error("list_places lỗi:", err);
      container.innerHTML = '<p class="placeholder-text">Không thể tải danh sách địa điểm.</p>';
    });
}

function addPlaceToGuideDay(placeId) {
  fetch("guide-detail.php?action=add_item_to_day", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "day_id=" + encodeURIComponent(selectedGuideDayIdForAddPlace) + "&place_id=" + encodeURIComponent(placeId)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        document.getElementById("addPlaceToGuideModal").classList.add("hidden");
        loadGuide();
      } else {
        alert(data.message || "Không thể thêm địa điểm.");
      }
    })
    .catch((err) => console.error("add_item_to_day lỗi:", err));
}

/* ---------------- Modal: Save to Trip (người xem lưu 1 item của guide) ---------------- */
function initSaveToTripModal() {
  const modal = document.getElementById("saveToTripModal");
  document.getElementById("closeSaveToTripModal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
  document.getElementById("backToTripStepBtn").addEventListener("click", () => showSaveTripStep());
}

function openSaveToTripModal(item) {
  selectedItemIdForSave = item.id;
  document.getElementById("saveToTripModal").classList.remove("hidden");
  showSaveTripStep();
  loadUserTripsForSave();
}

function showSaveTripStep() {
  document.getElementById("saveTripStep").classList.remove("hidden");
  document.getElementById("saveDayStep").classList.add("hidden");
  document.getElementById("saveAddedStep").classList.add("hidden");
}
function showSaveDayStep() {
  document.getElementById("saveTripStep").classList.add("hidden");
  document.getElementById("saveDayStep").classList.remove("hidden");
}
function showSaveAddedStep() {
  document.getElementById("saveTripStep").classList.add("hidden");
  document.getElementById("saveDayStep").classList.add("hidden");
  document.getElementById("saveAddedStep").classList.remove("hidden");
}

function loadUserTripsForSave() {
  const container = document.getElementById("saveTripListContainer");
  const createBtn = document.getElementById("createNewTripFromSaveBtn");
  container.innerHTML = '<p class="placeholder-text">Đang tải danh sách trip...</p>';
  createBtn.classList.add("hidden");
  createBtn.onclick = () => { window.location.href = "new-trip.html"; };

  fetch("guide-detail.php?action=get_trips")
    .then((res) => res.json())
    .then((data) => {
      if (data.require_login) {
        container.innerHTML = '<p class="placeholder-text">Vui lòng <a href="login.html">đăng nhập</a> để lưu địa điểm.</p>';
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
        btn.addEventListener("click", () => loadTripDaysForSave(trip.id));
        container.appendChild(btn);
      });
    })
    .catch((err) => {
      console.error("get_trips lỗi:", err);
      container.innerHTML = '<p class="placeholder-text">Không thể tải danh sách trip.</p>';
    });
}

function loadTripDaysForSave(tripId) {
  const container = document.getElementById("saveDayListContainer");
  container.innerHTML = '<p class="placeholder-text">Đang tải danh sách ngày...</p>';
  showSaveDayStep();

  fetch("guide-detail.php?action=get_trip_days&trip_id=" + encodeURIComponent(tripId))
    .then((res) => res.json())
    .then((data) => {
      if (!data.days || data.days.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Trip này chưa có ngày nào.</p>';
        return;
      }
      container.innerHTML = "";
      data.days.forEach((day) => {
        const btn = document.createElement("button");
        btn.className = "modal-list-item";
        btn.type = "button";
        btn.textContent = "Day " + day.day_number + (day.day_date ? " - " + day.day_date : "");
        btn.addEventListener("click", () => savePlaceToDay(day.id));
        container.appendChild(btn);
      });
    })
    .catch((err) => console.error("get_trip_days lỗi:", err));
}

function savePlaceToDay(dayId) {
  fetch("guide-detail.php?action=save_place_to_day", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "day_id=" + encodeURIComponent(dayId) + "&item_id=" + encodeURIComponent(selectedItemIdForSave)
  })
    .then((res) => res.json())
    .then((data) => { if (data.success) showSaveAddedStep(); else alert(data.message || "Không thể lưu địa điểm."); })
    .catch((err) => console.error("save_place_to_day lỗi:", err));
}

/* ---------------- Add to New Trip (clone toàn bộ Itinerary) ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addToNewTripBtn").addEventListener("click", () => {
    if (!confirm('Tạo Trip mới từ toàn bộ lịch trình của guide "' + (guideData ? guideData.title : "") + '"?')) return;

    fetch("guide-detail.php?action=create_trip_from_guide", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "guide_id=" + encodeURIComponent(guideId)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.require_login) { alert("Vui lòng đăng nhập để tạo Trip."); return; }
        if (data.success) window.location.href = "trip.html?id=" + encodeURIComponent(data.trip_id);
        else alert(data.message || "Không thể tạo Trip từ guide này.");
      })
      .catch((err) => { console.error("create_trip_from_guide lỗi:", err); alert("Không thể kết nối máy chủ."); });
  });
});

/* ---------------- Share modal ---------------- */
function initShareModal() {
  const modal = document.getElementById("shareGuideModal");
  document.getElementById("closeShareGuideModal").addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });
  document.getElementById("copyGuideShareLinkBtn").addEventListener("click", () => {
    const input = document.getElementById("guideShareLinkInput");
    if (navigator.clipboard) navigator.clipboard.writeText(input.value).then(() => alert("Đã sao chép liên kết."));
  });
}
function openShareModal() {
  document.getElementById("guideShareLinkInput").value = window.location.origin + "/guide-detail.php?id=" + encodeURIComponent(guideId);
  document.getElementById("shareGuideModal").classList.remove("hidden");
}

/* ---------------- Comments ---------------- */
function updateCommentFormVisibility() {
  document.getElementById("writeCommentArea").classList.toggle("hidden", !isLoggedIn);
  document.getElementById("loginRequiredCommentMsg").classList.toggle("hidden", isLoggedIn);
}

function initCommentForm() {
  document.getElementById("submitCommentBtn").addEventListener("click", () => {
    const input = document.getElementById("commentInput");
    const errorEl = document.getElementById("commentError");
    const content = input.value.trim();

    if (content.length === 0) {
      errorEl.textContent = "Vui lòng nhập nội dung.";
      errorEl.classList.remove("hidden");
      return;
    }
    errorEl.classList.add("hidden");

    fetch("guide-detail.php?action=add_comment", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "guide_id=" + encodeURIComponent(guideId) + "&content=" + encodeURIComponent(content)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.require_login) { errorEl.textContent = "Vui lòng đăng nhập."; errorEl.classList.remove("hidden"); return; }
        if (data.success) { input.value = ""; loadGuide(); }
      })
      .catch((err) => console.error("add_comment lỗi:", err));
  });
}

function renderComments() {
  const list = document.getElementById("commentList");
  list.innerHTML = "";
  comments.forEach((c) => list.appendChild(buildCommentItem(c)));
}

function buildCommentItem(comment) {
  const item = document.createElement("div");
  item.className = "comment-item";
  item.dataset.id = comment.id;

  item.innerHTML = `
    <img class="comment-avatar" src="${comment.avatar || "images/icon-profile.png"}" alt="">
    <div class="comment-body">
      <div class="comment-header">
        <span class="comment-username">${escapeHtml(comment.user_name)}</span>
        <span class="comment-date">${formatDate(comment.created_at)}</span>
      </div>
      <p class="comment-content">${escapeHtml(comment.content)}</p>
      ${comment.is_owner ? `
        <div class="comment-owner-actions">
          <button type="button" class="edit-comment-btn">Edit</button>
          <button type="button" class="delete-comment-btn">Delete</button>
        </div>
      ` : ""}
    </div>
  `;

  if (comment.is_owner) {
    item.querySelector(".edit-comment-btn").addEventListener("click", () => startEditComment(item, comment));
    item.querySelector(".delete-comment-btn").addEventListener("click", () => deleteComment(comment.id));
  }

  return item;
}

function startEditComment(itemEl, comment) {
  const bodyEl = itemEl.querySelector(".comment-content");
  const textarea = document.createElement("textarea");
  textarea.className = "edit-comment-textarea";
  textarea.value = comment.content;
  bodyEl.replaceWith(textarea);

  const actionsEl = itemEl.querySelector(".comment-owner-actions");
  actionsEl.innerHTML = `
    <button type="button" class="save-comment-btn">Save</button>
    <button type="button" class="cancel-comment-btn">Cancel</button>
  `;

  actionsEl.querySelector(".save-comment-btn").addEventListener("click", () => {
    const newContent = textarea.value.trim();
    if (newContent.length === 0) return;

    fetch("guide-detail.php?action=edit_comment", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "comment_id=" + encodeURIComponent(comment.id) + "&content=" + encodeURIComponent(newContent)
    })
      .then((res) => res.json())
      .then((data) => { if (data.success) loadGuide(); else alert(data.message || "Không thể lưu."); })
      .catch((err) => console.error("edit_comment lỗi:", err));
  });

  actionsEl.querySelector(".cancel-comment-btn").addEventListener("click", () => renderComments());
}

function deleteComment(commentId) {
  if (!confirm("Xoá bình luận này?")) return;
  fetch("guide-detail.php?action=delete_comment", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "comment_id=" + encodeURIComponent(commentId)
  })
    .then((res) => res.json())
    .then((data) => { if (data.success) loadGuide(); else alert(data.message || "Không thể xoá."); })
    .catch((err) => console.error("delete_comment lỗi:", err));
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : str;
  return div.innerHTML;
}