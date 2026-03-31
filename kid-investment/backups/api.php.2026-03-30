<?php
/**
 * 儿童投资小管家 - 数据同步接口
 * 数据存储在同目录的 data.json 文件中
 * 支持 GET（读取）和 POST（保存，带文件锁）
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$DATA_FILE = __DIR__ . '/data.json';

// 辅助函数：读取数据
function readData($file) {
    if (!file_exists($file)) {
        $init = json_encode(['account' => null, 'transactions' => [], 'positions' => [], 'lastUpdated' => null], JSON_UNESCAPED_UNICODE);
        file_put_contents($file, $init);
        return json_decode($init, true);
    }
    $content = file_get_contents($file);
    if ($content === false || $content === '') {
        return ['account' => null, 'transactions' => [], 'positions' => {}, 'lastUpdated' => null];
    }
    return json_decode($content, true) ?: ['account' => null, 'transactions' => [], 'positions' => {}, 'lastUpdated' => null];
}

// 辅助函数：写入数据（原子操作）
function writeData($file, $data) {
    $data['lastUpdated'] = date('c');
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    // 先写到临时文件，再 rename（更安全）
    $tmpFile = $file . '.tmp.' . uniqid();
    $ok = file_put_contents($tmpFile, $json);
    if ($ok !== false) {
        rename($tmpFile, $file);
        return true;
    }
    unlink($tmpFile);
    return false;
}

// 读取数据（GET）
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = readData($DATA_FILE);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// 保存数据（POST）
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);

    if ($input === null) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON data']);
        exit;
    }

    // 文件锁写入
    $fp = fopen($DATA_FILE, 'c+');
    if (!$fp) {
        http_response_code(500);
        echo json_encode(['error' => 'Cannot open data file']);
        exit;
    }

    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        http_response_code(503);
        echo json_encode(['error' => 'File is locked, try again']);
        exit;
    }

    // 读取现有数据
    $existing = readData($DATA_FILE);

    // 合并：客户端数据覆盖服务端（客户端是最新操作）
    $merged = $input;
    $merged['lastUpdated'] = date('c');

    writeData($DATA_FILE, $merged);
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode(['success' => true, 'data' => $merged]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
