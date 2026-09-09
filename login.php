<?php
/**
 * login.php
 * Backend xử lý đăng nhập. Trả về JSON, gọi từ login.js.
 *
 * QUAN TRỌNG: Dùng đúng bảng "users" (chữ thường) với cột id, full_name,
 * email, password, avatar_url - khớp với profile.php / home.php / trip.php...
 * Session lưu bằng $_SESSION['user_id'] (chữ thường) để đồng bộ với
 * toàn bộ các trang khác đang kiểm tra isset($_SESSION['user_id']).
 *
 * Action hỗ trợ:
 *   - (không có action, POST JSON body {email, password}) : xử lý đăng nhập
 *   - check_login (GET) : kiểm tra session hiện tại, dùng để login.js
 *                         tự redirect sang Home nếu user đã đăng nhập sẵn
 */

session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';

if ($action === 'check_login') {
    handleCheckLogin();
    exit;
}

handleLogin();

/* =========================================================
 * check_login: kiểm tra session hiện tại
 * ========================================================= */
function handleCheckLogin(): void {
    echo json_encode([
        'logged_in' => isset($_SESSION['user_id']),
        'user_id'   => $_SESSION['user_id'] ?? null,
    ]);
}

/* =========================================================
 * handleLogin: xử lý đăng nhập từ form (POST JSON body)
 * ========================================================= */
function handleLogin(): void {
    try {
        $pdo = getDbConnection();

        $input = json_decode(file_get_contents('php://input'), true);

        $email = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if ($email === '' || $password === '') {
            echo json_encode([
                'success' => false,
                'message' => 'Vui lòng nhập email và mật khẩu.',
            ]);
            return;
        }

        $stmt = $pdo->prepare(
            "SELECT id, full_name, email, password, avatar_url
             FROM users
             WHERE email = :email
             LIMIT 1"
        );
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Thông báo lỗi giống nhau dù sai email hay sai password
        // (không để lộ email nào đã tồn tại trong hệ thống)
        $invalidMessage = 'Email hoặc mật khẩu không đúng.';

        if (!$user || !password_verify($password, $user['password'])) {
            echo json_encode([
                'success' => false,
                'message' => $invalidMessage,
            ]);
            return;
        }

        // ---- Đăng nhập thành công ----
        session_regenerate_id(true);

        $_SESSION['user_id']   = $user['id'];
        $_SESSION['full_name'] = $user['full_name'];
        $_SESSION['email']     = $user['email'];
        $_SESSION['avatar_url'] = $user['avatar_url'];

        unset($user['password']);

        echo json_encode([
            'success' => true,
            'message' => 'Đăng nhập thành công.',
            'user'    => $user,
        ]);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Lỗi kết nối cơ sở dữ liệu.',
        ]);
    }
}
