<?php
require_once '../config.php';
setHeaders();
requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') respond(['error' => 'Method not allowed'], 405);

$data   = getBody();
$id     = (int)($data['id'] ?? 0);
$userId = (int)$_SESSION['user_id'];
$role   = $_SESSION['role'] ?? 'user';

if (!$id) respond(['error' => 'Appointment ID required'], 400);

$stmt = $pdo->prepare("SELECT * FROM appointments WHERE id = ? LIMIT 1");
$stmt->execute([$id]);
$appt = $stmt->fetch();

if (!$appt) respond(['error' => 'Appointment not found'], 404);
if ($role !== 'admin' && (int)$appt['user_id'] !== $userId) respond(['error' => 'Forbidden'], 403);
if ($appt['status'] === 'cancelled') respond(['error' => 'Already cancelled'], 400);

$pdo->prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?")->execute([$id]);
respond(['success' => true, 'message' => 'Appointment cancelled successfully']);
