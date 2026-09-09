<?php
/**
 * profile.php
 * Backend API cho trang Profile. Trả về JSON, gọi từ profile.js.
 *
 * QUAN TRỌNG: Tên bảng/cột dùng theo schema đã thảo luận trước
 * (users, trips, travel_guides, guide_likes). Cần xác nhận lại đúng
 * tên bảng/cột thật trước khi dùng.
 *
 * Action hỗ trợ (qua ?action=...):
 *   - get_profile         : thông tin user đang đăng nhập (GET)
 *   - get_my_trips        : danh sách trip do user tạo (GET)
 *   - get_my_guides       : danh sách guide do user viết (GET)
 *   - get_favorite_guides : danh sách guide user đã like (GET)
 *   - update_profile      : sửa tên/avatar (POST)
 *   - delete_trip         : xoá trip của chính mình (POST)
 *   - delete_guide        : xoá guide của chính mình (POST)
 *   - toggle_favorite_guide : bỏ like 1 guide (dùng cho "Remove from favorites") (POST)
 *   - logout              : hủy session (POST)
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_profile':
        handleGetProfile();
        break;

    case 'get_my_trips':
        handleGetMyTrips();
        break;

    case 'get_my_guides':
        handleGetMyGuides();
        break;

    case 'get_favorite_places':
    handleGetFavoritePlaces();
    break;
    case 'get_favorite_guides':
    handleGetFavoriteGuides();
    break;

    case 'update_profile':
        handleUpdateProfile();
        break;

    case 'delete_trip':
        handleDeleteTrip();
        break;

    case 'delete_guide':
        handleDeleteGuide();
        break;

    case 'toggle_favorite_guide':
        handleToggleFavoriteGuide();
        break;

    case 'logout':
        handleLogout();
        break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

/* =========================================================
 * get_profile: thông tin cơ bản của user đang đăng nhập
 * TODO: xác nhận cột "followers_count"/"following_count" hoặc tính từ bảng follow riêng
 * ========================================================= */
function handleGetProfile(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true]);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT id, full_name AS name, email, avatar_url AS avatar FROM users WHERE id = :id");
    $stmt->execute(['id' => $_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode(['require_login' => true]);
        return;
    }

    $followersStmt = $pdo->prepare("SELECT COUNT(*) FROM author_follows WHERE followed_id = :id");
    $followersStmt->execute(['id' => $user['id']]);
    $user['followers'] = (int) $followersStmt->fetchColumn();

    $followingStmt = $pdo->prepare("SELECT COUNT(*) FROM author_follows WHERE follower_id = :id");
    $followingStmt->execute(['id' => $user['id']]);
    $user['following'] = (int) $followingStmt->fetchColumn();

    echo json_encode(['user' => $user]);
}

/* =========================================================
 * get_my_trips: trip do chính user tạo
 * TODO: xác nhận cột trips.cover_image, start_date/end_date, và cách tính "places count"
 * ========================================================= */
function handleGetMyTrips(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true, 'trips' => []]);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        "SELECT t.id, t.title, t.cover_image AS cover,
                CONCAT(DATE_FORMAT(t.start_date, '%b %e'), '-', DATE_FORMAT(t.end_date, '%e')) AS dateRange,
                (SELECT COUNT(*) FROM itinerary_items ii
                   JOIN itinerary_days d ON d.id = ii.day_id
                   WHERE d.trip_id = t.id) AS placesCount
         FROM trips t
         WHERE t.user_id = :user_id
         ORDER BY t.created_at DESC"
    );
    $stmt->execute(['user_id' => $_SESSION['user_id']]);

    echo json_encode(['trips' => $stmt->fetchAll()]);
}

/* =========================================================
 * get_my_guides: guide do chính user viết
 * TODO: xác nhận tên bảng "travel_guides" (author_id, title, cover_image, views)
 * ========================================================= */
function handleGetMyGuides(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true, 'guides' => []]);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        "SELECT g.id, g.title, g.cover_image AS cover, g.views,
                (SELECT COUNT(*) FROM guide_likes WHERE guide_id = g.id) AS likes
         FROM travel_guides g
         WHERE g.author_id = :user_id
         ORDER BY g.created_at DESC"
    );
    $stmt->execute(['user_id' => $_SESSION['user_id']]);

    echo json_encode(['guides' => $stmt->fetchAll()]);
}

/* =========================================================
 * get_favorite_guides: guide user đã Like (tab "Favorite Guides")
 * TODO: xác nhận tên bảng "guide_likes" (guide_id, user_id)
 * ========================================================= */
function handleGetFavoriteGuides(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true, 'guides' => []]);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        "SELECT g.id, g.title, g.cover_image AS cover, g.views,
                (SELECT COUNT(*) FROM guide_likes WHERE guide_id = g.id) AS likes
         FROM guide_likes l
         JOIN travel_guides g ON g.id = l.guide_id
         WHERE l.user_id = :user_id
         ORDER BY l.created_at DESC"
    );
    $stmt->execute(['user_id' => $_SESSION['user_id']]);

    echo json_encode(['guides' => $stmt->fetchAll()]);
}
function handleGetFavoritePlaces(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode([
            'require_login' => true,
            'places' => []
        ]);
        return;
    }

    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        "SELECT
            p.id,
            p.name AS title,
            p.type,
            p.address,
            p.price,
            p.description,
            p.image_url AS cover
         FROM place_favorites f
         JOIN places p ON p.id = f.place_id
         WHERE f.user_id = :user_id
         ORDER BY f.created_at DESC"
    );

    $stmt->execute([
        'user_id' => $_SESSION['user_id']
    ]);

    echo json_encode([
        'places' => $stmt->fetchAll()
    ]);
}

/* =========================================================
 * update_profile: sửa tên hiển thị + đường dẫn avatar (text, không upload file)
 * ========================================================= */
function handleUpdateProfile(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $name = trim($_POST['name'] ?? '');
    $avatar = trim($_POST['avatar'] ?? '');

    if ($name === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tên hiển thị không được để trống.']);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare("UPDATE users SET full_name = :name, avatar_url = :avatar WHERE id = :id");
    $stmt->execute(['name' => $name, 'avatar' => $avatar, 'id' => $_SESSION['user_id']]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * delete_trip: chỉ cho xoá trip của chính mình
 * ========================================================= */
function handleDeleteTrip(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $tripId = $_POST['trip_id'] ?? null;
    if (!$tripId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu trip_id']);
        return;
    }

    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT user_id FROM trips WHERE id = :id");
    $checkStmt->execute(['id' => $tripId]);
    $ownerId = $checkStmt->fetchColumn();

    if ((int) $ownerId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xoá trip này.']);
        return;
    }

    $pdo->prepare("DELETE FROM trips WHERE id = :id")->execute(['id' => $tripId]);
    echo json_encode(['success' => true]);
}

/* =========================================================
 * delete_guide: chỉ cho xoá guide của chính mình
 * ========================================================= */
function handleDeleteGuide(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
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

    if ((int) $authorId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xoá guide này.']);
        return;
    }

    $pdo->prepare("DELETE FROM travel_guides WHERE id = :id")->execute(['id' => $guideId]);
    echo json_encode(['success' => true]);
}

/* =========================================================
 * toggle_favorite_guide: bỏ like guide (dùng khi bấm "Remove from favorites")
 * Logic giống guide-detail.php's toggle_like_guide, chỉ khác chỗ gọi
 * ========================================================= */
function handleToggleFavoriteGuide(): void {
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

    $checkStmt = $pdo->prepare("SELECT id FROM guide_likes WHERE guide_id = :guide_id AND user_id = :user_id");
    $checkStmt->execute(['guide_id' => $guideId, 'user_id' => $userId]);
    $existing = $checkStmt->fetchColumn();

    if ($existing) {
        $pdo->prepare("DELETE FROM guide_likes WHERE id = :id")->execute(['id' => $existing]);
        echo json_encode(['success' => true, 'liked' => false]);
    } else {
        $pdo->prepare(
            "INSERT INTO guide_likes (guide_id, user_id, created_at) VALUES (:guide_id, :user_id, NOW())"
        )->execute(['guide_id' => $guideId, 'user_id' => $userId]);
        echo json_encode(['success' => true, 'liked' => true]);
    }
}

/* =========================================================
 * logout: hủy session hiện tại
 * ========================================================= */
function handleLogout(): void {
    $_SESSION = [];
    session_destroy();
    echo json_encode(['success' => true]);
}
