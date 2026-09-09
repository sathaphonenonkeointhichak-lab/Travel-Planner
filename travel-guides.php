<?php
/**
 * travel-guides.php
 * Backend API cho trang Travel Guides. Trả về JSON, gọi từ travel-guides.js.
 *
 * LƯU Ý: Danh sách guide hiện đang dùng SAMPLE_GUIDES trong travel-guides.js
 * để hoàn thiện giao diện. File này chỉ xử lý phần THỰC SỰ cần MySQL:
 * kiểm tra đăng nhập, Like/Unlike, và Delete (có kiểm tra quyền sở hữu).
 *
 * QUAN TRỌNG: Tên bảng/cột bên dưới (travel_guides, guide_likes, users) đang
 * dùng theo đề xuất. Cần xác nhận lại đúng tên bảng/cột thật trước khi dùng -
 * bạn nói dữ liệu thật sẽ tự chuẩn bị riêng, nên các bảng này CHƯA được tạo
 * trong bất kỳ file .sql nào, chỉ là tên giả định để code khớp cấu trúc.
 *
 * Action hỗ trợ (qua ?action=...):
 *   - check_login       : kiểm tra session hiện tại (GET)
 *   - toggle_like_guide  : thêm/bỏ like 1 guide, yêu cầu đăng nhập (POST)
 *   - delete_guide       : xoá guide, chỉ chủ guide mới được xoá (POST)
 *   - get_guides         : lấy danh sách guide (GET) - CHƯA dùng, JS đang dùng sample data
 *   - update_guide       : sửa guide (POST) - CHƯA dùng, chờ làm ở Traveler Guide Details
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'check_login':
        handleCheckLogin();
        break;

    case 'toggle_like_guide':
        handleToggleLikeGuide();
        break;

    case 'delete_guide':
        handleDeleteGuide();
        break;

    case 'get_guides':
        handleGetGuides();
        break;

    case 'update_guide':
        handleUpdateGuide();
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

/* =========================================================
 * check_login: kiểm tra session hiện tại
 * ========================================================= */
function handleCheckLogin(): void {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(['logged_in' => true, 'user_id' => $_SESSION['user_id']]);
    } else {
        echo json_encode(['logged_in' => false, 'user_id' => null]);
    }
}

/* =========================================================
 * toggle_like_guide: thêm/bỏ like cho 1 travel guide
 * TODO: xác nhận tên bảng "guide_likes" (guide_id, user_id)
 * ========================================================= */
function handleToggleLikeGuide(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true]);
        return;
    }

    $guideId = $_POST['guide_id'] ?? null;
    if (!$guideId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing guide_id']);
        return;
    }

    $pdo = getDbConnection();
    $userId = $_SESSION['user_id'];

    $checkStmt = $pdo->prepare(
        "SELECT id FROM guide_likes WHERE guide_id = :guide_id AND user_id = :user_id"
    );
    $checkStmt->execute(['guide_id' => $guideId, 'user_id' => $userId]);
    $existing = $checkStmt->fetchColumn();

    if ($existing) {
        $delStmt = $pdo->prepare("DELETE FROM guide_likes WHERE id = :id");
        $delStmt->execute(['id' => $existing]);
        echo json_encode(['success' => true, 'liked' => false]);
    } else {
        $insStmt = $pdo->prepare(
            "INSERT INTO guide_likes (guide_id, user_id, created_at) VALUES (:guide_id, :user_id, NOW())"
        );
        $insStmt->execute(['guide_id' => $guideId, 'user_id' => $userId]);
        echo json_encode(['success' => true, 'liked' => true]);
    }
}

/* =========================================================
 * delete_guide: xoá 1 travel guide, chỉ chủ guide mới được xoá
 * TODO: xác nhận tên bảng "travel_guides" (id, author_id/user_id)
 * ========================================================= */
function handleDeleteGuide(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true]);
        return;
    }

    $guideId = $_POST['guide_id'] ?? null;
    if (!$guideId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu guide_id']);
        return;
    }

    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT author_id FROM travel_guides WHERE id = :id");
    $checkStmt->execute(['id' => $guideId]);
    $authorId = $checkStmt->fetchColumn();

    if ($authorId === false) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy Travel Guide.']);
        return;
    }

    if ((int) $authorId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xoá Travel Guide này.']);
        return;
    }

    $delStmt = $pdo->prepare("DELETE FROM travel_guides WHERE id = :id");
    $delStmt->execute(['id' => $guideId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * get_guides: lấy danh sách guide từ MySQL thật (bảng travel_guides + users)
 * ========================================================= */
function handleGetGuides(): void {
    $pdo = getDbConnection();
    $currentUserId = $_SESSION['user_id'] ?? null;

    $sql = "SELECT g.id, g.title, g.description, g.cover_image, g.region, g.views, g.author_id,
                   u.full_name AS author_name, u.avatar_url AS author_avatar,
                   (SELECT COUNT(*) FROM guide_likes WHERE guide_id = g.id) AS likes
            FROM travel_guides g
            JOIN users u ON u.id = g.author_id
            ORDER BY g.created_at DESC";

    $stmt = $pdo->query($sql);
    $guides = $stmt->fetchAll();

    $likeStmt = $currentUserId
        ? $pdo->prepare("SELECT 1 FROM guide_likes WHERE guide_id = :guide_id AND user_id = :user_id")
        : null;

    foreach ($guides as &$g) {
        $g['liked_by_user'] = false;
        if ($likeStmt) {
            $likeStmt->execute(['guide_id' => $g['id'], 'user_id' => $currentUserId]);
            $g['liked_by_user'] = (bool) $likeStmt->fetchColumn();
        }
    }
    unset($g);

    echo json_encode(['guides' => $guides]);
}

/* =========================================================
 * update_guide: sửa nội dung guide (CHƯA dùng - sẽ làm ở Traveler Guide Details)
 * TODO: chỉ cho sửa nếu travel_guides.author_id === session user_id
 * ========================================================= */
function handleUpdateGuide(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    http_response_code(501);
    echo json_encode(['success' => false, 'message' => 'Chức năng Edit sẽ hoàn thiện ở trang Traveler Guide Details.']);
}