<?php
require_once '../config.php';
setHeaders();
startSession();
$_SESSION = [];
session_destroy();
respond(['success' => true]);
