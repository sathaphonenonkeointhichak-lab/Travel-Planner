<?php
/**
 * home.php
 * Backend API cho trang Home.
 *
 * Các action:
 *   - recommend            : lấy danh sách địa điểm gợi ý
 *   - upcoming             : lấy các chuyến đi sắp tới của user
 *   - popular              : lấy các Travel Guide phổ biến
 *   - toggle_like_guide    : Like / Unlike một Travel Guide
 *   - check_login          : kiểm tra user đã đăng nhập hay chưa
 */

session_start();

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {

    case 'recommend':
        handleRecommend();
        break;

    case 'upcoming':
        handleUpcoming();
        break;

    case 'popular':
        handlePopular();
        break;

    case 'toggle_like_guide':
        handleToggleLikeGuide();
        break;

    case 'check_login':
        handleCheckLogin();
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
 * 1. Recommend
 * Lấy một số địa điểm mới nhất từ bảng places
 * ========================================================= */

function handleRecommend(): void
{
    try {

        $pdo = getDbConnection();

        $sql = "
            SELECT
                id,
                name AS title,
                description,
                image_url AS image
            FROM places
            ORDER BY created_at DESC
            LIMIT 3
        ";

        $stmt = $pdo->query($sql);

        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'items' => $items
        ]);

    } catch (PDOException $e) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'Không thể tải danh sách Recommend.'
        ]);
    }
}


/* =========================================================
 * 2. Upcoming Trips
 * Lấy các trip sắp tới của user đang đăng nhập
 * ========================================================= */

function handleUpcoming(): void
{
    if (!isset($_SESSION['user_id'])) {

        echo json_encode([
            'logged_in' => false,
            'trips' => []
        ]);

        return;
    }

    try {

        $pdo = getDbConnection();

        $userId = (int) $_SESSION['user_id'];

        $sql = "
            SELECT
                id,
                title,
                cover_image,
                CONCAT(
                    DATE_FORMAT(start_date, '%b %e'),
                    ' - ',
                    DATE_FORMAT(end_date, '%e')
                ) AS date_range,

                (
                    SELECT COUNT(*)
                    FROM trip_members tm
                    WHERE tm.trip_id = trips.id
                ) AS members_count

            FROM trips

            WHERE user_id = :user_id
              AND (
                    start_date IS NULL
                    OR start_date >= CURDATE()
                  )

            ORDER BY
                start_date ASC,
                created_at DESC

            LIMIT 6
        ";

        $stmt = $pdo->prepare($sql);

        $stmt->execute([
            'user_id' => $userId
        ]);

        $trips = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'logged_in' => true,
            'trips' => $trips
        ]);

    } catch (PDOException $e) {

        http_response_code(500);

        echo json_encode([
            'logged_in' => true,
            'trips' => [],
            'message' => 'Không thể tải Upcoming Trips.'
        ]);
    }
}


/* =========================================================
 * 3. Popular Guides
 * Lấy các Travel Guide phổ biến
 *
 * Sắp xếp theo:
 *   1. số lượt Like
 *   2. số lượt xem
 *   3. ngày tạo mới nhất
 * ========================================================= */

function handlePopular(): void
{
    try {

        $pdo = getDbConnection();

        $currentUserId = $_SESSION['user_id'] ?? null;

        $sql = "
            SELECT
                g.id,
                g.title,
                g.cover_image,
                g.region,
                g.views,
                g.author_id,

                u.full_name AS creator_name,
                u.avatar_url AS creator_avatar,

                (
                    SELECT COUNT(*)
                    FROM guide_likes gl
                    WHERE gl.guide_id = g.id
                ) AS like_count

            FROM travel_guides g

            INNER JOIN users u
                ON u.id = g.author_id

            ORDER BY
                like_count DESC,
                g.views DESC,
                g.created_at DESC

            LIMIT 10
        ";

        $stmt = $pdo->query($sql);

        $guides = $stmt->fetchAll(PDO::FETCH_ASSOC);


        /* -----------------------------------------
         * Kiểm tra user hiện tại đã Like Guide chưa
         * ----------------------------------------- */

        if ($currentUserId !== null) {

            $likeStmt = $pdo->prepare("
                SELECT 1
                FROM guide_likes
                WHERE guide_id = :guide_id
                  AND user_id = :user_id
                LIMIT 1
            ");

            foreach ($guides as &$guide) {

                $likeStmt->execute([
                    'guide_id' => $guide['id'],
                    'user_id' => $currentUserId
                ]);

                $guide['liked_by_user'] =
                    (bool) $likeStmt->fetchColumn();
            }

            unset($guide);

        } else {

            foreach ($guides as &$guide) {

                $guide['liked_by_user'] = false;
            }

            unset($guide);
        }


        echo json_encode([
            'success' => true,
            'guides' => $guides
        ]);

    } catch (PDOException $e) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'guides' => [],
            'message' => 'Không thể tải Popular Guides.'
        ]);
    }
}


/* =========================================================
 * 4. Like / Unlike Guide
 * ========================================================= */

function handleToggleLikeGuide(): void
{
    if (!isset($_SESSION['user_id'])) {

        echo json_encode([
            'require_login' => true
        ]);

        return;
    }

    $guideId = $_POST['guide_id'] ?? null;

    if (!$guideId) {

        http_response_code(400);

        echo json_encode([
            'success' => false,
            'message' => 'Thiếu guide_id.'
        ]);

        return;
    }

    try {

        $pdo = getDbConnection();

        $userId = (int) $_SESSION['user_id'];
        $guideId = (int) $guideId;


        /* -----------------------------------------
         * Kiểm tra Guide có tồn tại
         * ----------------------------------------- */

        $guideStmt = $pdo->prepare("
            SELECT id
            FROM travel_guides
            WHERE id = :guide_id
            LIMIT 1
        ");

        $guideStmt->execute([
            'guide_id' => $guideId
        ]);

        if (!$guideStmt->fetchColumn()) {

            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Travel Guide không tồn tại.'
            ]);

            return;
        }


        /* -----------------------------------------
         * Kiểm tra user đã Like chưa
         * ----------------------------------------- */

        $checkStmt = $pdo->prepare("
            SELECT id
            FROM guide_likes
            WHERE guide_id = :guide_id
              AND user_id = :user_id
            LIMIT 1
        ");

        $checkStmt->execute([
            'guide_id' => $guideId,
            'user_id' => $userId
        ]);

        $existingId = $checkStmt->fetchColumn();


        /* -----------------------------------------
         * Nếu đã Like → Unlike
         * ----------------------------------------- */

        if ($existingId) {

            $deleteStmt = $pdo->prepare("
                DELETE FROM guide_likes
                WHERE id = :id
            ");

            $deleteStmt->execute([
                'id' => $existingId
            ]);

            echo json_encode([
                'success' => true,
                'liked' => false
            ]);

            return;
        }


        /* -----------------------------------------
         * Nếu chưa Like → Like
         * ----------------------------------------- */

        $insertStmt = $pdo->prepare("
            INSERT INTO guide_likes (
                guide_id,
                user_id,
                created_at
            )
            VALUES (
                :guide_id,
                :user_id,
                NOW()
            )
        ");

        $insertStmt->execute([
            'guide_id' => $guideId,
            'user_id' => $userId
        ]);


        echo json_encode([
            'success' => true,
            'liked' => true
        ]);

    } catch (PDOException $e) {

        http_response_code(500);

        echo json_encode([
            'success' => false,
            'message' => 'Không thể Like / Unlike Guide.'
        ]);
    }
}


/* =========================================================
 * 5. Check Login
 *
 * Dùng cho:
 *   - Home → Profile
 *   - kiểm tra session
 *
 * Quan trọng:
 *   $_SESSION['user_id'] phải chính là users.id
 * ========================================================= */

function handleCheckLogin(): void
{
    if (isset($_SESSION['user_id'])) {

        echo json_encode([
            'logged_in' => true,
            'user_id' => (int) $_SESSION['user_id']
        ]);

    } else {

        echo json_encode([
            'logged_in' => false,
            'user_id' => null
        ]);
    }
}