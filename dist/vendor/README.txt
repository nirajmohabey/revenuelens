RevenueLens printable brief dependency

jsPDF 4.2.1, MIT license, from the official npm package:
https://www.npmjs.com/package/jspdf
https://github.com/parallax/jsPDF
Package integrity: sha512-YyAXyvnmjTbR4bHQRLzex3CuINCDlQnBqoSYyjJwTP2x9jDLuKDzy7aKUl0hgx3uhcl7xzg32agn5vlie6HIlQ==

Bundled as a browser ESM named export with esbuild 0.28.2:
export { jsPDF } from 'jspdf';
Options: bundle, format=esm, platform=browser, minify, legalComments=eof.
Bundled dependency notices remain at the end of jspdf.mjs.
The full jsPDF license is in jsPDF-LICENSE.txt.

The bundle loads only when Download PDF is selected. Brief generation runs
locally in the browser from the selected rendered report, without uploading
report data or loading scripts from a CDN.
