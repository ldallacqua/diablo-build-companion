# Third-party resources

The MIT project license does not replace these licenses. Dependency packages retain their upstream notices in the packaged node modules where applicable.

| Component                | License                            | Source                                                                                |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------- |
| React / React DOM        | MIT                                | https://github.com/facebook/react                                                     |
| Zod                      | MIT                                | https://github.com/colinhacks/zod                                                     |
| Lucide React             | ISC                                | https://github.com/lucide-icons/lucide                                                |
| Tesseract.js             | Apache-2.0                         | https://github.com/naptha/tesseract.js                                                |
| Tesseract.js core        | Apache-2.0                         | https://github.com/naptha/tesseract.js-core                                           |
| English trained OCR data | Apache-2.0, derived Tesseract data | https://github.com/naptha/tessdata and https://github.com/tesseract-ocr/tessdata_best |
| Electron                 | MIT + third-party Chromium notices | https://github.com/electron/electron                                                  |

The English model source and SHA-256 are locked in ocr/model-lock.json. It is downloaded only at build time and included with the release for offline use. The Electron distribution's LICENSE and LICENSES.chromium.html accompany the runtime. Full Apache-2.0 text is included as LICENSE-TESSERACT.txt. No Windows fonts are redistributed.

Original generated art has the project grant described in docs/ASSETS.md. Diablo IV and Maxroll assets are not bundled.
