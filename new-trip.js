/* ==========================================================
   NEW TRIP PAGE SCRIPT - Travel Planner
   Không dùng dữ liệu mẫu.
   Chức năng:
   - Chọn Trip / Write Guide
   - Invite tripmates + permission
   - Validate form
   - Gửi dữ liệu thật tới new-trip.php
   - PHP quyết định redirect tới Trip hoặc Guide
   ========================================================== */

let currentType = "trip";
let invites = [];

document.addEventListener("DOMContentLoaded", () => {
  initTypeToggle();
  initInviteModal();
  initForm();
  initSearch();
  initProfileButton();
  initCancelButton();

  updateTypeUI();
});

/* ==========================================================
   TYPE: Trip / Write Guide
   ========================================================== */

function initTypeToggle() {
  const buttons = document.querySelectorAll(".type-toggle-btn");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentType = btn.dataset.type || "trip";

      updateTypeUI();
    });
  });
}

function updateTypeUI() {
  const tripOnlyRow = document.getElementById("tripOnlyRow");

  if (!tripOnlyRow) return;

  if (currentType === "trip") {
    tripOnlyRow.classList.remove("hidden");
  } else {
    tripOnlyRow.classList.add("hidden");

    // Khi chuyển sang Write Guide thì không giữ invite cũ.
    invites = [];
    renderInviteList();
    updateInviteBadge();
  }
}

/* ==========================================================
   INVITE TRIPMATES
   ========================================================== */

function initInviteModal() {
  const openBtn = document.getElementById("inviteTripmatesBtn");
  const modal = document.getElementById("inviteModal");
  const closeBtn = document.getElementById("closeInviteModal");
  const addBtn = document.getElementById("addInviteBtn");
  const doneBtn = document.getElementById("doneInviteBtn");

  if (!openBtn || !modal) return;

  openBtn.addEventListener("click", () => {
    if (currentType !== "trip") return;

    modal.classList.remove("hidden");
    renderInviteList();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
    }
  });

  if (addBtn) {
    addBtn.addEventListener("click", addInvite);
  }

  if (doneBtn) {
    doneBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
      renderInviteList();
      updateInviteBadge();
    });
  }
}

function addInvite() {
  const emailInput = document.getElementById("inviteEmailInput");
  const permissionSelect = document.getElementById("invitePermissionSelect");
  const errorEl = document.getElementById("inviteError");

  if (!emailInput || !permissionSelect || !errorEl) return;

  const email = emailInput.value.trim().toLowerCase();
  const permission = permissionSelect.value;

  errorEl.classList.add("hidden");
  errorEl.textContent = "";

  if (!email) {
    showInviteError("Vui lòng nhập email.");
    return;
  }

  if (!isValidEmail(email)) {
    showInviteError("Email không hợp lệ.");
    return;
  }

  if (!["edit", "view"].includes(permission)) {
    showInviteError("Quyền không hợp lệ.");
    return;
  }

  if (invites.some((invite) => invite.email === email)) {
    showInviteError("Email này đã được thêm.");
    return;
  }

  invites.push({
    email,
    permission
  });

  emailInput.value = "";
  renderInviteList();
  updateInviteBadge();
}

function renderInviteList() {
  const container = document.getElementById("inviteAddedList");
  const emptyMsg = document.getElementById("inviteEmptyMsg");

  if (!container) return;

  container.innerHTML = "";

  if (invites.length === 0) {
    const p = document.createElement("p");
    p.id = "inviteEmptyMsg";
    p.className = "placeholder-text";
    p.textContent = "Chưa có ai được mời.";
    container.appendChild(p);
    return;
  }

  invites.forEach((invite, index) => {
    const item = document.createElement("div");
    item.className = "invite-item";

    const left = document.createElement("div");

    const emailSpan = document.createElement("span");
    emailSpan.className = "invite-email";
    emailSpan.textContent = invite.email;

    const permissionSpan = document.createElement("span");
    permissionSpan.className = "invite-permission";
    permissionSpan.textContent =
      invite.permission === "edit" ? "Can edit" : "View only";

    left.appendChild(emailSpan);
    left.appendChild(permissionSpan);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-invite-btn";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove invite");

    removeBtn.addEventListener("click", () => {
      invites.splice(index, 1);
      renderInviteList();
      updateInviteBadge();
    });

    item.appendChild(left);
    item.appendChild(removeBtn);

    container.appendChild(item);
  });
}

function updateInviteBadge() {
  const badge = document.getElementById("inviteCountBadge");

  if (!badge) return;

  badge.textContent = String(invites.length);

  if (invites.length > 0 && currentType === "trip") {
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function showInviteError(message) {
  const errorEl = document.getElementById("inviteError");

  if (!errorEl) return;

  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ==========================================================
   FORM SUBMIT
   ========================================================== */

function initForm() {
  const form = document.getElementById("newTripForm");

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    submitNewTrip();
  });
}

function submitNewTrip() {
  const tripNameInput = document.getElementById("tripName");
  const destinationInput = document.getElementById("destinationInput");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  const tripNameError = document.getElementById("tripNameError");
  const datesError = document.getElementById("datesError");
  const generalError = document.getElementById("formGeneralError");
  const submitBtn = document.getElementById("startPlanningBtn");

  const tripName = tripNameInput ? tripNameInput.value.trim() : "";
  const destination = destinationInput
    ? destinationInput.value.trim()
    : "";
  const startDate = startDateInput ? startDateInput.value : "";
  const endDate = endDateInput ? endDateInput.value : "";

  clearFormErrors();

  /* ---------- Validate Trip/Guide name ---------- */

  if (!tripName) {
    if (tripNameError) {
      tripNameError.textContent =
        currentType === "guide"
          ? "Vui lòng nhập tên Guide."
          : "Vui lòng nhập tên Trip.";

      tripNameError.classList.remove("hidden");
    }

    return;
  }

  /* ---------- Validate dates ---------- */

  if ((startDate && !endDate) || (!startDate && endDate)) {
    if (datesError) {
      datesError.textContent =
        "Vui lòng chọn đầy đủ Start date và End date.";
      datesError.classList.remove("hidden");
    }

    return;
  }

  if (startDate && endDate && endDate < startDate) {
    if (datesError) {
      datesError.textContent =
        "End date không được nhỏ hơn Start date.";
      datesError.classList.remove("hidden");
    }

    return;
  }

  /* ---------- Guide không có tripmates ---------- */

  const payload = {
    type: currentType,
    trip_name: tripName,
    destination,
    start_date: startDate || null,
    end_date: endDate || null,
    invites: currentType === "trip" ? invites : []
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating...";
  }

  fetch("new-trip.php?action=create_trip", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
    .then(async (res) => {
      const text = await res.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch (error) {
        throw new Error(
          "PHP không trả JSON hợp lệ: " + text
        );
      }

      if (!res.ok) {
        throw new Error(
          data.message || "Server error."
        );
      }

      return data;
    })
    .then((data) => {
      if (!data.success) {
        throw new Error(
          data.message || "Không thể tạo."
        );
      }

      /*
       * PHP quyết định redirect:
       * Trip  -> trip.html?id=...
       * Guide -> guide-detail.php?id=...
       */
      if (data.redirect) {
        window.location.href = data.redirect;
        return;
      }

      /*
       * Nếu backend chưa trả redirect thì báo lỗi,
       * không tự đoán URL để tránh đi sai trang.
       */
      throw new Error(
        "Tạo thành công nhưng server không trả redirect."
      );
    })
    .catch((error) => {
      console.error("Create new trip/guide error:", error);

      if (generalError) {
        generalError.textContent =
          error.message || "Không thể tạo dữ liệu.";
        generalError.classList.remove("hidden");
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Start planning";
      }
    });
}

function clearFormErrors() {
  const tripNameError = document.getElementById("tripNameError");
  const datesError = document.getElementById("datesError");
  const generalError = document.getElementById("formGeneralError");
  const inviteError = document.getElementById("inviteError");

  if (tripNameError) {
    tripNameError.classList.add("hidden");
    tripNameError.textContent = "";
  }

  if (datesError) {
    datesError.classList.add("hidden");
    datesError.textContent = "";
  }

  if (generalError) {
    generalError.classList.add("hidden");
    generalError.textContent = "";
  }

  if (inviteError) {
    inviteError.classList.add("hidden");
    inviteError.textContent = "";
  }
}

/* ==========================================================
   SEARCH
   ========================================================== */

function initSearch() {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");

  if (!input || !btn) return;

  function doSearch() {
    const keyword = input.value.trim();

    if (!keyword) return;

    window.location.href =
      "explore.html?q=" + encodeURIComponent(keyword);
  }

  btn.addEventListener("click", doSearch);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      doSearch();
    }
  });
}

/* ==========================================================
   PROFILE
   ========================================================== */

function initProfileButton() {
  const btn = document.getElementById("profileBtn");

  if (!btn) return;

  btn.addEventListener("click", () => {
    fetch("login.php?action=check_login")
      .then((res) => res.json())
      .then((data) => {
        window.location.href = data.logged_in
          ? "profile.html"
          : "login.html";
      })
      .catch(() => {
        window.location.href = "login.html";
      });
  });
}

/* ==========================================================
   CANCEL
   ========================================================== */

function initCancelButton() {
  const btn = document.getElementById("cancelBtn");

  if (!btn) return;

  btn.addEventListener("click", () => {
    window.location.href = "home.html";
  });
}