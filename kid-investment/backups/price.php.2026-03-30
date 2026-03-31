<?php
/**
 * 实时价格获取接口
 * GET ?symbols=QQQ.US,MSFT.US,GOLD.US,AXP.US
 * 返回 {"prices":{"QQQ.US":562.58,...}}
 * 由 Nginx 直接调用 PHP-FPM，无须后台常驻
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$symbols = isset($_GET['symbols']) ? $_GET['symbols'] : '';
if (!$symbols) {
    echo json_encode(['error' => 'no symbols']);
    exit;
}

$symList = array_filter(array_map('trim', explode(',', $symbols)));
if (!$symList) {
    echo json_encode(['prices' => []]);
    exit;
}

function fetchPrice($sym) {
    // 尝试 Yahoo Finance
    $yahoo = fetchYahoo($sym);
    if ($yahoo > 0) return $yahoo;
    
    // 备选 Stooq
    return fetchStooq($sym);
}

function fetchYahoo($sym) {
    $url = "https://query1.finance.yahoo.com/v8/finance/chart/" . urlencode($sym) . "?interval=1d&range=1d";
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0\r\nAccept: application/json\r\n",
            'timeout' => 5
        ]
    ]);
    $html = @file_get_contents($url, false, $context);
    if (!$html) return 0;
    $data = @json_decode($html, true);
    if (!$data) return 0;
    $result = @$data['chart']['result'][0];
    if (!$result) return 0;
    return floatval(@$result['meta']['regularMarketPrice']) ?: 0;
}

function fetchStooq($sym) {
    $clean = str_replace('.US', '', strtoupper($sym));
    $url = "https://stooq.com/q/l/?s=" . strtolower($clean) . "&f=sd2t2ohlcv&h&e=csv";
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: curl/7.68.0\r\n",
            'timeout' => 8
        ]
    ]);
    $html = @file_get_contents($url, false, $context);
    if (!$html) return 0;
    $lines = explode("\n", trim($html));
    foreach ($lines as $line) {
        $cols = str_getcsv($line);
        if (count($cols) >= 4 && is_numeric(@$cols[4])) {
            return floatval($cols[4]);
        }
    }
    return 0;
}

$prices = [];
foreach ($symList as $sym) {
    $prices[$sym] = fetchPrice($sym);
    if ($prices[$sym] > 0) usleep(200000); // 200ms间隔避免限速
}

echo json_encode(['prices' => $prices]);
