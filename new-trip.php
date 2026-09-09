<?php
/**
 * new-trip.php
 * Backend tạo Trip hoặc Write Guide.
 *
 * Dữ liệu nhận từ new-trip.js:
 *   - type: "trip" hoặc "guide"
 *   - trip_name
 *   - destination
 *   - start_date
 *   - end_date
 *   - invites: [{ email, permission }]
 *
 * Không dùng dữ liệu mẫu.
 * Không nhận privacy từ client.
 * Trip mới luôn được tạo với privacy = "private".
 */

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'create_trip':
        handleCreateTrip();
        break;

    default:
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid action'
        ]);
        break;
}


/* =========================================================
 * CREATE TRIP / CREATE GUIDE
 * ========================================================= */
function handleCreateTrip(): void
{
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);

        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng đăng nhập để tạo Trip hoặc Guide.'
        ]);

        return;
    }

    /*
     * new-trip.js gửi JSON body
     */
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!is_array($input)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Dữ liệu gửi lên không hợp lệ.'
        ]);

        return;
    }

    $type = $input['type'] ?? 'trip';

    $tripName = trim($input['trip_name'] ?? '');
    $destination = trim($input['destination'] ?? '');

    $startDate = $input['start_date'] ?? null;
    $endDate = $input['end_date'] ?? null;

    $invites = $input['invites'] ?? [];

    /* =====================================================
     * VALIDATE TYPE
     * ===================================================== */
    if (!in_array($type, ['trip', 'guide'], true)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Loại tạo dữ liệu không hợp lệ.'
        ]);

        return;
    }

    /* =====================================================
     * VALIDATE NAME
     * ===================================================== */
    if ($tripName === '') {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => $type === 'guide'
                ? 'Tên Guide không được để trống.'
                : 'Tên Trip không được để trống.'
        ]);

        return;
    }

    /* =====================================================
     * VALIDATE DATES
     * ===================================================== */

    // Cho phép cả hai cùng null.
    // Nhưng nếu đã chọn một thì phải chọn đủ hai.
    if (($startDate && !$endDate) || (!$startDate && $endDate)) {
        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Vui lòng chọn đầy đủ Start date và End date.'
        ]);

        return;
    }

    if ($startDate && $endDate) {
        if (!isValidDate($startDate) || !isValidDate($endDate)) {
            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Ngày không hợp lệ.'
            ]);

            return;
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'End date không được nhỏ hơn Start date.'
            ]);

            return;
        }
    }

    /*
     * Guide không dùng tripmates.
     * Chỉ xử lý invites khi type = trip.
     */
    if ($type === 'trip') {
        if (!is_array($invites)) {
            http_response_code(400);

            echo json_encode([
                'success' => false,
                'message' => 'Danh sách tripmates không hợp lệ.'
            ]);

            return;
        }

        foreach ($invites as $invite) {
            $email = trim(strtolower($invite['email'] ?? ''));
            $permission = $invite['permission'] ?? '';

            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);

                echo json_encode([
                    'success' => false,
                    'message' => 'Email không hợp lệ: ' . $email
                ]);

                return;
            }

            if (!in_array($permission, ['edit', 'view'], true)) {
                http_response_code(400);

                echo json_encode([
                    'success' => false,
                    'message' => 'Permission không hợp lệ.'
                ]);

                return;
            }
        }
    } else {
        // Write Guide không có tripmates.
        $invites = [];
    }

    $pdo = getDbConnection();
    $userId = (int) $_SESSION['user_id'];

    try {
        $pdo->beginTransaction();

        /* =================================================
         * TYPE = TRIP
         * ================================================= */
        if ($type === 'trip') {

            /*
             * Trip mới luôn PRIVATE.
             * Không lấy privacy từ client.
             */
            $privacy = 'private';

            /*
             * share_token dùng cho link Share của Trip.
             */
            $shareToken = bin2hex(random_bytes(16));

            /*
             * Tạo Trip.
             *
             * Schema hiện tại:
             * trips(
             *   id,
             *   user_id,
             *   title,
             *   destination,
             *   cover_image,
             *   start_date,
             *   end_date,
             *   privacy,
             *   share_token,
             *   created_at
             * )
             */
            $tripStmt = $pdo->prepare(
                "INSERT INTO trips
                (
                    user_id,
                    title,
                    destination,
                    start_date,
                    end_date,
                    privacy,
                    share_token,
                    created_at
                )
                VALUES
                (
                    :user_id,
                    :title,
                    :destination,
                    :start_date,
                    :end_date,
                    :privacy,
                    :share_token,
                    NOW()
                )"
            );

            $tripStmt->execute([
                'user_id'     => $userId,
                'title'       => $tripName,
                'destination' => $destination !== '' ? $destination : null,
                'start_date'  => $startDate ?: null,
                'end_date'    => $endDate ?: null,
                'privacy'     => $privacy,
                'share_token' => $shareToken
            ]);

            $tripId = (int) $pdo->lastInsertId();


            /* =============================================
             * TẠO DAY
             * ============================================= */

            $dayStmt = $pdo->prepare(
                "INSERT INTO itinerary_days
                (
                    trip_id,
                    day_number,
                    day_date
                )
                VALUES
                (
                    :trip_id,
                    :day_number,
                    :day_date
                )"
            );

            if ($startDate && $endDate) {

                $start = new DateTime($startDate);
                $end = new DateTime($endDate);

                $current = clone $start;
                $dayNumber = 1;

                while ($current <= $end) {

                    $dayStmt->execute([
                        'trip_id'    => $tripId,
                        'day_number' => $dayNumber,
                        'day_date'   => $current->format('Y-m-d')
                    ]);

                    $current->modify('+1 day');
                    $dayNumber++;
                }

            } else {

                /*
                 * Không có ngày:
                 * tạo sẵn Day 1 để Trip vẫn có nơi bắt đầu
                 * và trip.js hiện tại không bị days = [].
                 */
                $dayStmt->execute([
                    'trip_id'    => $tripId,
                    'day_number' => 1,
                    'day_date'   => null
                ]);
            }


            /* =============================================
             * LƯU TRIPMATES
             * ============================================= */

            $findUserStmt = $pdo->prepare(
                "SELECT id
                 FROM users
                 WHERE email = :email"
            );

            $findExistingMemberStmt = $pdo->prepare(
                "SELECT id
                 FROM trip_members
                 WHERE trip_id = :trip_id
                   AND user_id = :user_id"
            );

            $insertMemberStmt = $pdo->prepare(
                "INSERT INTO trip_members
                (
                    trip_id,
                    user_id,
                    permission,
                    created_at
                )
                VALUES
                (
                    :trip_id,
                    :user_id,
                    :permission,
                    NOW()
                )"
            );

            $notFoundEmails = [];
            $addedMembers = [];

            foreach ($invites as $invite) {

                $email = trim(strtolower($invite['email']));
                $permission = $invite['permission'];

                $findUserStmt->execute([
                    'email' => $email
                ]);

                $inviteeId = $findUserStmt->fetchColumn();

                /*
                 * Chỉ user đã tồn tại trong users mới
                 * được lưu vào trip_members.
                 */
                if (!$inviteeId) {
                    $notFoundEmails[] = $email;
                    continue;
                }

                $inviteeId = (int) $inviteeId;

                /*
                 * Không cho owner tự thêm chính mình
                 * vào trip_members.
                 */
                if ($inviteeId === $userId) {
                    continue;
                }

                /*
                 * Kiểm tra duplicate trước khi INSERT.
                 */
                $findExistingMemberStmt->execute([
                    'trip_id' => $tripId,
                    'user_id' => $inviteeId
                ]);

                $existing = $findExistingMemberStmt->fetchColumn();

                if ($existing) {
                    continue;
                }

                $insertMemberStmt->execute([
                    'trip_id'    => $tripId,
                    'user_id'    => $inviteeId,
                    'permission' => $permission
                ]);

                $addedMembers[] = [
                    'user_id'     => $inviteeId,
                    'email'       => $email,
                    'permission'  => $permission
                ];
            }


            $pdo->commit();

            echo json_encode([
                'success'          => true,
                'type'             => 'trip',
                'trip_id'          => $tripId,
                'redirect'         => 'trip.html?id=' . $tripId,
                'not_found_emails' => $notFoundEmails,
                'members_added'    => $addedMembers
            ]);

            return;
        }


        /* =================================================
         * TYPE = GUIDE
         * ================================================= */

        /*
         * Database hiện tại đã có:
         * travel_guides(
         *   id,
         *   author_id,
         *   title,
         *   description,
         *   cover_image,
         *   region,
         *   views,
         *   created_at
         * )
         *
         * Hiện chưa có guide_days / guide_items,
         * nên bước này chỉ tạo Guide chính.
         */

        $guideStmt = $pdo->prepare(
            "INSERT INTO travel_guides
            (
                author_id,
                title,
                description,
                region,
                created_at
            )
            VALUES
            (
                :author_id,
                :title,
                :description,
                :region,
                NOW()
            )"
        );

        $guideStmt->execute([
            'author_id'   => $userId,
            'title'       => $tripName,
            'description' => null,
            'region'      => $destination !== '' ? $destination : null
        ]);

        $guideId = (int) $pdo->lastInsertId();

        $pdo->commit();

        echo json_encode([
            'success'  => true,
            'type'     => 'guide',
            'guide_id' => $guideId,
            'redirect' => 'guide-detail.php?id=' . $guideId
        ]);

    } catch (Throwable $e) {

    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);

    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
}


/* =========================================================
 * HELPER: kiểm tra YYYY-MM-DD
 * ========================================================= */
function isValidDate(string $date): bool
{
    $d = DateTime::createFromFormat('Y-m-d', $date);

    return $d !== false
        && $d->format('Y-m-d') === $date;
}
?>