<?php
/**
 * explore.php
 * Backend API cho trang Explore. Trả về JSON, được gọi từ explore.js.
 *
 * LƯU Ý: Trang Explore hiện đang hiển thị danh sách địa điểm bằng
 * SAMPLE_PLACES trong explore.js (dữ liệu mẫu để hoàn thiện giao diện).
 * File này chỉ xử lý các phần THỰC SỰ cần MySQL: danh sách Trip của user,
 * danh sách Day trong 1 Trip, và thêm địa điểm vào 1 Day.
 *
 * QUAN TRỌNG: Tên bảng/cột bên dưới (trips, itinerary_days, itinerary_items, places)
 * đang dùng theo đề xuất schema đã thảo luận trước đó. Cần xác nhận lại đúng
 * tên bảng/cột thật trước khi dùng.
 *
 * Các action hỗ trợ (qua ?action=...):
 *   - get_trips     : danh sách Trip của user đang đăng nhập (GET)
 *   - get_days      : danh sách Day của 1 Trip (GET, cần trip_id)
 *   - add_to_trip   : thêm 1 địa điểm vào 1 Day cụ thể (POST)
 *   - toggle_favorite : thêm/bỏ yêu thích 1 địa điểm (POST) - TODO, chưa dùng ở bản hiện tại
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_trips':
        handleGetTrips();
        break;

    case 'get_days':
        handleGetDays();
        break;

    case 'add_to_trip':
        handleAddToTrip();
        break;

    case 'toggle_favorite':
        handleToggleFavorite();
        break;

    case 'list_places':
    handleListPlaces();
    break;

    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        break;
}

/* =========================================================
 * get_trips: lấy danh sách trip của user đang đăng nhập
 * TODO: xác nhận đúng tên bảng "trips" và cột user_id/title
 * ========================================================= */
function handleGetTrips(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true, 'trips' => []]);
        return;
    }

    $pdo = getDbConnection();
    $userId = $_SESSION['user_id'];

    $stmt = $pdo->prepare(
        "SELECT id, title FROM trips WHERE user_id = :user_id ORDER BY start_date DESC"
    );
    $stmt->execute(['user_id' => $userId]);
    $trips = $stmt->fetchAll();

    echo json_encode(['require_login' => false, 'trips' => $trips]);
}

/* =========================================================
 * get_days: lấy danh sách ngày (itinerary_days) của 1 trip
 * TODO: xác nhận đúng tên bảng "itinerary_days" và cột trip_id/day_number/day_date
 * KHÔNG tự tạo ngày mới nếu trip chưa có ngày nào.
 * ========================================================= */
function handleGetDays(): void {
    $tripId = $_GET['trip_id'] ?? null;
    if (!$tripId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing trip_id']);
        return;
    }

    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        "SELECT id, day_number, day_date
         FROM itinerary_days
         WHERE trip_id = :trip_id
         ORDER BY day_number ASC"
    );
    $stmt->execute(['trip_id' => $tripId]);
    $days = $stmt->fetchAll();

    echo json_encode(['days' => $days]);
}

/* =========================================================
 * add_to_trip: thêm 1 địa điểm vào 1 ngày cụ thể
 * TODO: xác nhận đúng tên bảng "itinerary_items" và cột day_id/place_id/title
 * ========================================================= */
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

    // Lấy tên địa điểm từ bảng "places" để lưu vào itinerary_items.title
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
    $insStmt->execute([
        'day_id'   => $dayId,
        'place_id' => $placeId,
        'title'    => $placeName,
    ]);

    echo json_encode(['success' => true]);
}

function handleListPlaces(): void {
    $pdo = getDbConnection();

    $sql = "SELECT
                id,
                name,
                type,
                address,
                price,
                description,
                image_url
            FROM places
            ORDER BY type, id";

    $stmt = $pdo->query($sql);
    $places = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'places' => $places
    ]);
}
/* =========================================================
 * toggle_favorite: TODO - chưa dùng ở bản hiện tại vì explore.js
 * đang xử lý favorite tạm thời phía client theo yêu cầu.
 * Khi cần lưu thật, tạo bảng "place_favorites" (place_id, user_id)
 * và bật lại đoạn fetch tương ứng trong explore.js.
 * ========================================================= */
function handleToggleFavorite(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['require_login' => true]);
        return;
    }

    http_response_code(501);
    echo json_encode(['error' => 'Chưa triển khai - chờ xác nhận bảng place_favorites']);
}
