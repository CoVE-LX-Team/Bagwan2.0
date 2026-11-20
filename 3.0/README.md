# Bagwan 3.0 review preview

Parallel staff-intranet redesign at `/Bagwan2.0/3.0/`. The existing 2.0 homepage remains at `/Bagwan2.0/`.

The intranet provides task-based navigation, cross-content search, filtered people/policy/document lists, browser-local saved shortcuts, video resources and a view for every migrated source route. Existing patient forms, the branching interpreting scenario and Pannellum tour retain their working behaviour within the new interface.

The document library at `#documents` supports combined search, category and file-type filters, sortable columns, local previews and original downloads. “Last updated” comes from the archived Drive file's modification time, displayed in Melbourne time. Shortcut copies use their target file's date. Word and Illustrator files have PDF renditions. Phones display the first page and offer the full PDF. When source files change, run `python3 scripts/build_document_previews.py` before rebuilding the snapshot. The normal site build only reads the committed renditions.

The Policies & procedures list and individual policy pages offer preview and download actions. Fifteen policies link to their matched original Word files. The three web-only drafts download as tagged PDFs with their review status, references and a link to the register. When draft text or review status changes, run `python3 scripts/build_v3.py` followed by `python3 scripts/build_policy_copies.py` to refresh these copies.

The People directory and charts use [the recovered position records](../data/staff-hierarchy.json). The [source and review notes](../data/staff-hierarchy-review.md) explain missing managers, unnamed positions and conflicting records. The review register also lists decisions for the SME and Senior Learning Designer.

The teaching context lives separately in `learning-guide.html`. `practice.html` and `practice.js` replace the three H5P activities with native HTML exercises. Intranet values are readable reference content, without flip cards.

`content-drafts.json` records new and adapted content, sources, reasons and review requirements. All ten entries are pending SME and SLD review. No approval, clinical currency, curriculum mapping or competency outcome is implied.

## Build and preview

From the repository root, with Python 3 and BeautifulSoup installed:

```sh
python3 scripts/build_v3.py
```

From the parent of the repository:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/Bagwan2.0/3.0/`.

The interface uses committed static files with relative paths and hash-based navigation, so no framework build or server rewrite is needed on GitHub Pages. Forms and saved items use browser storage; no central user account, clinical submission endpoint or LMS tracking has been added. Third-party video playback and the NAATI directory depend on their providers.

The review documents are `critical-review.html`, `review-register.html` and `what-changed.html`.
