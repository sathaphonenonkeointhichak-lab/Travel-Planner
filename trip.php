<?php
/**
 * trip.php
 * Backend API cho trang Trip. Trả về JSON, gọi từ trip.js.
 *
 * QUAN TRỌNG: MỌI action ghi dữ liệu (add/update/remove/expense/rename/
 * delete/checklist) đều bắt buộc đi qua requireTripAccess() để kiểm tra
 * quyền ở backend - không dựa vào việc ẩn/hiện nút bên JS.
 *
 * Vai trò (role) của user với 1 trip:
 *   - 'owner' : trips.user_id === session user_id -> full quyền
 *   - 'edit'  : có dòng trong trip_members với permission = 'edit'
 *   - 'view'  : có dòng trong trip_members với permission = 'view'
 *   - null    : không thuộc trip (nếu trip.privacy = 'private' -> KHÔNG được xem)
 */

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'get_trip':
        handleGetTrip();
        break;

    case 'invite_member':
        handleInviteMember();
        break;

    case 'add_place_to_day':
        handleAddPlaceToDay();
        break;

    case 'update_place':
        handleUpdatePlace();
        break;

    case 'remove_place_from_day':
        handleRemovePlaceFromDay();
        break;

    case 'add_checklist_item':
        handleAddChecklistItem();
        break;

    case 'toggle_checklist_item':
        handleToggleChecklistItem();
        break;

    case 'delete_checklist_item':
        handleDeleteChecklistItem();
        break;

    case 'add_expense':
        handleAddExpense();
        break;

    case 'rename_trip':
        handleRenameTrip();
        break;

    case 'delete_trip':
        handleDeleteTrip();
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
 * requireTripAccess: xác định role của user hiện tại với 1 trip.
 * $minRole: 'view' hoặc 'edit' - action cần tối thiểu quyền gì.
 * Trả về mảng ['ok' => bool, 'role' => string|null, 'trip' => row|null].
 * Nếu $minRole = 'edit', chỉ 'owner' hoặc 'edit' mới ok=true.
 * Nếu $minRole = 'view', 'owner'/'edit'/'view' đều ok=true; ngoài ra nếu
 * trip.privacy khác 'private' thì cho xem dù không phải member.
 * ========================================================= */
function requireTripAccess(PDO $pdo, $tripId, string $minRole): array {
    $stmt = $pdo->prepare("SELECT * FROM trips WHERE id = :id");
    $stmt->execute(['id' => $tripId]);
    $trip = $stmt->fetch();

    if (!$trip) {
        return ['ok' => false, 'role' => null, 'trip' => null];
    }

    $userId = $_SESSION['user_id'] ?? null;
    $role = null;

    if ($userId !== null && (int) $trip['user_id'] === (int) $userId) {
        $role = 'owner';
    } elseif ($userId !== null) {
        $memStmt = $pdo->prepare("SELECT permission FROM trip_members WHERE trip_id = :t AND user_id = :u");
        $memStmt->execute(['t' => $tripId, 'u' => $userId]);
        $perm = $memStmt->fetchColumn();
        if ($perm === 'edit') $role = 'edit';
        elseif ($perm === 'view') $role = 'view';
    }

    if ($minRole === 'view') {
        if ($role !== null) {
            return ['ok' => true, 'role' => $role, 'trip' => $trip];
        }
        if ($trip['privacy'] !== 'private') {
            return ['ok' => true, 'role' => 'guest', 'trip' => $trip];
        }
        return ['ok' => false, 'role' => null, 'trip' => $trip];
    }

    return ['ok' => in_array($role, ['owner', 'edit'], true), 'role' => $role, 'trip' => $trip];
}

/* =========================================================
 * get_trip: lấy toàn bộ dữ liệu 1 trip - có kiểm tra quyền xem (privacy)
 * ========================================================= */
function handleGetTrip(): void {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing id']);
        return;
    }

    $pdo = getDbConnection();
    $access = requireTripAccess($pdo, $id, 'view');

    if (!$access['trip']) {
        echo json_encode(['trip' => null]);
        return;
    }

    if (!$access['ok']) {
        http_response_code(403);
        echo json_encode(['trip' => null, 'access_denied' => true]);
        return;
    }

    $trip = $access['trip'];
    $trip['my_role'] = $access['role'];

    $ownerStmt = $pdo->prepare("SELECT full_name, avatar_url FROM users WHERE id = :id");
    $ownerStmt->execute(['id' => $trip['user_id']]);
    $owner = $ownerStmt->fetch();
    $trip['owner_name'] = $owner['full_name'] ?? null;
    $trip['owner_avatar'] = $owner['avatar_url'] ?? null;

    $membersStmt = $pdo->prepare(
        "SELECT tm.user_id, tm.permission, u.full_name AS name, u.avatar_url AS avatar
         FROM trip_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.trip_id = :trip_id"
    );
    $membersStmt->execute(['trip_id' => $id]);
    $trip['members'] = $membersStmt->fetchAll();

    $daysStmt = $pdo->prepare(
        "SELECT id, day_number, day_date FROM itinerary_days WHERE trip_id = :trip_id ORDER BY day_number ASC"
    );
    $daysStmt->execute(['trip_id' => $id]);
    $days = $daysStmt->fetchAll();

    $itemsStmt = $pdo->prepare(
        "SELECT id, day_id, place_id, title, start_time, cost, description, order_index
         FROM itinerary_items WHERE day_id = :day_id ORDER BY order_index ASC"
    );
    $checklistStmt = $pdo->prepare(
        "SELECT id, content, is_done, order_index FROM checklist_items WHERE item_id = :item_id ORDER BY order_index ASC"
    );

    $itineraryTotal = 0;

    foreach ($days as &$day) {
        $itemsStmt->execute(['day_id' => $day['id']]);
        $places = $itemsStmt->fetchAll();

        $dayTotal = 0;
        foreach ($places as &$place) {
            $checklistStmt->execute(['item_id' => $place['id']]);
            $place['checklist'] = $checklistStmt->fetchAll();
            $place['cost'] = $place['cost'] !== null ? (float) $place['cost'] : 0;
            $dayTotal += $place['cost'];
        }
        unset($place);

        $day['places'] = $places;
        $day['day_total'] = $dayTotal;
        $itineraryTotal += $dayTotal;
    }
    unset($day);

    $trip['days'] = $days;

    $expensesStmt = $pdo->prepare("SELECT id, category AS note, amount, expense_date FROM expenses WHERE trip_id = :trip_id");
    $expensesStmt->execute(['trip_id' => $id]);
    $expenses = $expensesStmt->fetchAll();
    $expensesTotal = array_sum(array_column($expenses, 'amount'));

    $trip['expenses'] = $expenses;
    $trip['budgeting'] = [
        'by_day' => array_map(fn($d) => ['day_number' => $d['day_number'], 'total' => $d['day_total']], $days),
        'itinerary_total' => $itineraryTotal,
        'expenses_total' => (float) $expensesTotal,
        'grand_total' => $itineraryTotal + (float) $expensesTotal,
    ];

    echo json_encode(['trip' => $trip]);
}

/* =========================================================
 * invite_member: mời thêm người vào trip - chỉ owner mới được mời
 * ========================================================= */
function handleInviteMember(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $tripId = $_POST['trip_id'] ?? null;
    $email = $_POST['email'] ?? '';
    $permission = $_POST['permission'] ?? 'view';

    if (!$tripId || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ.']);
        return;
    }

    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT user_id FROM trips WHERE id = :id");
    $checkStmt->execute(['id' => $tripId]);
    $ownerId = $checkStmt->fetchColumn();

    if ((int) $ownerId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Chỉ chủ trip mới được mời thêm thành viên.']);
        return;
    }

    if (!in_array($permission, ['edit', 'view'], true)) {
        $permission = 'view';
    }

    $userStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $userStmt->execute(['email' => $email]);
    $inviteeId = $userStmt->fetchColumn();

    if (!$inviteeId) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy user với email này.']);
        return;
    }

    $insStmt = $pdo->prepare(
        "INSERT INTO trip_members (trip_id, user_id, permission, created_at)
         VALUES (:trip_id, :user_id, :permission, NOW())
         ON DUPLICATE KEY UPDATE permission = :permission2"
    );
    $insStmt->execute([
        'trip_id' => $tripId, 'user_id' => $inviteeId,
        'permission' => $permission, 'permission2' => $permission,
    ]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * add_place_to_day: thêm 1 địa điểm vào Day - cần quyền edit
 * order_index = MAX hiện có trong ngày đó + 1
 * ========================================================= */
function handleAddPlaceToDay(): void {
    $dayId = $_POST['day_id'] ?? null;
    $placeId = $_POST['place_id'] ?? null;

    if (!$dayId || !$placeId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu day_id hoặc place_id']);
        return;
    }

    $pdo = getDbConnection();

    $tripId = getTripIdFromDay($pdo, $dayId);
    if (!$tripId) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy ngày này.']);
        return;
    }

    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $placeStmt = $pdo->prepare("SELECT name FROM places WHERE id = :id");
    $placeStmt->execute(['id' => $placeId]);
    $placeName = $placeStmt->fetchColumn();

    if (!$placeName) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy địa điểm.']);
        return;
    }

    $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(order_index), 0) FROM itinerary_items WHERE day_id = :day_id");
    $maxStmt->execute(['day_id' => $dayId]);
    $nextOrder = (int) $maxStmt->fetchColumn() + 1;

    $insStmt = $pdo->prepare(
        "INSERT INTO itinerary_items (day_id, place_id, title, item_type, order_index)
         VALUES (:day_id, :place_id, :title, 'other', :order_index)"
    );
    $insStmt->execute([
        'day_id' => $dayId, 'place_id' => $placeId,
        'title' => $placeName, 'order_index' => $nextOrder,
    ]);

    echo json_encode(['success' => true, 'item_id' => $pdo->lastInsertId(), 'order_index' => $nextOrder]);
}

/* =========================================================
 * update_place: cập nhật time/cost/note - cần quyền edit
 * ========================================================= */
function handleUpdatePlace(): void {
    $itemId = $_POST['item_id'] ?? null;
    $time = isset($_POST['time']) && $_POST['time'] !== '' ? $_POST['time'] : null;
    $cost = $_POST['cost'] ?? null;
    $note = $_POST['note'] ?? null;

    if (!$itemId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu item_id']);
        return;
    }

    $pdo = getDbConnection();

    $tripId = getTripIdFromItem($pdo, $itemId);
    if (!$tripId) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy mục này.']);
        return;
    }

    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $cost = ($cost === null || $cost === '') ? null : (float) $cost;

    $stmt = $pdo->prepare(
        "UPDATE itinerary_items SET start_time = :time, cost = :cost, description = :note WHERE id = :id"
    );
    $stmt->execute(['time' => $time, 'cost' => $cost, 'note' => $note, 'id' => $itemId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * remove_place_from_day: xoá 1 item khỏi Day - cần quyền edit
 * ========================================================= */
function handleRemovePlaceFromDay(): void {
    $itemId = $_POST['item_id'] ?? null;
    if (!$itemId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu item_id']);
        return;
    }

    $pdo = getDbConnection();

    $tripId = getTripIdFromItem($pdo, $itemId);
    if (!$tripId) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy mục này.']);
        return;
    }

    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $stmt = $pdo->prepare("DELETE FROM itinerary_items WHERE id = :id");
    $stmt->execute(['id' => $itemId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * checklist: add / toggle / delete - đều cần quyền edit
 * ========================================================= */
function handleAddChecklistItem(): void {
    $itemId = $_POST['item_id'] ?? null;
    $content = trim($_POST['content'] ?? '');

    if (!$itemId || $content === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu dữ liệu checklist.']);
        return;
    }

    $pdo = getDbConnection();
    $tripId = getTripIdFromItem($pdo, $itemId);
    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$tripId || !$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $maxStmt = $pdo->prepare("SELECT COALESCE(MAX(order_index), 0) FROM checklist_items WHERE item_id = :item_id");
    $maxStmt->execute(['item_id' => $itemId]);
    $nextOrder = (int) $maxStmt->fetchColumn() + 1;

    $insStmt = $pdo->prepare(
        "INSERT INTO checklist_items (item_id, content, order_index) VALUES (:item_id, :content, :order_index)"
    );
    $insStmt->execute(['item_id' => $itemId, 'content' => $content, 'order_index' => $nextOrder]);

    echo json_encode(['success' => true, 'checklist_id' => $pdo->lastInsertId()]);
}

function handleToggleChecklistItem(): void {
    $checklistId = $_POST['checklist_id'] ?? null;
    if (!$checklistId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu checklist_id']);
        return;
    }

    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        "SELECT ii.id AS item_id FROM checklist_items c
         JOIN itinerary_items ii ON ii.id = c.item_id
         WHERE c.id = :id"
    );
    $stmt->execute(['id' => $checklistId]);
    $itemId = $stmt->fetchColumn();

    $tripId = $itemId ? getTripIdFromItem($pdo, $itemId) : null;
    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$tripId || !$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $updStmt = $pdo->prepare("UPDATE checklist_items SET is_done = NOT is_done WHERE id = :id");
    $updStmt->execute(['id' => $checklistId]);

    echo json_encode(['success' => true]);
}

function handleDeleteChecklistItem(): void {
    $checklistId = $_POST['checklist_id'] ?? null;
    if (!$checklistId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu checklist_id']);
        return;
    }

    $pdo = getDbConnection();

    $stmt = $pdo->prepare(
        "SELECT ii.id AS item_id FROM checklist_items c
         JOIN itinerary_items ii ON ii.id = c.item_id
         WHERE c.id = :id"
    );
    $stmt->execute(['id' => $checklistId]);
    $itemId = $stmt->fetchColumn();

    $tripId = $itemId ? getTripIdFromItem($pdo, $itemId) : null;
    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$tripId || !$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $delStmt = $pdo->prepare("DELETE FROM checklist_items WHERE id = :id");
    $delStmt->execute(['id' => $checklistId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * add_expense: thêm chi phí - cần quyền edit (trước đây chỉ check login)
 * ========================================================= */
function handleAddExpense(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $tripId = $_POST['trip_id'] ?? null;
    $note = trim($_POST['note'] ?? '');
    $amount = (int) ($_POST['amount'] ?? 0);

    if (!$tripId || $note === '' || $amount <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu chi phí không hợp lệ.']);
        return;
    }

    $pdo = getDbConnection();
    $access = requireTripAccess($pdo, $tripId, 'edit');
    if (!$access['ok']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền chỉnh sửa trip này.']);
        return;
    }

    $stmt = $pdo->prepare(
        "INSERT INTO expenses (trip_id, created_by, category, amount, expense_date, created_at)
         VALUES (:trip_id, :created_by, :category, :amount, CURDATE(), NOW())"
    );
    $stmt->execute([
        'trip_id'    => $tripId,
        'created_by' => $_SESSION['user_id'],
        'category'   => $note,
        'amount'     => $amount,
    ]);

    echo json_encode(['success' => true, 'expense_id' => $pdo->lastInsertId()]);
}

/* =========================================================
 * rename_trip: đổi tên trip - chỉ owner (trước đây KHÔNG check)
 * ========================================================= */
function handleRenameTrip(): void {
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']);
        return;
    }

    $tripId = $_POST['trip_id'] ?? null;
    $newTitle = trim($_POST['title'] ?? '');

    if (!$tripId || $newTitle === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ.']);
        return;
    }

    $pdo = getDbConnection();

    $checkStmt = $pdo->prepare("SELECT user_id FROM trips WHERE id = :id");
    $checkStmt->execute(['id' => $tripId]);
    $ownerId = $checkStmt->fetchColumn();

    if ((int) $ownerId !== (int) $_SESSION['user_id']) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Chỉ chủ trip mới được đổi tên.']);
        return;
    }

    $stmt = $pdo->prepare("UPDATE trips SET title = :title WHERE id = :id");
    $stmt->execute(['title' => $newTitle, 'id' => $tripId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * delete_trip: xoá trip - chỉ owner
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

    $delStmt = $pdo->prepare("DELETE FROM trips WHERE id = :id");
    $delStmt->execute(['id' => $tripId]);

    echo json_encode(['success' => true]);
}

/* ---------------- Helpers ---------------- */
function getTripIdFromDay(PDO $pdo, $dayId) {
    $stmt = $pdo->prepare("SELECT trip_id FROM itinerary_days WHERE id = :id");
    $stmt->execute(['id' => $dayId]);
    return $stmt->fetchColumn() ?: null;
}

/* =========================================================
 * list_places: lấy danh sách places thật cho cột "Choose Place"
 * (dùng chung bảng "places" với Explore, không dùng dữ liệu mẫu)
 * ========================================================= */
function handleListPlaces(): void {
    $pdo = getDbConnection();
    $stmt = $pdo->query(
        "SELECT id, name, type, address, price, description, image_url FROM places ORDER BY name ASC"
    );
    echo json_encode(['places' => $stmt->fetchAll()]);
}

function getTripIdFromItem(PDO $pdo, $itemId) {
    $stmt = $pdo->prepare(
        "SELECT d.trip_id FROM itinerary_items i
         JOIN itinerary_days d ON d.id = i.day_id
         WHERE i.id = :id"
    );
    $stmt->execute(['id' => $itemId]);
    return $stmt->fetchColumn() ?: null;
}