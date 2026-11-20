# Bagwan 3.0 review preview

Parallel staff-intranet redesign at `/Bagwan2.0/3.0/`. The existing 2.0 homepage remains at `/Bagwan2.0/`.

The intranet provides task-based navigation, cross-content search, filtered people/policy/document lists, browser-local saved shortcuts, video resources and a view for every migrated source route. Existing patient forms, the branching interpreting scenario and Pannellum tour retain their working behaviour within the new interface.

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
