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

The English model source and SHA-256 are locked in ocr/model-lock.json. It is downloaded only at build time and included with the release for offline use. The Electron distribution's LICENSE and LICENSES.chromium.html accompany the runtime. Full Apache-2.0 text is included in ocr/LICENSE-APACHE.txt. No Windows fonts are redistributed.

Inter variable font is bundled under SIL Open Font License 1.1, from https://github.com/rsms/inter at commit 353b61b9f4430d5f420d56605a6e7993e0941470. Its full copyright and OFL text are included at dist/fonts/OFL-Inter.txt inside the app. The font's source and SHA-256 are in asset-licenses.json.

Original generated art has the project grant described in docs/ASSETS.md. Diablo IV and Maxroll assets are not bundled.

Steam/texture format references: WiseOwl.Casc (Wise Owl Software), TACTLib (overtools), and d4-asset-extractor (Game Strategy HQ), MIT. Full copyright/license texts are included in extraction-notices.txt. Pinned source references and research boundaries are documented in docs/EXTRACTION.md. The proprietary artwork read by the optional extractor is not included and is not licensed under the project MIT grant.
