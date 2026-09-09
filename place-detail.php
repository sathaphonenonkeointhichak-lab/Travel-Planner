<?php
/**
 * place-detail.php
 * Backend API cho trang Place Detail. Trả về JSON, gọi từ place-detail.js.
 *
 * Action ĐANG được gọi thật từ place-detail.js:
 *   - check_login, get_trips, get_days, add_to_trip,
 *     get_place, get_reviews, add_review, edit_review,
 *     delete_review, toggle_favorite
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'check_login':
        handleCheckLogin();
        break;

    case 'get_trips':
        handleGetTrips();
        break;

    case 'get_days':
        handleGetDays();
        break;

    case 'add_to_trip':
        handleAddToTrip();
        break;

    case 'get_place':
        handleGetPlace();
        break;

    case 'get_reviews':
        handleGetReviews();
        break;

    case 'add_review':
        handleAddReview();
        break;

    case 'edit_review':
        handleEditReview();
        break;

    case 'delete_review':
        handleDeleteReview();
        break;

    case 'toggle_favorite':
        handleToggleFavorite();
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
        echo json_encode(['logged_in' => false]);
    }
}

/* =========================================================
 * get_trips / get_days / add_to_trip: giống explore.php
 * TODO: xác nhận tên bảng "trips", "itinerary_days", "itinerary_items", "places"
 * ========================================================= */
function handleGetTrips(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true, 'trips' => []]);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        "SELECT id, title FROM trips WHERE user_id = :user_id ORDER BY start_date DESC"
    );
    $stmt->execute(['user_id' => $_SESSION['user_id']]);
    echo json_encode(['require_login' => false, 'trips' => $stmt->fetchAll()]);
}

function handleGetDays(): void {
    $tripId = $_GET['trip_id'] ?? null;
    if (!$tripId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing trip_id']);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        "SELECT id, day_number, day_date FROM itinerary_days WHERE trip_id = :trip_id ORDER BY day_number ASC"
    );
    $stmt->execute(['trip_id' => $tripId]);
    echo json_encode(['days' => $stmt->fetchAll()]);
}

function handleAddToTrip(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $placeId = $_POST['place_id'] ?? null;
    $dayId   = $_POST['day_id'] ?? null;

    if (!$placeId || !$dayId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu place_id hoặc day_id']);
        return;
    }

    $pdo = getDbConnection();

    $placeStmt = $pdo->prepare("SELECT name FROM places WHERE id = :id");
    $placeStmt->execute(['id' => $placeId]);
    $placeName = $placeStmt->fetchColumn();

    if (!$placeName) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy địa điểm.']);
        return;
    }

    $insStmt = $pdo->prepare(
        "INSERT INTO itinerary_items (day_id, place_id, title, item_type, order_index)
         VALUES (:day_id, :place_id, :title, 'other', 0)"
    );
    $insStmt->execute(['day_id' => $dayId, 'place_id' => $placeId, 'title' => $placeName]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * get_place: lấy thông tin 1 địa điểm + rating trung bình + trạng thái favorite
 * ========================================================= */
function handleGetPlace(): void {
    $placeId = $_GET['id'] ?? null;
    if (!$placeId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing id']);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT * FROM places WHERE id = :id");
    $stmt->execute(['id' => $placeId]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['place' => null]);
        return;
    }

    $ratingStmt = $pdo->prepare("SELECT AVG(rating) FROM reviews WHERE place_id = :id");
    $ratingStmt->execute(['id' => $placeId]);
    $avgRating = (float) $ratingStmt->fetchColumn();

    $isFavorited = false;
    if (isset($_SESSION['user_id'])) {
        $favStmt = $pdo->prepare("SELECT id FROM place_favorites WHERE place_id = :p AND user_id = :u");
        $favStmt->execute(['p' => $placeId, 'u' => $_SESSION['user_id']]);
        $isFavorited = (bool) $favStmt->fetchColumn();
    }

    $images = [];
    if (!empty($row['image_urls'])) {
        $decoded = json_decode($row['image_urls'], true);
        if (is_array($decoded)) {
            $images = array_values($decoded);
        }
    }
    if (empty($images) && !empty($row['image_url'])) {
        $images = [$row['image_url']];
    }
    if (empty($images)) {
        $images = ['images/place-placeholder.jpg'];
    }

    $place = [
        'id'           => $row['id'],
        'type'         => $row['type'],
        'name'         => $row['name'],
        'rating'       => round($avgRating, 1),
        'address'      => $row['address'],
        'shortInfo'    => $row['description'],
        'price'        => $row['price'],
        'about'        => $row['about'] ?: $row['description'],
        'images'       => $images,
        'info'         => buildPlaceInfo($row),
        'is_favorited' => $isFavorited,
    ];

    echo json_encode(['place' => $place]);
}

/* TODO: schema "places" chưa có cột riêng cho Amenities/Room information/
 * Cuisine/Opening hours theo từng loại - tạm dùng "about"/"price" chung.
 * Nếu cần đúng nghĩa hơn, cần thêm cột riêng vào bảng places. */
function buildPlaceInfo(array $row): array {
    switch ($row['type']) {
        case 'hotel':
            return [
                'Amenities'        => $row['about'] ?: 'Đang cập nhật',
                'Room information' => $row['price'] ?: 'Đang cập nhật',
            ];
        case 'restaurant':
            return [
                'Cuisine'     => $row['about'] ?: 'Đang cập nhật',
                'Price range' => $row['price'] ?: 'Đang cập nhật',
            ];
        case 'cafe':
            return [
                'Type of cafe' => $row['about'] ?: 'Đang cập nhật',
                'Price range'  => $row['price'] ?: 'Đang cập nhật',
            ];
        default: // attraction
            return [
                'Opening hours' => 'Đang cập nhật',
                'Ticket price'  => $row['price'] ?: 'Miễn phí',
            ];
    }
}

/* =========================================================
 * get_reviews: lấy danh sách review của 1 địa điểm, trả đúng field
 * mà place-detail.js cần (userName/avatar/rating/comment/date/isOwner)
 * ========================================================= */
function handleGetReviews(): void {
    $placeId = $_GET['place_id'] ?? null;
    if (!$placeId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing place_id']);
        return;
    }

    $pdo = getDbConnection();
    $currentUserId = $_SESSION['user_id'] ?? null;

    $stmt = $pdo->prepare(
        "SELECT r.id, r.rating, r.comment, r.created_at, r.user_id,
                u.full_name AS user_name, u.avatar_url AS avatar
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.place_id = :place_id
         ORDER BY r.created_at DESC"
    );
    $stmt->execute(['place_id' => $placeId]);
    $rows = $stmt->fetchAll();

    $reviews = array_map(function ($r) use ($currentUserId) {
        return [
            'id'       => $r['id'],
            'userName' => $r['user_name'],
            'avatar'   => $r['avatar'] ?: 'images/avatar-placeholder.png',
            'rating'   => (int) $r['rating'],
            'comment'  => $r['comment'],
            'date'     => date('F j, Y', strtotime($r['created_at'])),
            'isOwner'  => $currentUserId !== null && (int) $r['user_id'] === (int) $currentUserId,
        ];
    }, $rows);

    echo json_encode(['reviews' => $reviews]);
}

/* =========================================================
 * add_review: thêm review mới (CHƯA dùng - JS đang xử lý client-side)
 * TODO: xác nhận tên bảng "reviews"; validate rating 1-5, comment không trống
 * ========================================================= */
function handleAddReview(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $placeId = $_POST['place_id'] ?? null;
    $rating  = (int) ($_POST['rating'] ?? 0);
    $comment = trim($_POST['comment'] ?? '');

    if (!$placeId || $rating < 1 || $rating > 5 || $comment === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu review không hợp lệ.']);
        return;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare(
        "INSERT INTO reviews (place_id, user_id, rating, comment, created_at)
         VALUES (:place_id, :user_id, :rating, :comment, NOW())"
    );
    $stmt->execute([
        'place_id' => $placeId,
        'user_id'  => $_SESSION['user_id'],
        'rating'   => $rating,
        'comment'  => $comment,
    ]);

    echo json_encode(['success' => true, 'review_id' => $pdo->lastInsertId()]);
}

/* =========================================================
 * edit_review: sửa review của chính user (CHƯA dùng)
 * TODO: chỉ cho sửa nếu review.user_id === session user_id
 * ========================================================= */
function handleEditReview(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $reviewId = $_POST['review_id'] ?? null;
    $rating   = (int) ($_POST['rating'] ?? 0);
    $comment  = trim($_POST['comment'] ?? '');

    if (!$reviewId || $rating < 1 || $rating > 5 || $comment === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu review không hợp lệ.']);
        return;
    }

    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT user_id FROM reviews WHERE id = :id");
    $checkStmt->execute(['id' => $reviewId]);
    $ownerId = $checkStmt->fetchColumn();

    if ((int) $ownerId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền sửa review này.']);
        return;
    }

    $updStmt = $pdo->prepare("UPDATE reviews SET rating = :rating, comment = :comment WHERE id = :id");
    $updStmt->execute(['rating' => $rating, 'comment' => $comment, 'id' => $reviewId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * delete_review: xoá review của chính user (CHƯA dùng)
 * TODO: chỉ cho xoá nếu review.user_id === session user_id
 * ========================================================= */
function handleDeleteReview(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $reviewId = $_POST['review_id'] ?? null;
    if (!$reviewId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu review_id.']);
        return;
    }

    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT user_id FROM reviews WHERE id = :id");
    $checkStmt->execute(['id' => $reviewId]);
    $ownerId = $checkStmt->fetchColumn();

    if ((int) $ownerId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xoá review này.']);
        return;
    }

    $delStmt = $pdo->prepare("DELETE FROM reviews WHERE id = :id");
    $delStmt->execute(['id' => $reviewId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * toggle_favorite: thêm/bỏ yêu thích địa điểm (CHƯA dùng - JS đang xử lý client-side)
 * TODO: tạo bảng "place_favorites" (place_id, user_id) rồi bật lại đoạn
 * fetch tương ứng trong place-detail.js
 * ========================================================= */
function handleToggleFavorite(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true]);
        return;
    }

    $placeId = $_POST['place_id'] ?? null;
    if (!$placeId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing place_id']);
        return;
    }

    $pdo = getDbConnection();
    $userId = $_SESSION['user_id'];

    $checkStmt = $pdo->prepare(
        "SELECT id FROM place_favorites WHERE place_id = :place_id AND user_id = :user_id"
    );
    $checkStmt->execute(['place_id' => $placeId, 'user_id' => $userId]);
    $existing = $checkStmt->fetchColumn();

    if ($existing) {
        $delStmt = $pdo->prepare("DELETE FROM place_favorites WHERE id = :id");
        $delStmt->execute(['id' => $existing]);
        echo json_encode(['success' => true, 'favorited' => false]);
    } else {
        $insStmt = $pdo->prepare(
            "INSERT INTO place_favorites (place_id, user_id, created_at) VALUES (:place_id, :user_id, NOW())"
        );
        $insStmt->execute(['place_id' => $placeId, 'user_id' => $userId]);
        echo json_encode(['success' => true, 'favorited' => true]);
    }
}