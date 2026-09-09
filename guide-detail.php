<?php
/**
 * guide-detail.php
 * Trang Detail DÙNG CHUNG cho mọi Travel Guide: guide-detail.php?id=123
 *
 * VIẾT LẠI HOÀN TOÀN - không còn dữ liệu mẫu, mọi field khớp đúng
 * schema.sql/schema2.sql thật + migration_guide_itinerary.sql
 * (bảng guide_days, guide_items mới thêm để Guide có Itinerary thật).
 *
 * Vai trò file:
 *  1) Không có ?action -> render HTML shell (guide-detail.js sẽ load dữ liệu qua fetch)
 *  2) Có ?action        -> trả JSON cho AJAX từ guide-detail.js
 */

session_start();
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? null;

if ($action !== null) {
    header('Content-Type: application/json; charset=utf-8');

    switch ($action) {
        case 'check_login':        handleCheckLogin(); break;
        case 'get_guide':          handleGetGuide(); break;
        case 'update_guide':       handleUpdateGuide(); break;
        case 'toggle_follow':      handleToggleFollow(); break;
        case 'toggle_like_guide':  handleToggleLikeGuide(); break;

        case 'add_day':            handleAddDay(); break;
        case 'delete_day':         handleDeleteDay(); break;
        case 'list_places':        handleListPlaces(); break;
        case 'add_item_to_day':    handleAddItemToDay(); break;
        case 'update_item':        handleUpdateItem(); break;
        case 'delete_item':        handleDeleteItem(); break;

        case 'get_trips':          handleGetTrips(); break;
        case 'get_trip_days':      handleGetTripDays(); break;
        case 'save_place_to_day':  handleSavePlaceToDay(); break;
        case 'create_trip_from_guide': handleCreateTripFromGuide(); break;

        case 'add_comment':        handleAddComment(); break;
        case 'edit_comment':       handleEditComment(); break;
        case 'delete_comment':     handleDeleteComment(); break;

        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid action']);
            break;
    }
    exit;
}

/* =========================================================
 * NHÁNH RENDER TRANG (HTML shell)
 * ========================================================= */
$guideId = $_GET['id'] ?? '';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Travel Planner - Guide Detail</title>
<link rel="stylesheet" href="guide-detail.css">
</head>
<body>

<header class="site-header">
  <div class="logo">Travel Planner</div>
  <nav class="main-nav">
    <a href="home.html" class="nav-link">Home</a>
    <a href="explore.html" class="nav-link">Explore</a>
    <a href="travel-guides.html" class="nav-link active">Travel Guides</a>
  </nav>
  <div class="header-right">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search">
      <button id="searchBtn" type="button" aria-label="Search"><img src="images/icon-search.png" alt=""></button>
    </div>
    <button id="profileBtn" class="profile-btn" type="button" aria-label="Profile">
      <img src="images/icon-profile.png" alt="">
    </button>
  </div>
</header>

<section class="guide-cover-banner">
  <img id="guideCover" src="" alt="">
  <div class="guide-cover-overlay">
    <h1 id="guideTitleLarge" class="guide-title-large"></h1>
    <p id="guideShortInfo" class="guide-short-info"></p>
  </div>
</section>

<main>

  <button id="backBtn" class="back-btn" type="button" onclick="window.location.href='travel-guides.html'">
    <img src="images/icon-back.png" alt=""> Back
  </button>

  <div class="author-row">
    <img id="authorAvatar" class="author-avatar" src="" alt="">
    <div class="author-info">
      <div id="authorName" class="author-name"></div>
      <div class="author-meta">
        <span id="authorDate"></span>
        <span class="dot">&middot;</span>
        <span id="guideViews"></span> views
        <span class="dot">&middot;</span>
        <span id="guideLikesCount"></span> likes
        <span class="dot">&middot;</span>
        <span id="commentCountLabel"></span> comments
      </div>
    </div>
    <button id="followBtn" class="follow-btn hidden" type="button">Follow</button>
    <div class="guide-action-group">
      <button id="guideLikeBtnMain" class="guide-like-btn" type="button">
        <img src="images/icon-heart.png" alt=""> Like
      </button>
      <button id="shareGuideBtn" class="guide-share-btn" type="button">
        <img src="images/icon-share.png" alt=""> Share
      </button>
      <button id="editGuideToggleBtn" class="btn-secondary-sm owner-only hidden" type="button">Edit</button>
    </div>
  </div>

  <div id="editGuideArea" class="edit-guide-area hidden">
    <input type="text" id="editTitleInput" class="edit-title-input" placeholder="Tên guide">
    <textarea id="editDescriptionInput" class="edit-description-input" rows="3" placeholder="Mô tả"></textarea>
    <div class="edit-guide-actions">
      <button id="saveGuideEditBtn" class="btn-primary-sm" type="button">Save</button>
      <button id="cancelGuideEditBtn" class="btn-secondary-sm" type="button">Cancel</button>
    </div>
  </div>

  <section class="about-section">
    <h2 class="section-title">About this guide</h2>
    <p id="aboutContent" class="about-content"></p>
  </section>

  <section class="itinerary-section">
    <div class="itinerary-header-row">
      <h2 class="section-title">Itinerary</h2>
      <div class="itinerary-header-actions">
        <button id="addDayBtn" class="btn-secondary-sm owner-only hidden" type="button">+ Add Day</button>
        <button id="addToNewTripBtn" class="add-to-new-trip-btn" type="button">+ Add to New Trip</button>
      </div>
    </div>
    <div id="itineraryDaysList"></div>
  </section>

  <section class="comments-section">
    <h2 class="section-title">Comments / Ask a Question</h2>

    <div id="writeCommentArea" class="write-comment-area hidden">
      <textarea id="commentInput" class="comment-textarea" placeholder="Viết bình luận hoặc đặt câu hỏi..." rows="2"></textarea>
      <button id="submitCommentBtn" class="btn-primary-sm" type="button">Submit</button>
    </div>

    <div id="loginRequiredCommentMsg" class="login-required hidden">
      Vui lòng <a href="login.html">đăng nhập</a> để bình luận hoặc đặt câu hỏi.
    </div>

    <p id="commentError" class="field-error hidden"></p>
    <div id="commentList" class="comment-list"></div>
  </section>

</main>

<!-- Modal: Save 1 địa điểm (của Guide) vào Trip của người xem -->
<div id="saveToTripModal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Save to Trip</h3>
      <button id="closeSaveToTripModal" class="modal-close-btn" type="button" aria-label="Close">&times;</button>
    </div>
    <div id="saveTripStep" class="modal-step">
      <p class="modal-label">Choose a trip:</p>
      <div id="saveTripListContainer" class="modal-list"></div>
      <button id="createNewTripFromSaveBtn" class="btn-primary-sm hidden" type="button">+ Create New Trip</button>
    </div>
    <div id="saveDayStep" class="modal-step hidden">
      <p class="modal-label">Choose a day:</p>
      <div id="saveDayListContainer" class="modal-list"></div>
      <button id="backToTripStepBtn" class="btn-secondary-sm" type="button">&larr; Back</button>
    </div>
    <div id="saveAddedStep" class="modal-step hidden">
      <p class="added-message">Đã lưu địa điểm vào trip của bạn.</p>
    </div>
  </div>
</div>

<!-- Modal: Add Place vào 1 Day của Guide (chỉ tác giả) -->
<div id="addPlaceToGuideModal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Add Place to Day</h3>
      <button id="closeAddPlaceToGuideModal" class="modal-close-btn" type="button" aria-label="Close">&times;</button>
    </div>
    <input type="text" id="guidePlaceSearchInput" placeholder="Tìm địa điểm..." class="edit-title-input">
    <div id="guidePlaceListContainer" class="modal-list"></div>
  </div>
</div>

<!-- Modal: Share Guide -->
<div id="shareGuideModal" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h3>Share Guide</h3>
      <button id="closeShareGuideModal" class="modal-close-btn" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="share-link-row">
      <input type="text" id="guideShareLinkInput" readonly>
      <button id="copyGuideShareLinkBtn" class="btn-secondary-sm" type="button">Copy link</button>
    </div>
  </div>
</div>

<footer class="site-footer">
  <div class="footer-col footer-brand">
    <h3>Travel Planner</h3>
    <p class="footer-contact"><img src="images/icon-phone.png" alt=""> +8455555555</p>
    <p class="footer-contact"><img src="images/icon-globe.png" alt=""> www.travelplanner.com</p>
    <div class="footer-socials">
      <a href="#"><img src="images/icon-facebook.png" alt="Facebook"></a>
      <a href="#"><img src="images/icon-instagram.png" alt="Instagram"></a>
      <a href="#"><img src="images/icon-x.png" alt="X"></a>
      <a href="#"><img src="images/icon-tiktok.png" alt="TikTok"></a>
    </div>
  </div>
  <div class="footer-col">
    <h4>Quick Links</h4>
    <a href="home.html">Home</a>
    <a href="explore.html">Explore</a>
    <a href="travel-guides.html">Travel Guides</a>
    <a href="new-trip.html">Plan a New Trip</a>
  </div>
  <div class="footer-col">
    <h4>Explore</h4>
    <a href="explore.html">Hotel</a>
    <a href="explore.html">Places</a>
    <a href="explore.html">Cafe</a>
    <a href="explore.html">Restaurant</a>
  </div>
  <div class="footer-col">
    <h4>Support &amp; Policy</h4>
    <a href="#">Help Center</a>
    <a href="#">Privacy Policy</a>
    <a href="#">Terms of Service</a>
    <a href="#">FAQ</a>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2026 Travel Planner. All rights reserved.</p>
  </div>
</footer>

<script>
  const GUIDE_ID = <?php echo json_encode($guideId); ?>;
</script>
<script src="guide-detail.js"></script>
</body>
</html>
<?php
/* =========================================================
 * HÀM XỬ LÝ ACTION
 * ========================================================= */

function currentUserId() {
    return $_SESSION['user_id'] ?? null;
}

/** Trả về author_id của guide, hoặc null nếu guide không tồn tại */
function getGuideAuthorId(PDO $pdo, int $guideId): ?int {
    $stmt = $pdo->prepare("SELECT author_id FROM travel_guides WHERE id = :id");
    $stmt->execute(['id' => $guideId]);
    $val = $stmt->fetchColumn();
    return $val === false ? null : (int) $val;
}

/** Chặn nếu người gọi không phải tác giả guide. Trả JSON lỗi + return true nếu đã chặn. */
function requireGuideOwner(PDO $pdo, int $guideId): bool {
    $uid = currentUserId();
    if (!$uid) {
        echo json_encode(['success' => false, 'require_login' => true]);
        return true;
    }
    $authorId = getGuideAuthorId($pdo, $guideId);
    if ($authorId === null) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy Travel Guide.']);
        return true;
    }
    if ($authorId !== (int) $uid) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Chỉ tác giả mới có quyền chỉnh sửa Guide này.']);
        return true;
    }
    return false;
}

function handleCheckLogin(): void {
    if (isset($_SESSION['user_id'])) {
        echo json_encode(['logged_in' => true, 'user_id' => $_SESSION['user_id']]);
    } else {
        echo json_encode(['logged_in' => false, 'user_id' => null]);
    }
}

/* =========================================================
 * get_guide: trả guide + author + days/items + comments,
 * ĐÚNG cấu trúc mà guide-detail.js đọc (không lệch tên field nữa).
 * ========================================================= */
function handleGetGuide(): void {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing id']);
        return;
    }

    $pdo = getDbConnection();
    $uid = currentUserId();

    $stmt = $pdo->prepare(
        "SELECT g.id, g.title, g.description, g.cover_image, g.region, g.views, g.created_at,
                g.author_id, u.full_name AS author_name, u.avatar_url AS author_avatar
         FROM travel_guides g
         JOIN users u ON u.id = g.author_id
         WHERE g.id = :id"
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['guide' => null]);
        return;
    }

    // Tăng views mỗi lần xem (đơn giản, không chống trùng)
    $pdo->prepare("UPDATE travel_guides SET views = views + 1 WHERE id = :id")->execute(['id' => $id]);
    $row['views'] = (int) $row['views'] + 1;

    $likeCountStmt = $pdo->prepare("SELECT COUNT(*) FROM guide_likes WHERE guide_id = :id");
    $likeCountStmt->execute(['id' => $id]);
    $likeCount = (int) $likeCountStmt->fetchColumn();

    $likedByUser = false;
    $isFollowing = false;
    if ($uid) {
        $s = $pdo->prepare("SELECT 1 FROM guide_likes WHERE guide_id = :g AND user_id = :u");
        $s->execute(['g' => $id, 'u' => $uid]);
        $likedByUser = (bool) $s->fetchColumn();

        $s2 = $pdo->prepare("SELECT 1 FROM author_follows WHERE follower_id = :u AND followed_id = :a");
        $s2->execute(['u' => $uid, 'a' => $row['author_id']]);
        $isFollowing = (bool) $s2->fetchColumn();
    }

    $commentCountStmt = $pdo->prepare("SELECT COUNT(*) FROM guide_comments WHERE guide_id = :id");
    $commentCountStmt->execute(['id' => $id]);
    $commentCount = (int) $commentCountStmt->fetchColumn();

    $guide = [
        'id'             => (int) $row['id'],
        'title'          => $row['title'],
        'description'    => $row['description'],
        'cover_image'    => $row['cover_image'],
        'region'         => $row['region'],
        'views'          => (int) $row['views'],
        'created_at'     => $row['created_at'],
        'likes'          => $likeCount,
        'liked_by_user'  => $likedByUser,
        'is_following'   => $isFollowing,
        'comment_count'  => $commentCount,
        'is_owner'       => $uid !== null && (int) $uid === (int) $row['author_id'],
        'author'         => [
            'id'     => (int) $row['author_id'],
            'name'   => $row['author_name'],
            'avatar' => $row['author_avatar'],
        ],
    ];

    // Days + items
    $daysStmt = $pdo->prepare("SELECT id, day_number FROM guide_days WHERE guide_id = :id ORDER BY day_number ASC");
    $daysStmt->execute(['id' => $id]);
    $days = $daysStmt->fetchAll();

    $itemsStmt = $pdo->prepare(
        "SELECT gi.id, gi.day_id, gi.place_id, gi.title, gi.item_type, gi.start_time, gi.cost, gi.description, gi.order_index,
                p.type AS place_type
         FROM guide_items gi
         LEFT JOIN places p ON p.id = gi.place_id
         WHERE gi.day_id = :day_id
         ORDER BY gi.order_index ASC"
    );
    foreach ($days as &$day) {
        $itemsStmt->execute(['day_id' => $day['id']]);
        $day['items'] = $itemsStmt->fetchAll();
    }
    unset($day);

    // Comments
    $commentsStmt = $pdo->prepare(
        "SELECT c.id, c.user_id, c.content, c.created_at, u.full_name AS user_name, u.avatar_url AS avatar
         FROM guide_comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.guide_id = :id
         ORDER BY c.created_at DESC"
    );
    $commentsStmt->execute(['id' => $id]);
    $comments = $commentsStmt->fetchAll();
    foreach ($comments as &$c) {
        $c['is_owner'] = $uid !== null && (int) $uid === (int) $c['user_id'];
    }
    unset($c);

    echo json_encode(['guide' => $guide, 'days' => $days, 'comments' => $comments]);
}

/* =========================================================
 * update_guide: chỉ tác giả được sửa title/description
 * ========================================================= */
function handleUpdateGuide(): void {
    $guideId = (int) ($_POST['guide_id'] ?? 0);
    if (!$guideId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu guide_id']);
        return;
    }

    $pdo = getDbConnection();
    if (requireGuideOwner($pdo, $guideId)) return;

    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');

    if ($title === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tên guide không được để trống.']);
        return;
    }

    $pdo->prepare("UPDATE travel_guides SET title = :title, description = :description WHERE id = :id")
        ->execute(['title' => $title, 'description' => $description, 'id' => $guideId]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * toggle_follow: follow/unfollow tác giả
 * ========================================================= */
function handleToggleFollow(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['require_login' => true]); return; }

    $authorId = (int) ($_POST['author_id'] ?? 0);
    if (!$authorId) { http_response_code(400); echo json_encode(['error' => 'Missing author_id']); return; }
    if ($authorId === (int) $uid) { echo json_encode(['success' => false, 'message' => 'Không thể tự follow chính mình.']); return; }

    $pdo = getDbConnection();
    $check = $pdo->prepare("SELECT id FROM author_follows WHERE follower_id = :f AND followed_id = :a");
    $check->execute(['f' => $uid, 'a' => $authorId]);
    $existing = $check->fetchColumn();

    if ($existing) {
        $pdo->prepare("DELETE FROM author_follows WHERE id = :id")->execute(['id' => $existing]);
        echo json_encode(['success' => true, 'following' => false]);
    } else {
        $pdo->prepare("INSERT INTO author_follows (follower_id, followed_id, created_at) VALUES (:f, :a, NOW())")
            ->execute(['f' => $uid, 'a' => $authorId]);
        echo json_encode(['success' => true, 'following' => true]);
    }
}

/* =========================================================
 * toggle_like_guide
 * ========================================================= */
function handleToggleLikeGuide(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['require_login' => true]); return; }

    $guideId = (int) ($_POST['guide_id'] ?? 0);
    if (!$guideId) { http_response_code(400); echo json_encode(['error' => 'Missing guide_id']); return; }

    $pdo = getDbConnection();
    $check = $pdo->prepare("SELECT id FROM guide_likes WHERE guide_id = :g AND user_id = :u");
    $check->execute(['g' => $guideId, 'u' => $uid]);
    $existing = $check->fetchColumn();

    if ($existing) {
        $pdo->prepare("DELETE FROM guide_likes WHERE id = :id")->execute(['id' => $existing]);
        echo json_encode(['success' => true, 'liked' => false]);
    } else {
        $pdo->prepare("INSERT INTO guide_likes (guide_id, user_id, created_at) VALUES (:g, :u, NOW())")
            ->execute(['g' => $guideId, 'u' => $uid]);
        echo json_encode(['success' => true, 'liked' => true]);
    }
}

/* =========================================================
 * add_day: tác giả thêm 1 Day mới (day_number tự tăng)
 * ========================================================= */
function handleAddDay(): void {
    $guideId = (int) ($_POST['guide_id'] ?? 0);
    if (!$guideId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Thiếu guide_id']); return; }

    $pdo = getDbConnection();
    if (requireGuideOwner($pdo, $guideId)) return;

    $maxStmt = $pdo->prepare("SELECT MAX(day_number) FROM guide_days WHERE guide_id = :id");
    $maxStmt->execute(['id' => $guideId]);
    $nextNumber = (int) $maxStmt->fetchColumn() + 1;

    $pdo->prepare("INSERT INTO guide_days (guide_id, day_number) VALUES (:g, :n)")
        ->execute(['g' => $guideId, 'n' => $nextNumber]);

    echo json_encode(['success' => true, 'day_id' => $pdo->lastInsertId(), 'day_number' => $nextNumber]);
}

/* =========================================================
 * delete_day: xoá 1 Day (kéo theo xoá guide_items nhờ ON DELETE CASCADE)
 * ========================================================= */
function handleDeleteDay(): void {
    $dayId = (int) ($_POST['day_id'] ?? 0);
    if (!$dayId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Thiếu day_id']); return; }

    $pdo = getDbConnection();

    $guideStmt = $pdo->prepare("SELECT guide_id FROM guide_days WHERE id = :id");
    $guideStmt->execute(['id' => $dayId]);
    $guideId = $guideStmt->fetchColumn();
    if (!$guideId) { echo json_encode(['success' => false, 'message' => 'Không tìm thấy Day.']); return; }

    if (requireGuideOwner($pdo, (int) $guideId)) return;

    $pdo->prepare("DELETE FROM guide_days WHERE id = :id")->execute(['id' => $dayId]);
    echo json_encode(['success' => true]);
}

/* =========================================================
 * list_places: danh sách địa điểm thật từ bảng places (cho modal Add Place)
 * ========================================================= */
function handleListPlaces(): void {
    $pdo = getDbConnection();
    $keyword = $_GET['keyword'] ?? '';

    $stmt = $pdo->prepare(
        "SELECT id, name, type, address, price, image_url
         FROM places
         WHERE name LIKE :keyword
         ORDER BY name ASC
         LIMIT 50"
    );
    $stmt->execute(['keyword' => '%' . $keyword . '%']);
    echo json_encode(['places' => $stmt->fetchAll()]);
}

/* =========================================================
 * add_item_to_day: tác giả thêm 1 Place (từ DB thật) vào 1 Day của Guide
 * ========================================================= */
function handleAddItemToDay(): void {
    $dayId = (int) ($_POST['day_id'] ?? 0);
    $placeId = (int) ($_POST['place_id'] ?? 0);

    if (!$dayId || !$placeId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu day_id hoặc place_id']);
        return;
    }

    $pdo = getDbConnection();

    $guideStmt = $pdo->prepare("SELECT guide_id FROM guide_days WHERE id = :id");
    $guideStmt->execute(['id' => $dayId]);
    $guideId = $guideStmt->fetchColumn();
    if (!$guideId) { echo json_encode(['success' => false, 'message' => 'Không tìm thấy Day.']); return; }

    if (requireGuideOwner($pdo, (int) $guideId)) return;

    $placeStmt = $pdo->prepare("SELECT name, type FROM places WHERE id = :id");
    $placeStmt->execute(['id' => $placeId]);
    $place = $placeStmt->fetch();
    if (!$place) { echo json_encode(['success' => false, 'message' => 'Không tìm thấy địa điểm.']); return; }

    $orderStmt = $pdo->prepare("SELECT COUNT(*) FROM guide_items WHERE day_id = :id");
    $orderStmt->execute(['id' => $dayId]);
    $nextOrder = (int) $orderStmt->fetchColumn();

    $ins = $pdo->prepare(
        "INSERT INTO guide_items (day_id, place_id, title, item_type, order_index)
         VALUES (:day_id, :place_id, :title, :type, :order_index)"
    );
    $ins->execute([
        'day_id'      => $dayId,
        'place_id'    => $placeId,
        'title'       => $place['name'],
        'type'        => $place['type'] ?: 'other',
        'order_index' => $nextOrder,
    ]);

    echo json_encode(['success' => true, 'item_id' => $pdo->lastInsertId()]);
}

/* =========================================================
 * update_item: sửa time/cost/note của 1 item trong Guide (chỉ tác giả)
 * ========================================================= */
function handleUpdateItem(): void {
    $itemId = (int) ($_POST['item_id'] ?? 0);
    if (!$itemId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Thiếu item_id']); return; }

    $pdo = getDbConnection();

    $ownerCheckStmt = $pdo->prepare(
        "SELECT gd.guide_id FROM guide_items gi
         JOIN guide_days gd ON gd.id = gi.day_id
         WHERE gi.id = :id"
    );
    $ownerCheckStmt->execute(['id' => $itemId]);
    $guideId = $ownerCheckStmt->fetchColumn();
    if (!$guideId) { echo json_encode(['success' => false, 'message' => 'Không tìm thấy item.']); return; }

    if (requireGuideOwner($pdo, (int) $guideId)) return;

    $fields = [];
    $params = ['id' => $itemId];

    if (array_key_exists('time', $_POST)) {
        $fields[] = 'start_time = :time';
        $params['time'] = $_POST['time'] !== '' ? $_POST['time'] : null;
    }
    if (array_key_exists('cost', $_POST)) {
        $fields[] = 'cost = :cost';
        $params['cost'] = $_POST['cost'] !== '' ? $_POST['cost'] : null;
    }
    if (array_key_exists('note', $_POST)) {
        $fields[] = 'description = :note';
        $params['note'] = $_POST['note'];
    }

    if (empty($fields)) { echo json_encode(['success' => true]); return; }

    $pdo->prepare("UPDATE guide_items SET " . implode(', ', $fields) . " WHERE id = :id")->execute($params);
    echo json_encode(['success' => true]);
}

/* =========================================================
 * delete_item: xoá 1 item khỏi Guide (chỉ tác giả)
 * ========================================================= */
function handleDeleteItem(): void {
    $itemId = (int) ($_POST['item_id'] ?? 0);
    if (!$itemId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Thiếu item_id']); return; }

    $pdo = getDbConnection();

    $ownerCheckStmt = $pdo->prepare(
        "SELECT gd.guide_id FROM guide_items gi
         JOIN guide_days gd ON gd.id = gi.day_id
         WHERE gi.id = :id"
    );
    $ownerCheckStmt->execute(['id' => $itemId]);
    $guideId = $ownerCheckStmt->fetchColumn();
    if (!$guideId) { echo json_encode(['success' => false, 'message' => 'Không tìm thấy item.']); return; }

    if (requireGuideOwner($pdo, (int) $guideId)) return;

    $pdo->prepare("DELETE FROM guide_items WHERE id = :id")->execute(['id' => $itemId]);
    echo json_encode(['success' => true]);
}

/* =========================================================
 * get_trips / get_trip_days / save_place_to_day: cho popup "Save to Trip"
 * (người xem lưu 1 Place của Guide vào Trip riêng của họ)
 * ========================================================= */
function handleGetTrips(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['require_login' => true, 'trips' => []]); return; }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT id, title FROM trips WHERE user_id = :uid ORDER BY created_at DESC");
    $stmt->execute(['uid' => $uid]);
    echo json_encode(['require_login' => false, 'trips' => $stmt->fetchAll()]);
}

function handleGetTripDays(): void {
    $tripId = $_GET['trip_id'] ?? null;
    if (!$tripId) { http_response_code(400); echo json_encode(['error' => 'Missing trip_id']); return; }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT id, day_number, day_date FROM itinerary_days WHERE trip_id = :id ORDER BY day_number ASC");
    $stmt->execute(['id' => $tripId]);
    echo json_encode(['days' => $stmt->fetchAll()]);
}

function handleSavePlaceToDay(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']); return; }

    $dayId = (int) ($_POST['day_id'] ?? 0);
    $itemId = (int) ($_POST['item_id'] ?? 0); // guide_items.id gốc, để copy đúng place_id/title/type

    if (!$dayId || !$itemId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Thiếu day_id hoặc item_id']);
        return;
    }

    $pdo = getDbConnection();

    $srcStmt = $pdo->prepare("SELECT place_id, title, item_type FROM guide_items WHERE id = :id");
    $srcStmt->execute(['id' => $itemId]);
    $src = $srcStmt->fetch();
    if (!$src) { echo json_encode(['success' => false, 'message' => 'Không tìm thấy địa điểm trong guide.']); return; }

    $orderStmt = $pdo->prepare("SELECT COUNT(*) FROM itinerary_items WHERE day_id = :id");
    $orderStmt->execute(['id' => $dayId]);
    $nextOrder = (int) $orderStmt->fetchColumn();

    $ins = $pdo->prepare(
        "INSERT INTO itinerary_items (day_id, place_id, title, item_type, order_index)
         VALUES (:day_id, :place_id, :title, :type, :order_index)"
    );
    $ins->execute([
        'day_id'      => $dayId,
        'place_id'    => $src['place_id'],
        'title'       => $src['title'],
        'type'        => $src['item_type'],
        'order_index' => $nextOrder,
    ]);

    echo json_encode(['success' => true]);
}

/* =========================================================
 * create_trip_from_guide: tạo Trip mới + COPY THẬT toàn bộ
 * guide_days/guide_items sang itinerary_days/itinerary_items
 * ========================================================= */
function handleCreateTripFromGuide(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['require_login' => true]); return; }

    $guideId = (int) ($_POST['guide_id'] ?? 0);
    if (!$guideId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Thiếu guide_id']); return; }

    $pdo = getDbConnection();

    try {
        $pdo->beginTransaction();

        $guideStmt = $pdo->prepare("SELECT title, region FROM travel_guides WHERE id = :id");
        $guideStmt->execute(['id' => $guideId]);
        $guide = $guideStmt->fetch();
        $guideTitle = $guide['title'] ?? ('Trip từ Guide #' . $guideId);

        $insTrip = $pdo->prepare(
            "INSERT INTO trips (user_id, title, destination, privacy, share_token, created_at)
             VALUES (:uid, :title, :destination, 'private', :token, NOW())"
        );
        $insTrip->execute([
            'uid'         => $uid,
            'title'       => $guideTitle,
            'destination' => $guide['region'] ?? null,
            'token'       => bin2hex(random_bytes(16)),
        ]);
        $tripId = $pdo->lastInsertId();

        // Copy từng Day + Item từ guide sang trip mới
        $daysStmt = $pdo->prepare("SELECT id, day_number FROM guide_days WHERE guide_id = :id ORDER BY day_number ASC");
        $daysStmt->execute(['id' => $guideId]);
        $days = $daysStmt->fetchAll();

        $itemsStmt = $pdo->prepare("SELECT place_id, title, item_type, start_time, cost, description, order_index FROM guide_items WHERE day_id = :id ORDER BY order_index ASC");
        $insDay = $pdo->prepare("INSERT INTO itinerary_days (trip_id, day_number, day_date) VALUES (:trip_id, :num, NULL)");
        $insItem = $pdo->prepare(
            "INSERT INTO itinerary_items (day_id, place_id, title, item_type, start_time, cost, description, order_index)
             VALUES (:day_id, :place_id, :title, :type, :time, :cost, :note, :order_index)"
        );

        foreach ($days as $day) {
            $insDay->execute(['trip_id' => $tripId, 'num' => $day['day_number']]);
            $newDayId = $pdo->lastInsertId();

            $itemsStmt->execute(['id' => $day['id']]);
            foreach ($itemsStmt->fetchAll() as $item) {
                $insItem->execute([
                    'day_id'      => $newDayId,
                    'place_id'    => $item['place_id'],
                    'title'       => $item['title'],
                    'type'        => $item['item_type'],
                    'time'        => $item['start_time'],
                    'cost'        => $item['cost'],
                    'note'        => $item['description'],
                    'order_index' => $item['order_index'],
                ]);
            }
        }

        $pdo->commit();
        echo json_encode(['success' => true, 'trip_id' => $tripId]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Lỗi khi tạo trip từ guide.']);
    }
}

/* =========================================================
 * Comments
 * ========================================================= */
function handleAddComment(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['require_login' => true]); return; }

    $guideId = (int) ($_POST['guide_id'] ?? 0);
    $content = trim($_POST['content'] ?? '');

    if (!$guideId || $content === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nội dung không hợp lệ.']);
        return;
    }

    $pdo = getDbConnection();
    $pdo->prepare("INSERT INTO guide_comments (guide_id, user_id, content, created_at) VALUES (:g, :u, :c, NOW())")
        ->execute(['g' => $guideId, 'u' => $uid, 'c' => $content]);

    echo json_encode(['success' => true, 'comment_id' => $pdo->lastInsertId()]);
}

function handleEditComment(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']); return; }

    $commentId = (int) ($_POST['comment_id'] ?? 0);
    $content = trim($_POST['content'] ?? '');
    if (!$commentId || $content === '') { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Nội dung không hợp lệ.']); return; }

    $pdo = getDbConnection();
    $check = $pdo->prepare("SELECT user_id FROM guide_comments WHERE id = :id");
    $check->execute(['id' => $commentId]);
    $ownerId = $check->fetchColumn();

    if ((int) $ownerId !== (int) $uid) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền sửa bình luận này.']);
        return;
    }

    $pdo->prepare("UPDATE guide_comments SET content = :c WHERE id = :id")->execute(['c' => $content, 'id' => $commentId]);
    echo json_encode(['success' => true]);
}

function handleDeleteComment(): void {
    $uid = currentUserId();
    if (!$uid) { echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập.']); return; }

    $commentId = (int) ($_POST['comment_id'] ?? 0);
    if (!$commentId) { http_response_code(400); echo json_encode(['success' => false, 'message' => 'Thiếu comment_id']); return; }

    $pdo = getDbConnection();
    $check = $pdo->prepare("SELECT user_id FROM guide_comments WHERE id = :id");
    $check->execute(['id' => $commentId]);
    $ownerId = $check->fetchColumn();

    if ((int) $ownerId !== (int) $uid) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xoá bình luận này.']);
        return;
    }

    $pdo->prepare("DELETE FROM guide_comments WHERE id = :id")->execute(['id' => $commentId]);
    echo json_encode(['success' => true]);
}