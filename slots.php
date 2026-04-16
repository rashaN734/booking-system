<?php
require_once '../config.php';
setHeaders();

$date = trim($_GET['date'] ?? '');
if (!$date) respond(['error' => 'date parameter required'], 400);

$d = DateTime::createFromFormat('Y-m-d', $date);
if (!$d) respond(['error' => 'Invalid date format'], 400);

$dow = (int)$d->format('N'); // 1=Mon … 7=Sun
if ($dow >= 6) respond(['error' => 'Weekends not available', 'slots' => [], 'booked' => []]);

$allSlots = [
    '8:00 AM','8:30 AM','9:00 AM','9:30 AM',
    '10:00 AM','10:30 AM','11:00 AM','11:30 AM',
    '1:00 PM','1:30 PM','2:00 PM','2:30 PM',
    '3:00 PM','3:30 PM','4:00 PM','4:30 PM',
];

$stmt = $pdo->prepare("SELECT appt_time FROM appointments WHERE appt_date = ? AND status != 'cancelled'");
$stmt->execute([$date]);
$booked = $stmt->fetchAll(PDO::FETCH_COLUMN);

$slots = array_map(fn($s) => ['time' => $s, 'available' => !in_array($s, $booked)], $allSlots);

respond(['success' => true, 'date' => $date, 'slots' => $slots, 'booked' => $booked]);
