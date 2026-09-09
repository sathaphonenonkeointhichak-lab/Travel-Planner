<?php

require_once 'config.php';

try {
    $pdo = getDbConnection();

    echo "Database connection successful!";
    
} catch (PDOException $e) {
    echo "Database connection failed: " . $e->getMessage();
}
?>