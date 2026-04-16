<?php
require_once '../config.php';
setHeaders();
requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(['error' => 'Method not allowed'], 405);

$data      = getBody();
$userId    = (int)$_SESSION['user_id'];
$service   = trim($data['service']    ?? '');
$serviceId = trim($data['service_id'] ?? '');
$icon      = trim($data['icon']       ?? '📅');
$date      = trim($data['date']       ?? '');
$time      = trim($data['time']       ?? '');
$duration  = (int)($data['duration']  ?? 30);
$price     = (float)($data['price']   ?? 0);
$notes     = trim($data['notes']      ?? '');

if (!$service || !$date || !$time) respond(['error' => 'Service, date and time are required'], 400);

$d = DateTime::createFromFormat('Y-m-d', $date);
if (!$d) respond(['error' => 'Invalid date format'], 400);
if ($d < new DateTime('today')) respond(['error' => 'Cannot book a past date'], 400);
if ((int)$d->format('N') >= 6) respond(['error' => 'Weekends are not available'], 400);

// Double booking check
$chk = $pdo->prepare("SELECT id FROM appointments WHERE appt_date = ? AND appt_time = ? AND status != 'cancelled' LIMIT 1");
$chk->execute([$date, $time]);
if ($chk->fetch()) respond(['error' => 'This time slot is already booked. Please choose another slot.'], 409);

$pdo->prepare(
    "INSERT INTO appointments (user_id, service, service_id, icon, appt_date, appt_time, duration, price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
)->execute([$userId, $service, $serviceId, $icon, $date, $time, $duration, $price, $notes ?: null]);

respond(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Appointment booked!'], 201);
