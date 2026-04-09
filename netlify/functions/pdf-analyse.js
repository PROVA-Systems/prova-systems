/**
 * PROVA — PDF-Text für KI (Beweisfragen). Nutzt pdf.js (CDN-Lazy-Load).
 */
(function () {
  var pdfReady = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfReady) return pdfReady;
    pdfReady = loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js').then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
      return window.pdfjsLib;
    });
    return pdfReady;
  }

  function extractTextFromArrayBuffer(buf) {
    return ensurePdfJs().then(function (pdfjsLib) {
      return pdfjsLib.getDocument({ data: buf }).promise.then(function (pdf) {
        var text = '';
        var chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) {
          (function (pageNum) {
            chain = chain.then(function () {
              return pdf.getPage(pageNum).then(function (page) {
                return page.getTextContent();
              }).then(function (tc) {
                text += tc.items.map(function (it) { return it.str; }).join(' ') + '\n';
              });
            });
          })(i);
        }
        return chain.then(function () { return text; });
      });
    });
  }

  function extractTextFromFile(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        extractTextFromArrayBuffer(r.result).then(resolve).catch(reject);
      };
      r.onerror = reject;
      r.readAsArrayBuffer(file);
    });
  }

  window.PROVAPdfAnalyse = {
    extractTextFromArrayBuffer: extractTextFromArrayBuffer,
    extractTextFromFile: extractTextFromFile
  };
})();
