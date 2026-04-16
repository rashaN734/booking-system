<?php
require_once '../config.php';
setHeaders();
startSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Method not allowed'], 405);

$data  = getBody();
$email = strtolower(trim($data['email']    ?? ''));
$pass  = $data['password'] ?? '';

if (!$email || !$pass) respond(['error' => 'Email and password are required'], 400);

$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($pass, $user['password'])) {
    respond(['error' => 'Invalid email or password'], 401);
}

$_SESSION['user_id'] = $user['id'];
$_SESSION['name']    = $user['name'];
$_SESSION['role']    = $user['role'];

respond(['success' => true, 'user' => [
    'id'    => (int)$user['id'],
    'name'  => $user['name'],
    'email' => $user['email'],
    'phone' => $user['phone'] ?? '',
    'role'  => $user['role'],
]]);
