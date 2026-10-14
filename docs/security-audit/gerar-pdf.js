// docs/security-audit/gerar-pdf.js
//
// Gera relatorio-auditoria-seguranca.pdf a partir de relatorio.html usando o
// Chromium já instalado para os testes E2E (fasthotel-app/node_modules,
// @playwright/test -> playwright-core). Não instala nada novo.
//
// Uso:  node docs/security-audit/gerar-pdf.js

const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../fasthotel-app/node_modules/playwright-core'));

const HTML_PATH = path.resolve(__dirname, 'relatorio.html');
const PDF_PATH = path.resolve(__dirname, 'relatorio-auditoria-seguranca.pdf');

const headerTemplate = `
  <style>
    .hdr { font-family: Arial, sans-serif; font-size: 8px; color: #64748b; width: 100%;
           padding: 0 40px; display: flex; justify-content: space-between; }
  </style>
  <div class="hdr">
    <span>Relatório de Auditoria de Segurança — FastHotel</span>
    <span>02/09/2026</span>
  </div>`;

const footerTemplate = `
  <style>
    .ftr { font-family: Arial, sans-serif; font-size: 8px; color: #64748b; width: 100%;
           text-align: center; }
  </style>
  <div class="ftr">Página <span class="pageNumber"></span> de <span class="totalPages"></span></div>`;

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto('file:///' + HTML_PATH.replace(/\\/g, '/'), { waitUntil: 'networkidle' });

    await page.pdf({
      path: PDF_PATH,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate,
      footerTemplate,
      margin: { top: '70px', bottom: '50px', left: '40px', right: '40px' },
    });

    console.log('PDF gerado em:', PDF_PATH);
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error('Falha ao gerar o PDF:', err);
  process.exit(1);
});
