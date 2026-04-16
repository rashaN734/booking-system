<?php
require_once '../config.php';
setHeaders();
requireAdmin();

// GET — list all
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $sql    = "SELECT a.*, u.name AS user_name, u.email AS user_email
               FROM appointments a JOIN users u ON a.user_id = u.id WHERE 1=1";
    $params = [];
    if ($search) {
        $sql .= " AND (u.name LIKE ? OR u.email LIKE ? OR a.service LIKE ?)";
        $like  = '%' . $search . '%';
        $params = [$like, $like, $like];
    }
    $sql .= " ORDER BY a.created_at DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
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
}

// PUT — update status
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data   = getBody();
    $id     = (int)($data['id']     ?? 0);
    $status = $data['status'] ?? '';
    if (!$id) respond(['error' => 'ID required'], 400);
    if (!in_array($status, ['pending','confirmed','cancelled'])) respond(['error' => 'Invalid status'], 400);
    $stmt = $pdo->prepare("UPDATE appointments SET status = ? WHERE id = ?");
    $stmt->execute([$status, $id]);
    if (!$stmt->rowCount()) respond(['error' => 'Appointment not found'], 404);
    respond(['success' => true, 'message' => 'Status updated to ' . $status]);
}

// DELETE
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) respond(['error' => 'ID required'], 400);
    $stmt = $pdo->prepare("DELETE FROM appointments WHERE id = ?");
    $stmt->execute([$id]);
    if (!$stmt->rowCount()) respond(['error' => 'Appointment not found'], 404);
    respond(['success' => true, 'message' => 'Deleted successfully']);
}

respond(['error' => 'Method not allowed'], 405);
