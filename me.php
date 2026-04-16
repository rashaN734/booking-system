<?php
require_once '../config.php';
setHeaders();
startSession();

if (empty($_SESSION['user_id'])) {
    respond(['loggedIn' => false, 'user' => null]);
}

$stmt = $pdo->prepare("SELECT id, name, email, phone, role FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    respond(['loggedIn' => false, 'user' => null]);
}

respond(['loggedIn' => true, 'user' => $user]);
