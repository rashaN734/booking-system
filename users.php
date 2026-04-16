<?php
require_once '../config.php';
setHeaders();
requireAdmin();

$stmt = $pdo->query(
    "SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
            COUNT(a.id) AS total_appointments
     FROM users u
     LEFT JOIN appointments a ON a.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC"
);

$users = array_map(fn($u) => [
    'id'                => (int)$u['id'],
    'name'              => $u['name'],
    'email'             => $u['email'],
    'phone'             => $u['phone'] ?? '',
    'role'              => $u['role'],
    'totalAppointments' => (int)$u['total_appointments'],
    'createdAt'         => $u['created_at'],
], $stmt->fetchAll());

respond(['success' => true, 'users' => $users]);
