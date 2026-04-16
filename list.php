<?php
require_once '../config.php';
setHeaders();
requireLogin();

$userId = (int)$_SESSION['user_id'];
$status = trim($_GET['status'] ?? 'all');
if (!in_array($status, ['all','pending','confirmed','cancelled'])) $status = 'all';

if ($status === 'all') {
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS user_name, u.email AS user_email
         FROM appointments a JOIN users u ON a.user_id = u.id
         WHERE a.user_id = ? ORDER BY a.created_at DESC"
    );
    $stmt->execute([$userId]);
} else {
    $stmt = $pdo->prepare(
        "SELECT a.*, u.name AS user_name, u.email AS user_email
         FROM appointments a JOIN users u ON a.user_id = u.id
         WHERE a.user_id = ? AND a.status = ? ORDER BY a.created_at DESC"
    );
    $stmt->execute([$userId, $status]);
}

$rows = $stmt->fetchAll();
$out  = array_map(fn($a) => [
    'id'          => (int)$a['id'],
    'userId'      => (int)$a['user_id'],
    'userName'    => $a['user_name'],
    'userEmail'   => $a['user_email'],
    'service'     => $a['service'],
    'serviceId'   => $a['service_id'],
    'serviceIcon' => $a['icon'],
    'date'        => $a['appt_date'],
    'time'        => $a['appt_time'],
    'duration'    => (int)$a['duration'],
    'price'       => (float)$a['price'],
    'notes'       => $a['notes'] ?? '',
    'status'      => $a['status'],
    'createdAt'   => $a['created_at'],
], $rows);

respond(['success' => true, 'appointments' => $out]);
