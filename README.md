# Bagwan2.0

Source document library for the static replica of [Bagwan Health](https://emedia.rmit.edu.au/bagwanhealth/scorm/intranet/).

The Google Drive migration is complete. The site replica itself has not been built yet.

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
