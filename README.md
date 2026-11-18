# Bagwan2.0

Static HTML replica of the Bagwan Health learning intranet, hosted entirely by GitHub Pages.

**Start here: [Bagwan Health staff intranet](https://cove-lx-team.github.io/Bagwan2.0/).**

The root [`index.html`](index.html) is the intranet homepage. The original route is also available at [`scorm/intranet/index.html`](scorm/intranet/index.html).

## Static site

- The public intranet pages, departments, news, policies, organisation charts and patient-management screens have been exported to HTML.
- Images, styles, scripts, fonts, H5P activity data and 360° panoramas are served from this repository. The 12 original YouTube embeds are preserved; YouTube hosts playback and video files. [Browse the videos](videos/index.html).
- Google Drive embeds are replaced with local document lists and download links. The complete migrated files remain in `documents/`.
- The virtual tour uses the original panoramas and hotspot text with a self-hosted Pannellum viewer, room navigation and keyboard-accessible information controls.
- Patient forms and the replacement training incident report support browser-local drafts, draft downloads and printing to PDF. GitHub Pages does not receive form submissions.
- `.nojekyll` serves the committed HTML and assets directly; WordPress and a build server are not required.

`static-export.json` records the 90 source URLs, local destinations, copied asset hashes and assets already unavailable at the source. `content-review.json` records repaired content/navigation gaps and unresolved source omissions. The original counselling panorama and an evacuation-plan image are unavailable; the tour avoids requesting those missing files.

The review repairs the Departments index, staff directory using published organisation-chart names and roles, doctor profile dialogs, document headings, breadcrumbs, community links, interpreting scenario targets and patient-system navigation. Wide policy/form tables scroll within the page, and patient-system headers and draft controls fit phone screens. Patient-form PDF controls now use browser printing, including partially completed forms. Clinical document files and the original review documents remain unchanged.

The Next page / Previous page footer navigation has been removed from news articles. Interpreting scenario controls remain available within the activity.

The hospital organisation charts use responsive grids that preserve every published name, role and destination. Both chart routes fit phone, tablet and desktop widths. All seven patient-management dashboard cards have full-card links to the corresponding form or staff resource.

Remaining content gaps require source material: the HR/ATSI video galleries supplied only broken plugin IDs and are skipped for now after public-site/API/archive recovery checks found no URLs; nursing and ATSI staff lists were absent; medication-safety and nursing-handover policy pages contained no documents. Those pages identify the gap and link to available resources. Clinical accuracy and outdated references in original materials need content-owner review.

The largest copied site asset is `VR/public/static_assets/360_images/dentalroom_Panorama.jpg` (5,400,055 bytes). No LFS pointers are used by the published site.

## Preview and regenerate

The committed site uses `/Bagwan2.0/` as its base path. From the parent of the `Bagwan2.0` checkout, run:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/Bagwan2.0/`.

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
