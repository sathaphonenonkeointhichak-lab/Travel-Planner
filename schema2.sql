-- ============================================================
-- schema.sql
-- Database: travel_planner
-- Gom lại từ toàn bộ tên bảng/cột mà các file PHP đang dùng:
--   login.php, register.php, profile.php, home.php, trip.php,
--   explore.php, new-trip.php, travel-guides.php,
--   guide-detail.php, place-detail.php
--
-- Quy ước: tên bảng/cột CHỮ THƯỜNG, PK luôn là "id" (trừ bảng
-- users cũng dùng "id"), session PHP dùng $_SESSION['user_id'].
-- ============================================================

CREATE DATABASE IF NOT EXISTS travel_planner
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE travel_planner;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS author_follows;
DROP TABLE IF EXISTS guide_comments;
DROP TABLE IF EXISTS guide_likes;
DROP TABLE IF EXISTS place_favorites;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS checklist_items;
DROP TABLE IF EXISTS itinerary_items;
DROP TABLE IF EXISTS itinerary_days;
DROP TABLE IF EXISTS trip_likes;
DROP TABLE IF EXISTS trip_members;
DROP TABLE IF EXISTS trips;
DROP TABLE IF EXISTS travel_guides;
DROP TABLE IF EXISTS places;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- 1) users
-- Dùng ở: login.php, register.php, profile.php, và JOIN users
-- trong home.php / trip.php / travel-guides.php / guide-detail.php...
-- ============================================================
CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(150)  NOT NULL,
    email         VARCHAR(190)  NOT NULL,
    password      VARCHAR(255)  NOT NULL,          -- lưu hash từ password_hash()
    avatar_url    VARCHAR(255)  NULL DEFAULT 'images/avatar-placeholder.png',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;


-- ============================================================
-- 2) places
-- Dùng ở: home.php (recommend), explore.php, place-detail.php
-- ============================================================
CREATE TABLE places (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(200)  NOT NULL,
    type          VARCHAR(50)   NULL,               -- 'hotel' / 'restaurant' / 'cafe' / 'attraction'...
    address       VARCHAR(255)  NULL,
    price         VARCHAR(100)  NULL,                -- vd "$$", "200,000đ" - để dạng text cho linh hoạt
    description   TEXT          NULL,
    about         TEXT          NULL,
    image_url     VARCHAR(255)  NULL,                -- ảnh đại diện, dùng cho home.php "recommend"
    image_urls    TEXT          NULL,                -- JSON array các ảnh chi tiết, dùng cho place-detail.php
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- ============================================================
-- 3) travel_guides
-- Dùng ở: travel-guides.php, guide-detail.php, profile.php (get_my_guides)
-- ============================================================
CREATE TABLE travel_guides (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    author_id     INT UNSIGNED  NOT NULL,
    title         VARCHAR(200)  NOT NULL,
    description   TEXT          NULL,
    cover_image   VARCHAR(255)  NULL,
    region        VARCHAR(100)  NULL,
    views         INT UNSIGNED  NOT NULL DEFAULT 0,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_guides_author
        FOREIGN KEY (author_id) REFERENCES users(id)
        ON DELETE CASCADE,

    KEY idx_guides_author (author_id),
    KEY idx_guides_region (region)
) ENGINE=InnoDB;


-- ============================================================
-- 4) trips
-- Dùng ở: home.php (upcoming/popular), trip.php, explore.php,
-- new-trip.php, profile.php (get_my_trips)
--
-- LƯU Ý: home.php bản cũ đang query "WHERE t.is_public = 1"
-- nhưng new-trip.php đã quyết định dùng cột "privacy" ENUM
-- ('friends','public','private') thay vì is_public (0/1).
-- Schema này theo đúng quyết định của new-trip.php => cần sửa
-- lại query "Popular Trips" trong home.php thành
-- "WHERE t.privacy = 'public'" cho khớp.
-- ============================================================
CREATE TABLE trips (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED  NOT NULL,           -- chủ sở hữu trip
    title         VARCHAR(200)  NOT NULL,
    destination   VARCHAR(150)  NULL,               -- vd "Ho Chi Minh City" - hiển thị ở Trip header/day label
    cover_image   VARCHAR(255)  NULL,
    start_date    DATE          NULL,
    end_date      DATE          NULL,
    privacy       ENUM('friends','public','private') NOT NULL DEFAULT 'friends',
    share_token   VARCHAR(64)   NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_trips_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_trips_share_token (share_token),
    KEY idx_trips_user (user_id),
    KEY idx_trips_privacy_created (privacy, created_at)
) ENGINE=InnoDB;


-- ============================================================
-- 5) trip_members
-- Dùng ở: trip.php (invite_member), new-trip.php (create_trip)
-- UNIQUE(trip_id, user_id) để "ON DUPLICATE KEY UPDATE permission"
-- trong trip.php hoạt động đúng.
-- ============================================================
CREATE TABLE trip_members (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id       INT UNSIGNED  NOT NULL,
    user_id       INT UNSIGNED  NOT NULL,
    permission    ENUM('edit','view') NOT NULL DEFAULT 'view',
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tripmembers_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tripmembers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_tripmembers_trip_user (trip_id, user_id)
) ENGINE=InnoDB;


-- ============================================================
-- 6) trip_likes
-- Dùng ở: home.php (toggle_like, popular trips like_count)
-- ============================================================
CREATE TABLE trip_likes (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id       INT UNSIGNED  NOT NULL,
    user_id       INT UNSIGNED  NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_triplikes_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_triplikes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_triplikes_trip_user (trip_id, user_id)
) ENGINE=InnoDB;


-- ============================================================
-- 7) itinerary_days
-- Dùng ở: trip.php (get_trip), explore.php (get_days),
-- guide-detail.php (get_days), place-detail.php (get_days)
-- ============================================================
CREATE TABLE itinerary_days (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id       INT UNSIGNED  NOT NULL,
    day_number    INT UNSIGNED  NOT NULL,
    day_date      DATE          NULL,

    CONSTRAINT fk_days_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_days_trip_number (trip_id, day_number),
    KEY idx_days_trip (trip_id)
) ENGINE=InnoDB;


-- ============================================================
-- 8) itinerary_items
-- Dùng ở: trip.php (update_place/remove_place/add_place_to_day),
-- explore.php (add_to_trip), place-detail.php (add_to_trip),
-- guide-detail.php (save_place_to_day - KHÔNG có place_id)
-- => place_id phải NULL được.
-- ============================================================
CREATE TABLE itinerary_items (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    day_id        INT UNSIGNED  NOT NULL,
    place_id      INT UNSIGNED  NULL,               -- NULL khi item được tạo tay từ guide (chưa gắn place có sẵn)
    title         VARCHAR(200)  NOT NULL,
    item_type     VARCHAR(30)   NOT NULL DEFAULT 'other',
    start_time    TIME          NULL,
    cost          DECIMAL(12,2) NULL,
    description   TEXT          NULL,
    order_index   INT UNSIGNED  NOT NULL DEFAULT 0,

    CONSTRAINT fk_items_day
        FOREIGN KEY (day_id) REFERENCES itinerary_days(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_items_place
        FOREIGN KEY (place_id) REFERENCES places(id)
        ON DELETE SET NULL,

    KEY idx_items_day (day_id),
    KEY idx_items_place (place_id)
) ENGINE=InnoDB;


-- ============================================================
-- 8.1) checklist_items
-- Dùng ở: trip.php (add_checklist_item/toggle_checklist_item/delete_checklist_item)
-- Mỗi checklist item gắn với 1 itinerary_item cụ thể (1 Place trong 1 Day).
-- ============================================================
CREATE TABLE checklist_items (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    item_id       INT UNSIGNED  NOT NULL,           -- FK -> itinerary_items.id
    content       VARCHAR(255)  NOT NULL,
    is_done       TINYINT(1)    NOT NULL DEFAULT 0,
    order_index   INT UNSIGNED  NOT NULL DEFAULT 0,

    CONSTRAINT fk_checklist_item
        FOREIGN KEY (item_id) REFERENCES itinerary_items(id)
        ON DELETE CASCADE,

    KEY idx_checklist_item (item_id)
) ENGINE=InnoDB;


-- ============================================================
-- 9) expenses
-- Dùng ở: trip.php (add_expense), profile.php gián tiếp qua trip
-- ============================================================
CREATE TABLE expenses (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trip_id       INT UNSIGNED  NOT NULL,
    created_by    INT UNSIGNED  NOT NULL,
    category      VARCHAR(150)  NOT NULL,           -- alias "note" trong trip.php
    amount        INT           NOT NULL,
    expense_date  DATE          NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expenses_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_expenses_user
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON DELETE CASCADE,

    KEY idx_expenses_trip (trip_id)
) ENGINE=InnoDB;


-- ============================================================
-- 10) reviews
-- Dùng ở: place-detail.php (get_reviews/add_review/edit_review/delete_review)
-- ============================================================
CREATE TABLE reviews (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    place_id      INT UNSIGNED  NOT NULL,
    user_id       INT UNSIGNED  NOT NULL,
    rating        TINYINT UNSIGNED NOT NULL,        -- 1..5, validate ở PHP
    comment       TEXT          NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_place
        FOREIGN KEY (place_id) REFERENCES places(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_reviews_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),

    KEY idx_reviews_place (place_id)
) ENGINE=InnoDB;


-- ============================================================
-- 11) place_favorites
-- Dùng ở: place-detail.php (toggle_favorite) - TODO trong code cũ,
-- schema tạo sẵn để bật lại tính năng khi cần.
-- ============================================================
CREATE TABLE place_favorites (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    place_id      INT UNSIGNED  NOT NULL,
    user_id       INT UNSIGNED  NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_placefav_place
        FOREIGN KEY (place_id) REFERENCES places(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_placefav_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_placefav_place_user (place_id, user_id)
) ENGINE=InnoDB;


-- ============================================================
-- 12) guide_likes
-- Dùng ở: travel-guides.php, guide-detail.php, profile.php (get_favorite_guides)
-- ============================================================
CREATE TABLE guide_likes (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guide_id      INT UNSIGNED  NOT NULL,
    user_id       INT UNSIGNED  NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_guidelikes_guide
        FOREIGN KEY (guide_id) REFERENCES travel_guides(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_guidelikes_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_guidelikes_guide_user (guide_id, user_id)
) ENGINE=InnoDB;


-- ============================================================
-- 13) guide_comments
-- Dùng ở: guide-detail.php (add_comment/edit_comment/delete_comment)
-- ============================================================
CREATE TABLE guide_comments (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guide_id      INT UNSIGNED  NOT NULL,
    user_id       INT UNSIGNED  NOT NULL,
    content       TEXT          NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comments_guide
        FOREIGN KEY (guide_id) REFERENCES travel_guides(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_comments_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,

    KEY idx_comments_guide (guide_id)
) ENGINE=InnoDB;


-- ============================================================
-- 14) author_follows
-- Dùng ở: guide-detail.php (toggle_follow), profile.php (followers/following count)
-- ============================================================
CREATE TABLE author_follows (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    follower_id   INT UNSIGNED  NOT NULL,           -- người bấm Follow
    followed_id   INT UNSIGNED  NOT NULL,           -- người được follow (tác giả guide)
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_follows_follower
        FOREIGN KEY (follower_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_follows_followed
        FOREIGN KEY (followed_id) REFERENCES users(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_follows_pair (follower_id, followed_id)
) ENGINE=InnoDB;


-- ============================================================
-- SEED DATA: 1 user test để đăng nhập thử
-- ⚠️ Cột "password" PHẢI là chuỗi hash từ password_hash() của PHP,
-- KHÔNG được ghi chuỗi thường vào đây (login.php dùng password_verify()).
--
-- Cách lấy hash đúng (chạy 1 trong 2 cách, rồi thay vào bên dưới):
--   1. Dòng lệnh:  php -r "echo password_hash('123456', PASSWORD_DEFAULT);"
--   2. Hoặc tạo 1 file test.php tạm:
--        <?php echo password_hash('123456', PASSWORD_DEFAULT);
--      mở bằng trình duyệt, copy chuỗi in ra (dạng $2y$10$....)
-- ============================================================
INSERT INTO users (full_name, email, password, avatar_url) VALUES
('Test User', 'test@example.com', '<DÁN_HASH_TỪ_password_hash_VÀO_ĐÂY>', 'images/avatar-placeholder.png');
