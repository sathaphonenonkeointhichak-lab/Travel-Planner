/* ==========================================================
   TRIP PAGE SCRIPT - Travel Planner
   Dữ liệu 100% thật từ trip.php - không còn SAMPLE_TRIP/CHOOSE_PLACE_DATA.
   ========================================================== */

let tripData = null;
let selectedDayId = null;
let currentFilter = "all";
let currentKeyword = "";
let tripId = null;
let allPlaces = []; // cache danh sách places thật cho Choose Place
let canEdit = false; // owner hoặc permission='edit' - quyết định UI, backend vẫn tự kiểm tra lại

const CATEGORY_LABELS = { hotel: "Hotel", attraction: "Places", cafe: "Cafe", restaurant: "Restaurant" };

document.addEventListener("DOMContentLoaded", () => {
  tripId = new URLSearchParams(window.location.search).get("id");
  if (!tripId) {
    document.querySelector("main").innerHTML = '<p class="placeholder-text">Thiếu id trip trên URL.</p>';
    return;
  }
  loadTrip();
  initTopbar();
  initShareModal();
  initExpenseForm();
  initChoosePlaceToolbar();
  initEditCoverButton();
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

/* ---------------- Load Trip thật ---------------- */
function loadTrip() {
  fetch("trip.php?action=get_trip&id=" + encodeURIComponent(tripId))
    .then(async (res) => {
      const data = await res.json();
      if (res.status === 403 && data.access_denied) {
        throw new Error("ACCESS_DENIED");
      }
      if (!data.trip) {
        throw new Error("NOT_FOUND");
      }
      return data.trip;
    })
    .then((trip) => {
      tripData = trip;
      canEdit = trip.my_role === "owner" || trip.my_role === "edit";
      afterTripLoaded();
    })
    .catch((err) => {
      const main = document.querySelector("main");
      if (err.message === "ACCESS_DENIED") {
        main.innerHTML = '<p class="placeholder-text">Trip này ở chế độ Private. Bạn không có quyền xem - hãy liên hệ chủ trip để được mời.</p>';
      } else if (err.message === "NOT_FOUND") {
        main.innerHTML = '<p class="placeholder-text">Không tìm thấy trip này.</p>';
      } else {
        console.error("Load trip error:", err);
        main.innerHTML = '<p class="placeholder-text">Không thể tải dữ liệu trip.</p>';
      }
    });
}

function afterTripLoaded() {
  selectedDayId = tripData.days.length > 0 ? tripData.days[0].id : null;
  renderTripHeader();
  renderPlaceToVisit();
  renderItinerary();
  renderBudgeting();
  loadChoosePlaces();
  applyPermissionUI();
}

/* ---------------- Ẩn/khoá control theo quyền (backend vẫn luôn tự kiểm tra lại) ---------------- */
function applyPermissionUI() {
  document.querySelectorAll(".edit-only").forEach((el) => {
    el.classList.toggle("hidden", !canEdit);
  });
  const shareInviteBtn = document.getElementById("shareInviteBtn");
  if (shareInviteBtn) shareInviteBtn.classList.toggle("hidden", tripData.my_role !== "owner");
}

/* ---------------- Trip header ---------------- */
function renderTripHeader() {
  document.getElementById("coverImage").src = tripData.cover_image || "images/trip-cover-placeholder.jpg";
  document.getElementById("tripTitle").textContent = tripData.title;
  document.getElementById("tripDates").textContent =
    formatShortDate(tripData.start_date) + " - " + formatShortDate(tripData.end_date) +
    (tripData.destination ? " · " + tripData.destination : "");

  const avatarsContainer = document.getElementById("memberAvatars");
  avatarsContainer.innerHTML = "";
  const ownerImg = document.createElement("img");
  ownerImg.src = tripData.owner_avatar || "images/avatar-placeholder.png";
  ownerImg.title = tripData.owner_name || "";
  avatarsContainer.appendChild(ownerImg);
  (tripData.members || []).forEach((m) => {
    const img = document.createElement("img");
    img.src = m.avatar || "images/avatar-placeholder.png";
    img.title = (m.name || "") + " (" + (m.permission === "edit" ? "Can edit" : "View only") + ")";
    avatarsContainer.appendChild(img);
  });

  const daysCount = tripData.days.length;
  document.getElementById("itineraryRange").textContent =
    tripData.start_date && tripData.end_date
      ? formatShortDate(tripData.start_date) + " - " + formatShortDate(tripData.end_date) + (daysCount ? " · " + daysCount + " ngày" : "")
      : "";
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return (d.getMonth() + 1) + "/" + d.getDate();
}

function dayLabel(day) {
  const suffixes = ["st", "nd", "rd"];
  const n = day.day_number;
  const suffix = n <= 3 ? suffixes[n - 1] : "th";
  return (tripData.destination || "Ngày") + ", " + n + suffix;
}

/* ---------------- Place to visit (danh sách của Day đang chọn, có số thứ tự thật) ---------------- */
function renderPlaceToVisit() {
  const container = document.getElementById("placeToVisitList");
  container.innerHTML = "";

  const day = tripData.days.find((d) => d.id === selectedDayId);

  if (!day || !day.places || day.places.length === 0) {
    container.innerHTML = '<p class="placeholder-text">Chưa có địa điểm nào trong ngày này.</p>';
    return;
  }

  day.places.forEach((place, index) => {
    container.appendChild(buildItineraryPlaceCard(day.id, place, index));
  });
}

/* ---------------- Itinerary: tab/accordion theo Day (tạo tự động theo start->end date) ---------------- */
function renderItinerary() {
  const container = document.getElementById("dayList");
  container.innerHTML = "";

  tripData.days.forEach((day) => {
    const block = document.createElement("div");
    block.className = "day-block" + (day.id === selectedDayId ? " selected" : "");
    block.dataset.dayId = day.id;

    block.innerHTML = `
      <button type="button" class="day-toggle-btn">
        <img src="images/icon-chevron-down.png" alt="">
        ${escapeHtml(dayLabel(day))}
        <span class="day-date">${formatShortDate(day.day_date)}</span>
      </button>
      <div class="day-body">
        <div class="place-item-list" data-day-id="${day.id}"></div>
        <button type="button" class="add-place-btn edit-only ${canEdit ? "" : "hidden"}" data-day-id="${day.id}">+ Add a place</button>
      </div>
    `;

    const placeList = block.querySelector(".place-item-list");
    (day.places || []).forEach((place, index) => placeList.appendChild(buildItineraryPlaceCard(day.id, place, index, true)));

    const toggleBtn = block.querySelector(".day-toggle-btn");
    const dayBody = block.querySelector(".day-body");
    toggleBtn.addEventListener("click", () => {
      dayBody.classList.toggle("collapsed");
      toggleBtn.classList.toggle("collapsed");
    });

    block.addEventListener("click", (e) => {
      if (e.target.closest(".add-place-btn")) return;
      selectDay(day.id);
    });

    block.querySelector(".add-place-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      selectDay(day.id);
      document.querySelector(".choose-place-panel").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    container.appendChild(block);
  });

  updateSelectedDayLabel();
}

/* ---------------- 1 item Place trong itinerary (dùng chung cho Place to visit + Itinerary) ---------------- */
function buildItineraryPlaceCard(dayId, place, index, compact) {
  const card = document.createElement("div");
  card.className = "itinerary-place-card";
  card.dataset.itemId = place.id;

  const checklist = place.checklist || [];
  const doneCount = checklist.filter((c) => c.is_done).length;

  card.innerHTML = `
    <span class="place-number">${index + 1}</span>
    <div class="place-card-body">
      <div class="place-card-name">${escapeHtml(place.title)}</div>
      <div class="place-card-actions-inline">
        <button type="button" class="inline-action-btn edit-only ${canEdit ? "" : "hidden"} ${place.start_time ? "filled" : ""}" data-action="time">
          ${place.start_time ? escapeHtml(place.start_time) : "Add time"}
        </button>
        <button type="button" class="inline-action-btn edit-only ${canEdit ? "" : "hidden"} ${place.cost ? "filled" : ""}" data-action="cost">
          ${place.cost ? "₫ " + formatMoney(place.cost) : "Add cost"}
        </button>
        <button type="button" class="inline-action-btn edit-only ${canEdit ? "" : "hidden"} ${place.description ? "filled" : ""}" data-action="note">
          ${place.description ? escapeHtml(place.description) : "Add note"}
        </button>
        <button type="button" class="inline-action-btn" data-action="checklist">
          Checklist ${checklist.length ? "(" + doneCount + "/" + checklist.length + ")" : ""}
        </button>
      </div>
      <div class="checklist-box hidden" data-item-id="${place.id}"></div>
    </div>
    <button class="place-card-menu-btn edit-only ${canEdit ? "" : "hidden"}" type="button" aria-label="More">&#8942;</button>
  `;

  card.querySelector('[data-action="time"]').addEventListener("click", (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    const value = prompt("Nhập thời gian (ví dụ 09:00):", place.start_time || "");
    if (value === null) return;
    updatePlace(place, { time: value.trim() });
  });

  card.querySelector('[data-action="cost"]').addEventListener("click", (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    const value = prompt("Nhập chi phí (VND):", place.cost || "");
    if (value === null) return;
    const num = value.trim() === "" ? "" : parseFloat(value);
    if (value.trim() !== "" && isNaN(num)) { alert("Chi phí phải là số."); return; }
    updatePlace(place, { cost: value.trim() === "" ? "" : num });
  });

  card.querySelector('[data-action="note"]').addEventListener("click", (e) => {
    e.stopPropagation();
    if (!canEdit) return;
    const value = prompt("Ghi chú cho địa điểm này:", place.description || "");
    if (value === null) return;
    updatePlace(place, { note: value.trim() });
  });

  card.querySelector('[data-action="checklist"]').addEventListener("click", (e) => {
    e.stopPropagation();
    const box = card.querySelector(".checklist-box");
    box.classList.toggle("hidden");
    if (!box.classList.contains("hidden")) renderChecklistBox(box, place);
  });

  const menuBtn = card.querySelector(".place-card-menu-btn");
  if (menuBtn) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!canEdit) return;
      const remove = confirm("Xoá địa điểm này khỏi Day?");
      if (!remove) return;

      fetch("trip.php?action=remove_place_from_day", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "item_id=" + encodeURIComponent(place.id)
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) loadTrip();
          else alert(data.message || "Không thể xoá.");
        })
        .catch(() => alert("Không thể kết nối máy chủ."));
    });
  }

  return card;
}

/* ---------------- Cập nhật Time/Cost/Note - gọi API thật ---------------- */
function updatePlace(place, changes) {
  const body = new URLSearchParams();
  body.set("item_id", place.id);
  body.set("time", changes.time !== undefined ? changes.time : (place.start_time || ""));
  body.set("cost", changes.cost !== undefined ? changes.cost : (place.cost || ""));
  body.set("note", changes.note !== undefined ? changes.note : (place.description || ""));

  fetch("trip.php?action=update_place", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) loadTrip();
      else alert(data.message || "Không thể cập nhật.");
    })
    .catch(() => alert("Không thể kết nối máy chủ."));
}

/* ---------------- Checklist (thêm/tick/xoá) ---------------- */
function renderChecklistBox(box, place) {
  const checklist = place.checklist || [];
  box.innerHTML = `
    <div class="checklist-items"></div>
    ${canEdit ? `
      <div class="checklist-add-row">
        <input type="text" class="checklist-input" placeholder="Thêm checklist...">
        <button type="button" class="checklist-add-btn">Add</button>
      </div>
    ` : ""}
  `;

  const itemsContainer = box.querySelector(".checklist-items");
  checklist.forEach((c) => {
    const row = document.createElement("label");
    row.className = "checklist-row";
    row.innerHTML = `
      <input type="checkbox" ${c.is_done ? "checked" : ""} ${canEdit ? "" : "disabled"}>
      <span class="${c.is_done ? "done" : ""}">${escapeHtml(c.content)}</span>
      ${canEdit ? '<button type="button" class="checklist-delete-btn">&times;</button>' : ""}
    `;

    row.querySelector('input[type="checkbox"]').addEventListener("change", () => {
      if (!canEdit) return;
      fetch("trip.php?action=toggle_checklist_item", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "checklist_id=" + encodeURIComponent(c.id)
      })
        .then((res) => res.json())
        .then((data) => { if (data.success) loadTrip(); })
        .catch(() => alert("Không thể kết nối máy chủ."));
    });

    const delBtn = row.querySelector(".checklist-delete-btn");
    if (delBtn) {
      delBtn.addEventListener("click", () => {
        fetch("trip.php?action=delete_checklist_item", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "checklist_id=" + encodeURIComponent(c.id)
        })
          .then((res) => res.json())
          .then((data) => { if (data.success) loadTrip(); })
          .catch(() => alert("Không thể kết nối máy chủ."));
      });
    }

    itemsContainer.appendChild(row);
  });

  const addBtn = box.querySelector(".checklist-add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const input = box.querySelector(".checklist-input");
      const content = input.value.trim();
      if (!content) return;

      fetch("trip.php?action=add_checklist_item", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "item_id=" + encodeURIComponent(place.id) + "&content=" + encodeURIComponent(content)
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) loadTrip();
          else alert(data.message || "Không thể thêm checklist.");
        })
        .catch(() => alert("Không thể kết nối máy chủ."));
    });
  }
}

function selectDay(dayId) {
  selectedDayId = dayId;
  document.querySelectorAll(".day-block").forEach((el) => {
    el.classList.toggle("selected", el.dataset.dayId === dayId);
  });
  renderPlaceToVisit();
  updateSelectedDayLabel();
}

function updateSelectedDayLabel() {
  const day = tripData.days.find((d) => d.id === selectedDayId);
  document.getElementById("selectedDayLabel").textContent = day ? dayLabel(day) : "-";
}

/* ---------------- Budgeting: tính từ cost thật của itinerary items + expenses ---------------- */
function renderBudgeting() {
  const list = document.getElementById("expenseList");
  list.innerHTML = "";

  const b = tripData.budgeting || { by_day: [], itinerary_total: 0, expenses_total: 0, grand_total: 0 };

  b.by_day.forEach((d) => {
    const row = document.createElement("div");
    row.className = "expense-item";
    row.innerHTML = `<span>Day ${d.day_number} (itinerary)</span><span>₫ ${formatMoney(d.total)}</span>`;
    list.appendChild(row);
  });

  (tripData.expenses || []).forEach((exp) => {
    const row = document.createElement("div");
    row.className = "expense-item";
    row.innerHTML = `<span>${escapeHtml(exp.note)}</span><span>₫ ${formatMoney(exp.amount)}</span>`;
    list.appendChild(row);
  });

  document.getElementById("expenseTotal").textContent = "₫ " + formatMoney(b.grand_total);
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

/* ---------------- Choose Place (cột phải) - dữ liệu thật từ bảng places ---------------- */
function loadChoosePlaces() {
  const container = document.getElementById("choosePlaceList");
  container.innerHTML = '<p class="placeholder-text">Đang tải địa điểm...</p>';

  fetch("trip.php?action=list_places")
    .then((res) => res.json())
    .then((data) => {
      allPlaces = data.places || [];
      renderChoosePlaceList();
    })
    .catch((err) => {
      console.error("Load places error:", err);
      container.innerHTML = '<p class="placeholder-text">Không thể tải danh sách địa điểm.</p>';
    });
}

function initChoosePlaceToolbar() {
  const searchInput = document.getElementById("choosePlaceSearch");
  searchInput.addEventListener("input", () => {
    currentKeyword = searchInput.value;
    renderChoosePlaceList();
  });

  const filterBtn = document.getElementById("choosePlaceFilterBtn");
  const filterMenu = document.getElementById("choosePlaceFilterMenu");
  const filterLabel = document.getElementById("choosePlaceFilterLabel");
  const options = filterMenu.querySelectorAll(".filter-option");

  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    filterMenu.classList.toggle("hidden");
  });

  options.forEach((opt) => {
    opt.addEventListener("click", () => {
      options.forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      currentFilter = opt.dataset.filter;
      filterLabel.textContent = opt.textContent;
      filterMenu.classList.add("hidden");
      renderChoosePlaceList();
    });
  });

  document.addEventListener("click", () => filterMenu.classList.add("hidden"));
}

function renderChoosePlaceList() {
  const container = document.getElementById("choosePlaceList");
  const keyword = currentKeyword.trim().toLowerCase();

  const filtered = allPlaces.filter((p) => {
    const matchCategory = currentFilter === "all" || p.type === currentFilter;
    const searchText = ((p.name || "") + " " + (p.address || "")).toLowerCase();
    const matchKeyword = keyword.length === 0 || searchText.includes(keyword);
    return matchCategory && matchKeyword;
  });

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = '<p class="placeholder-text">No results found</p>';
    return;
  }

  filtered.forEach((place) => container.appendChild(buildChoosePlaceCard(place)));
}

function buildChoosePlaceCard(place) {
  const card = document.createElement("div");
  card.className = "choose-place-card";
  card.dataset.id = place.id;

  card.innerHTML = `
    <img class="thumb" src="${escapeHtml(place.image_url || "")}" alt="${escapeHtml(place.name)}">
    <div class="info">
      <div class="cp-name">${escapeHtml(place.name)}</div>
      <div class="cp-type">${escapeHtml(CATEGORY_LABELS[place.type] || place.type || "")}</div>
      <div class="cp-address">${escapeHtml(place.address || "")}</div>
      ${place.price ? `<div class="cp-price">${escapeHtml(place.price)}</div>` : ""}
    </div>
    <button type="button" class="add-btn ${canEdit ? "" : "hidden"}">Add</button>
  `;

  const addBtn = card.querySelector(".add-btn");
  addBtn.addEventListener("click", () => addPlaceToSelectedDay(place, addBtn));

  return card;
}

function addPlaceToSelectedDay(place, btnEl) {
  if (!selectedDayId) {
    alert("Vui lòng chọn 1 Day trong Itinerary trước khi Add.");
    return;
  }

  fetch("trip.php?action=add_place_to_day", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "day_id=" + encodeURIComponent(selectedDayId) + "&place_id=" + encodeURIComponent(place.id)
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        btnEl.textContent = "Added";
        btnEl.classList.add("added");
        setTimeout(() => { btnEl.textContent = "Add"; btnEl.classList.remove("added"); }, 1200);
        loadTrip();
      } else {
        alert(data.message || "Không thể thêm địa điểm vào trip.");
      }
    })
    .catch(() => alert("Không thể kết nối máy chủ."));
}

/* ---------------- Top bar: Back / Share / Menu ---------------- */
function initTopbar() {
  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "home.html";
  });

  const menuBtn = document.getElementById("tripMenuBtn");
  const menuPopup = document.getElementById("tripMenuPopup");

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuPopup.classList.toggle("hidden");
  });
  document.addEventListener("click", () => menuPopup.classList.add("hidden"));

  menuPopup.querySelectorAll(".dropdown-option").forEach((opt) => {
    opt.addEventListener("click", () => handleTripMenuAction(opt.dataset.action));
  });
}

function handleTripMenuAction(action) {
  if (action === "rename") {
    if (tripData.my_role !== "owner") { alert("Chỉ chủ trip mới được đổi tên."); return; }
    const newName = prompt("Tên trip mới:", tripData.title);
    if (!newName || !newName.trim()) return;

    fetch("trip.php?action=rename_trip", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "trip_id=" + encodeURIComponent(tripId) + "&title=" + encodeURIComponent(newName.trim())
    })
      .then((res) => res.json())
      .then((data) => { if (data.success) loadTrip(); else alert(data.message || "Không thể đổi tên."); })
      .catch(() => alert("Không thể kết nối máy chủ."));

  } else if (action === "edit-dates") {
    alert("Chức năng chỉnh sửa ngày sẽ mở form riêng (sẽ bổ sung sau).");

  } else if (action === "delete") {
    if (tripData.my_role !== "owner") { alert("Chỉ chủ trip mới được xoá trip."); return; }
    const confirmed = confirm("Bạn có chắc muốn xoá Trip này?");
    if (!confirmed) return;

    fetch("trip.php?action=delete_trip", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "trip_id=" + encodeURIComponent(tripId)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) window.location.href = "home.html";
        else alert(data.message || "Không thể xoá trip.");
      })
      .catch(() => alert("Không thể kết nối máy chủ."));
  }
}

/* ---------------- Edit cover ---------------- */
function initEditCoverButton() {
  document.getElementById("editCoverBtn").addEventListener("click", () => {
    alert("Chức năng đổi ảnh cover sẽ được bổ sung sau (chưa có hệ thống upload ảnh).");
  });
}

/* ---------------- Share modal (chỉ owner mới mời được - trip.php tự kiểm tra lại) ---------------- */
function initShareModal() {
  const shareBtn = document.getElementById("shareBtn");
  const modal = document.getElementById("shareModal");
  const closeBtn = document.getElementById("closeShareModal");
  const copyBtn = document.getElementById("copyShareLinkBtn");
  const inviteBtn = document.getElementById("shareInviteBtn");

  shareBtn.addEventListener("click", () => {
    document.getElementById("shareLinkInput").value =
      window.location.origin + "/trip.html?id=" + encodeURIComponent(tripId);
    modal.classList.remove("hidden");
  });

  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.add("hidden"); });

  copyBtn.addEventListener("click", () => {
    const input = document.getElementById("shareLinkInput");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value).then(() => alert("Đã sao chép liên kết."));
    } else {
      input.select();
      document.execCommand("copy");
    }
  });

  inviteBtn.addEventListener("click", () => {
    const emailInput = document.getElementById("shareEmailInput");
    const permission = document.getElementById("sharePermissionSelect").value;
    const errorEl = document.getElementById("shareError");
    const email = emailInput.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = "Vui lòng nhập email hợp lệ.";
      errorEl.classList.remove("hidden");
      return;
    }

    errorEl.classList.add("hidden");

    fetch("trip.php?action=invite_member", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "trip_id=" + encodeURIComponent(tripId) + "&email=" + encodeURIComponent(email) + "&permission=" + encodeURIComponent(permission)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          emailInput.value = "";
          alert("Đã thêm " + email + " vào trip.");
          loadTrip();
        } else {
          errorEl.textContent = data.message || "Không thể gửi lời mời.";
          errorEl.classList.remove("hidden");
        }
      })
      .catch(() => {
        errorEl.textContent = "Không thể kết nối máy chủ.";
        errorEl.classList.remove("hidden");
      });
  });
}

/* ---------------- Budgeting: Add Expense (chi phí phát sinh riêng, ngoài itinerary) ---------------- */
function initExpenseForm() {
  const addBtn = document.getElementById("addExpenseBtn");
  const form = document.getElementById("addExpenseForm");
  const cancelBtn = document.getElementById("cancelExpenseBtn");

  addBtn.addEventListener("click", () => {
    if (!canEdit) { alert("Bạn không có quyền chỉnh sửa trip này."); return; }
    form.classList.toggle("hidden");
  });
  cancelBtn.addEventListener("click", () => form.classList.add("hidden"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const note = document.getElementById("expenseNote").value.trim();
    const amount = parseInt(document.getElementById("expenseAmount").value, 10);

    if (!note || isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập đầy đủ nội dung và số tiền hợp lệ.");
      return;
    }

    fetch("trip.php?action=add_expense", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "trip_id=" + encodeURIComponent(tripId) + "&note=" + encodeURIComponent(note) + "&amount=" + encodeURIComponent(amount)
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          document.getElementById("expenseNote").value = "";
          document.getElementById("expenseAmount").value = "";
          form.classList.add("hidden");
          loadTrip();
        } else {
          alert(data.message || "Không thể thêm chi phí.");
        }
      })
      .catch(() => alert("Không thể kết nối máy chủ."));
  });
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}