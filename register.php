<?php
require_once '../config.php';
setHeaders();
startSession();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Method not allowed'], 405);

$data  = getBody();
$name  = trim($data['name']  ?? '');
$email = strtolower(trim($data['email'] ?? ''));
$phone = trim($data['phone'] ?? '');
$pass  = $data['password']   ?? '';
$role  = 'user'; // Admin role is NEVER allowed via registration

if (!$name)                                               respond(['error' => 'Name is required'], 422);
if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Valid email is required'], 422);
if (strlen($pass) < 6)                                    respond(['error' => 'Password must be at least 6 characters'], 422);

$chk = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$chk->execute([$email]);
if ($chk->fetch()) respond(['error' => 'This email is already registered'], 409);

$hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 10]);
$pdo->prepare("INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)")
    ->execute([$name, $email, $phone ?: null, $hash, $role]);
$id = (int)$pdo->lastInsertId();

$_SESSION['user_id'] = $id;
$_SESSION['name']    = $name;
$_SESSION['role']    = $role;

respond(['success' => true, 'user' => [
    'id' => $id, 'name' => $name, 'email' => $email, 'phone' => $phone, 'role' => $role
]], 201);
