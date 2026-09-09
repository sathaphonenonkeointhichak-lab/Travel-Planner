/* ==========================================================
   LOGIN PAGE SCRIPT - Travel Planner
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  redirectIfAlreadyLoggedIn();
  initLoginForm();
  showRegisteredMessageIfNeeded();
});

/* ----------------------------------------------------------
 * Nếu vừa đăng ký xong (register.js redirect sang login.html?registered=1)
 * thì hiển thị thông báo thành công phía trên form.
 * ---------------------------------------------------------- */
function showRegisteredMessageIfNeeded() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "1") {
    const successEl = document.getElementById("loginSuccess");
    successEl.textContent = "Đăng ký thành công! Vui lòng đăng nhập.";
    successEl.classList.remove("hidden");
  }
}

/* ----------------------------------------------------------
 * Nếu user đã đăng nhập sẵn (còn session) mà vào lại login.html
 * thì tự chuyển thẳng sang Home, khỏi cần login lại.
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
      // Chưa có MySQL / chưa chạy PHP: bỏ qua, cứ hiển thị form login bình thường.
    });
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorEl = document.getElementById("loginError");
  const submitBtn = document.getElementById("loginSubmitBtn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    hideError();

    if (!email || !password) {
      showError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        window.location.href = "home.html";
        return;
      }

      showError(data.message || "Email hoặc mật khẩu không đúng.");
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
    submitBtn.textContent = isLoading ? "Logging in..." : "Login";
  }
}
