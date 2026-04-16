<?php
require_once '../config.php';
setHeaders();
requireAdmin();

$totals = $pdo->query(
    "SELECT
       COUNT(*) AS total,
       SUM(status='pending')   AS pending,
       SUM(status='confirmed') AS confirmed,
       SUM(status='cancelled') AS cancelled,
       COALESCE(SUM(CASE WHEN status != 'cancelled' THEN price ELSE 0 END), 0) AS revenue
     FROM appointments"
)->fetch();

$users = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();

respond([
    'success' => true,
    'stats'   => [
        'total'     => (int)$totals['total'],
        'pending'   => (int)$totals['pending'],
        'confirmed' => (int)$totals['confirmed'],
        'cancelled' => (int)$totals['cancelled'],
        'revenue'   => (float)$totals['revenue'],
        'users'     => $users,
    ],
]);
