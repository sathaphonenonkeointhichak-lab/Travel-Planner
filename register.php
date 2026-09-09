<?php
/**
 * register.php
 * Backend xử lý đăng ký tài khoản. Trả về JSON, gọi từ register.js.
 *
 * QUAN TRỌNG: Dùng đúng bảng "users" (chữ thường) với cột id, full_name,
 * email, password, avatar_url - khớp với login.php / profile.php / home.php...
 * Dùng chung getDbConnection() từ config.php (không tự mở kết nối riêng).
 *
 * Action hỗ trợ:
 *   - (POST JSON body {full_name, email, password, confirm_password}) : đăng ký
 */

session_start();

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {

    $pdo = getDbConnection();

    // ========================================
    // GET DATA FROM REGISTER.JS
    // ========================================

    $input = json_decode(file_get_contents('php://input'), true);

    $fullName        = trim($input['full_name'] ?? '');
    $email           = trim($input['email'] ?? '');
    $password        = $input['password'] ?? '';
    $confirmPassword = $input['confirm_password'] ?? '';


    // ========================================
    // VALIDATE INPUT (server không tin JS)
    // ========================================

    if ($fullName === '' || $email === '' || $password === '' || $confirmPassword === '') {
        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng điền đầy đủ các trường.',
        ]);
        return;
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode([
            'success' => false,
            'message' => 'Email không hợp lệ.',
        ]);
        return;
    }

    if (strlen($password) < 6) {
        echo json_encode([
            'success' => false,
            'message' => 'Mật khẩu phải có ít nhất 6 ký tự.',
        ]);
        return;
    }

    if ($password !== $confirmPassword) {
        echo json_encode([
            'success' => false,
            'message' => 'Mật khẩu xác nhận không khớp.',
        ]);
        return;
    }


    // ========================================
    // CHECK EMAIL ĐÃ TỒN TẠI CHƯA
    // ========================================

    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
    $checkStmt->execute(['email' => $email]);

    if ($checkStmt->fetch()) {
        echo json_encode([
            'success' => false,
            'message' => 'Email này đã được đăng ký.',
        ]);
        return;
    }


    // ========================================
    // HASH PASSWORD
    // ========================================

    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);


    // ========================================
    // CREATE USER
    // ========================================

    $insStmt = $pdo->prepare(
        "INSERT INTO users (full_name, email, password, avatar_url, created_at)
         VALUES (:full_name, :email, :password, :avatar_url, NOW())"
    );
    $insStmt->execute([
        'full_name'  => $fullName,
        'email'      => $email,
        'password'   => $hashedPassword,
        'avatar_url' => 'images/avatar-placeholder.png',
    ]);


    // ========================================
    // REGISTER SUCCESS
    // ========================================

    echo json_encode([
        'success'  => true,
        'message'  => 'Đăng ký thành công. Vui lòng đăng nhập.',
        'user_id'  => $pdo->lastInsertId(),
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Lỗi kết nối cơ sở dữ liệu.',
    ]);
}
