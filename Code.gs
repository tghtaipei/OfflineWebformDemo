/**
 * 離線暫存網頁Demo
 * 使用 HtmlService 提供具備離線暫存功能的電子表單
 *
 * 注意：script.google.com 的 CSP 封鎖 Service Worker 註冊（worker-src 限制），
 * 因此無法透過 SW 支援離線 F5 刷新。
 * 表單資料（localStorage / localForage）在頁面保持開啟時仍完全支援離線作業。
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('離線暫存網頁Demo')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}
