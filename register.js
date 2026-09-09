/* ==========================================================
   REGISTER PAGE SCRIPT - Travel Planner
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  redirectIfAlreadyLoggedIn();
  initRegisterForm();
});

/* ----------------------------------------------------------
 * Nếu user đã đăng nhập sẵn (còn session) mà vào lại register.html
 * thì tự chuyển thẳng sang Home.
 * ---------------------------------------------------------- */
function redirectIfAlreadyLoggedIn() {
  fetch("login.php?action=check_login")
    .then((res) => res.json())
    .then((data) => {
      if (data.logged_in) {
        window.location.href = "home.html";
      }
    })
    .catch(() => {
      // Chưa có MySQL / chưa chạy PHP: bỏ qua, cứ hiển thị form register bình thường.
    });
}

function initRegisterForm() {
  const form = document.getElementById("registerForm");
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const errorEl = document.getElementById("registerError");
  const submitBtn = document.getElementById("registerSubmitBtn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    hideError();

    // ---- Validate phía client (server vẫn validate lại, không tin JS) ----
    if (!fullName || !email || !password || !confirmPassword) {
      showError("Vui lòng điền đầy đủ các trường.");
      return;
    }

    if (password.length < 6) {
      showError("Mật khẩu phải có ít nhất 6 ký tự.");
      passwordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      showError("Mật khẩu xác nhận không khớp.");
      confirmPasswordInput.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("register.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          password: password,
          confirm_password: confirmPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "login.html?registered=1";
        return;
      }

      showError(data.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
    } catch (err) {
      console.error(err);
      showError("Không thể kết nối tới server. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  });

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  function hideError() {
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.textContent = isLoading ? "Creating account..." : "Create Account";
  }
}
