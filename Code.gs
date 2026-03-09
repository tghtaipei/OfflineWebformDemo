/**
 * 離線暫存網頁Demo
 * 使用 HtmlService 提供具備離線暫存功能的電子表單
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('離線暫存網頁Demo')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}
