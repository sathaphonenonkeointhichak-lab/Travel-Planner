<?php
/**
 * config.php
 * File cấu hình kết nối MySQL dùng chung cho toàn bộ website.
 *
 * TODO: Thay các giá trị bên dưới bằng thông tin MySQL thật của bạn.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'travel_planner');   // TODO: đổi đúng tên database thật
define('DB_USER', 'root');             // TODO: đổi đúng user MySQL
define('DB_PASS', '1234');                 // TODO: đổi đúng password MySQL
define('DB_CHARSET', 'utf8mb4');

function getDbConnection(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Database connection failed']);
            exit;
        }
    }

    return $pdo;
}
