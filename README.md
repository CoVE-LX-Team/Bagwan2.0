# Bagwan2.0

Static HTML replica of the Bagwan Health learning intranet, hosted entirely by GitHub Pages.

**Start here: [Bagwan Health staff intranet](https://cove-lx-team.github.io/Bagwan2.0/).**

The root [`index.html`](index.html) is the intranet homepage. The original route is also available at [`scorm/intranet/index.html`](scorm/intranet/index.html).

## Static site

- The public intranet pages, departments, news, policies, organisation charts and patient-management screens have been exported to HTML.
- Images, styles, scripts, fonts, H5P activity data and 360° panoramas are served from this repository. The 12 original YouTube embeds and 12 recovered gallery videos are available; YouTube hosts playback and video files. [Browse the videos](videos/index.html).
- Google Drive embeds are replaced with local document lists and download links. The complete migrated files remain in `documents/`.
- The virtual tour uses the original panoramas and hotspot text with a self-hosted Pannellum viewer, room navigation and keyboard-accessible information controls.
- Patient forms and the replacement training incident report support browser-local drafts, draft downloads and printing to PDF. GitHub Pages does not receive form submissions.
- `.nojekyll` serves the committed HTML and assets directly; WordPress and a build server are not required.

`static-export.json` records the 90 source URLs, local destinations, copied asset hashes and assets already unavailable at the source. `content-review.json` records repaired content/navigation gaps and unresolved source omissions. The original counselling panorama and an evacuation-plan image are unavailable; the tour avoids requesting those missing files.

The review repairs the Departments index, staff directory using published organisation-chart names and roles, doctor profile dialogs, document headings, breadcrumbs, community links, interpreting scenario targets and patient-system navigation. Wide policy/form tables scroll within the page, and patient-system headers and draft controls fit phone screens. Patient-form PDF controls now use browser printing, including partially completed forms. Clinical document files and the original review documents remain unchanged.

The Next page / Previous page footer navigation has been removed from news articles. Interpreting scenario controls remain available within the activity.

The hospital organisation charts use responsive grids that preserve every published name, role and destination. Both chart routes fit phone, tablet and desktop widths. All seven patient-management dashboard cards have full-card links to the corresponding form or staff resource.

Remaining content gaps require source material: nursing and ATSI staff lists were absent; medication-safety and nursing-handover policy pages contained no documents. Those pages identify the gap and link to available resources. Clinical accuracy and outdated references in original materials need content-owner review.

The largest copied site asset is `VR/public/static_assets/360_images/dentalroom_Panorama.jpg` (5,400,055 bytes). No LFS pointers are used by the published site.

The HR and ATSI video galleries were recovered from the 14 April 2025 WordPress backup. HR Services and the Resources tabs now use direct YouTube players and watch links for all 12 recovered videos, with titles from archived YouTube responses. The video index contains 24 unique videos. The public source list is `data/recovered-galleries.json`; no database dump or plugin credentials are included. Future exports restore these galleries automatically. Reapply only this repair with `python3 scripts/repair_video_galleries.py`. Current playback depends on YouTube availability.

## Preview and regenerate

The committed site uses `/Bagwan2.0/` as its base path. From the parent of the `Bagwan2.0` checkout, run:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/Bagwan2.0/`.

### Local responsive improvements

The local responsive pass replaces the cramped tablet sidebar with a navigation drawer below 1100px, keeps headings clear of the fixed header, and reflows news, quick links and patient cards. Navigation supports keyboard focus, Escape, outside-click dismissal and native touch scrolling. Embedded resource accordions resize their frames when expanded. Other wide tables retain their columns in labelled scroll regions with a visible instruction when scrolling is required. The Abbey scale, Food and Fluids, Personal Care and Continence forms now use responsive sections instead of wide grids.

These changes are local and have not been pushed or deployed. The responsive markup repairs are included in the exporter and can also be reapplied locally, without fetching the source site:

```sh
python3 scripts/repair_responsive.py
```

Browser interaction checks cover navigation, embedded accordions, dialogs, values cards, search, patient tabs, form draft saving/downloads and live resizing from 320px to 1920px. Run from the parent directory with the preview server above running:

```sh
npx --yes --package @playwright/cli playwright-cli --session bagwan open http://127.0.0.1:4173/Bagwan2.0/
npx --yes --package @playwright/cli playwright-cli --session bagwan run-code "$(cat Bagwan2.0/scripts/check_responsive.js)"
```

Screenshots are written to the ignored `output/playwright/` directory. Layout checks use Chromium; a separate touch-emulation pass covers long navigation menus, landscape use, organisation charts and video-player dimensions. External video requests are blocked during local layout checks, so those checks do not establish YouTube playback availability.

Home-page quick links follow the news on smaller screens, so frequent users may prefer the navigation drawer. Missing source materials and clinical-content review remain as listed above. Physical-device and Safari/Firefox checks remain outstanding.

### Responsive clinical forms and Infection Control tables

The Abbey scale uses labelled observation fields and six assessment sections, with a calculated total and an explicit incomplete status until all six areas are scored. Food and Fluids and Personal Care use repeatable entry sections; adding an entry preserves existing data and moves keyboard focus to the new date. Each entry retains the original choices and PCA role. Continence shows one recording day at a time and allows each hour to expand independently; all three days remain in drafts and printouts.

Drafts autosave in local browser storage. Earlier single-entry drafts remain readable, and additional entries and multiple selections restore after reloading. Print / save PDF creates a read-only summary that includes all entries or recording days, including those currently hidden on screen. The placeholder support email and telephone have been removed from patient-system footers.

All six Infection Control tables use fluid columns on larger screens and place each component above its required actions at 700px and below. Fixed Word row heights and widths have been removed. Column and row headers retain their relationships for assistive technology. Original table text, clinical field order, choices and downloaded source documents are preserved.

Run the dedicated browser checks alongside the existing keyboard and responsive checks:

```sh
npx --yes --package @playwright/cli playwright-cli --session bagwan run-code "$(cat Bagwan2.0/scripts/check_clinical.js)"
```

The critical review found and fixed clipped Word table rows, draft loss when adding rows, incomplete scores appearing as a finished zero, and printouts omitting hidden days. Remaining limitations: these are browser-local training drafts; the Food and Fluids form retains its original fractional amount and time fields, without a separate fluid-volume field. Source clinical wording still needs subject-matter review. Physical-device, screen-reader and other browser-engine checks remain outstanding.

### Local accessibility improvements

The accessibility pass adds main landmarks and skip links, meaningful headings and control names, visible keyboard focus, stronger text contrast and named table regions. Navigation disclosures, patient and resource tabs, flip cards, message expansion, profile dialogs and virtual-tour information support keyboard operation and focus return. Tabs use arrow keys, Home and End; Escape closes the nearest open submenu or dialog before leaving its parent navigation.

Clinical forms use labelled native controls. Help is available from a button rather than only on hover, and multiple selections survive draft saving and reloading. Continence entries use a day selector and hourly disclosures, with labels that identify the day, time and purpose of each field. Original patient scenarios, exercise answers and imported document files remain unchanged. The existing H5P keyboard controls are retained, with instructions and improved embedded-document semantics.

Run the keyboard journeys from the parent directory with the local preview and Playwright session above running:

```sh
npx --yes --package @playwright/cli playwright-cli --session bagwan run-code "$(cat Bagwan2.0/scripts/check_accessibility.js)"
```

The review combines axe-core 4.12.1 checks using WCAG 2 A/AA, 2.1 A/AA, 2.2 AA and best-practice rules with keyboard journeys and visual inspection. Automated results and screenshots are saved under the ignored `output/playwright/` directory. Automated checks do not establish full WCAG conformance. Screen-reader testing, video captions/transcripts, the accessibility of downloaded documents, physical devices and other browser engines remain separate review work. Panorama contrast depends on the image and needs visual review; YouTube frames remain externally hosted.

The keyboard patterns follow the W3C guidance for [tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), [disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/) and [form labels](https://www.w3.org/WAI/tutorials/forms/labels/). Reapply the local repairs with `python3 scripts/repair_responsive.py`; they are also included in the export workflow. No GitHub publishing is performed by these repair scripts.

The export helper requires Python 3, BeautifulSoup and lxml; it reads the public source and uses an untracked temporary cache:

```sh
python3 scripts/export_static.py --base-path /Bagwan2.0/
python3 scripts/verify_static.py
python3 scripts/verify_documents.py
```

The original theme, libraries and educational assets retain their existing attribution. Pannellum 2.5.6 is vendored with its upstream copyright/license notice; no third-party CDN is needed at runtime.

## Documents

- [Browse the migrated documents](documents/README.md).
- [Document manifest](documents/manifest.json): filenames, original Drive IDs and folder membership, local paths, MIME types, modification dates, byte sizes and SHA-256 checksums.
- [Original site links → local destinations](documents/source-link-map.json): every Drive iframe and document link found on the crawled live pages.

Imported on 18 November 2026:

| Item | Count |
| --- | ---: |
| Drive folders inventoried recursively | 11 |
| Unique source files copied | 76 |
| Drive shortcuts replaced with target-document copies | 3 |
| Native Google Docs exported as DOCX (included in the 76) | 2 |
| Office lock files archived (included in the 76) | 1 |
| Total file copies in this repository | 79 |
| Live pages crawled | 91 |
| Pages containing Drive links | 19 |
| Distinct original Drive URLs mapped | 28 |

The payload totals 18,438,433 bytes (17.6 MiB). The largest file is 3,062,208 bytes. These files use regular Git, so static hosting can serve the actual file bytes without resolving LFS pointers.

## Migration details

Original stored files retain their filenames and formats, including DOCX, DOC, PDF, PNG and Illustrator artwork. The two native Google Docs were exported as DOCX; their names end in `(Google Doc export).docx` to distinguish them from uploaded Word files. The language-services policy exists in both forms, and both are preserved.

The three Drive shortcuts were resolved through their public redirects and materialized as copies of the verified target documents in the corresponding local folders. The manifest records each shortcut's original ID and target ID.

One source file, `~$deo Transcript Template.docx`, is a 162-byte Office lock/owner file. It is preserved under [archive/google-drive-office-lock-files](archive/google-drive-office-lock-files/README.md) and excluded from the document browsing list.

Drive originals remain in place. Source download sizes were checked before import. The committed verifier checks every local payload's byte size and SHA-256 checksum, Office ZIP integrity, file signatures, shortcut targets and source-link coverage. Signed download URLs and authentication data are not included in the repository.

## Use in the static site

`documents/manifest.json` provides `files` and `folders` keyed by original Drive IDs. A folder's `file_ids` and `folder_ids` retain its source contents. File records provide a repository-relative `local_path` and a URL-encoded `local_href` for download links.

Read `documents/source-link-map.json` to replace the original Google Drive embeds and links. Folder targets identify directories and manifest entries; the static site must render their file lists. Build URLs relative to the site's base path so deployment under `/Bagwan2.0/` works.

## Verify

Requires Python 3; no third-party packages or Google credentials are needed:

```sh
python3 scripts/verify_documents.py
```
