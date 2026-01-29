# DataCollectionProject

Final project — Data Collection course

This repository demonstrates an end-to-end data collection pipeline for accommodation listings in Rome. It covers (1) extracting listing URLs from a search/results site, (2) scraping reviews & metadata using a headless browser through Bright Data, (3) merging scraped results with large platform datasets (Airbnb / Booking) inside a Spark/Databricks notebook and (4) exporting a CSV used by a small local UI in `rome_hotels_ui` for visualization and exploration.

***Important***

1. The following pipeline requires API keys/usernames to be provided to it as the used values were removed for security reasons.
2. The pipeline produces results saved already in csv files in the Azure Blob Storage under the submissions container in the directory of Ariel_Yuval_Reut, so running the pipeline again is not required for the interface to work.

Overview / pipeline
- Step 1 — URL extraction: run `url_extractor.py` to collect listing page URLs (HostelWorld in this repo).
- Step 2 — Scraping: feed the extracted URLs to `Scraper.py`. The scraper connects to Bright Data via Chrome DevTools Protocol, navigates individual listing pages and extracts review text and metadata; it saves batches into `./scraper_results/`.
- Step 3 — Processing & merging: open and run the Databricks notebook `Project_207583204_318738127_206941908.ipynb`. The notebook loads large parquet datasets (Airbnb / Booking) via Azure ABFS with SAS tokens, loads the scraped CSV(s), normalizes and merges sources, runs QA and exports a final CSV for the UI.
- Step 4 — UI: convert the exported CSV to `rome_hotels_ui/data.js` (or use provided `data.js`) and serve the `rome_hotels_ui` folder to preview the interface.

Important repository files
- url_extractor.py — Crawls search/result pages (HostelWorld listing pages) and writes a JSON list of listing URLs to `./scraper_results/rome_hostel_urls.json`. ***Update `URL_CONFIG` (endpoint, search_urls) before use.***
- Scraper.py — Asynchronous Playwright-based scraper that:
  - uses Bright Data endpoint via CDP (WebSocket),
  - navigates to each listing URL,
  - expands reviews when possible and extracts review text + per-listing metadata,
  - saves data in batches under `./scraper_results/` and merges batches into `final_hostel_results.csv`.
  - ***Update `CONFIG` before use***.
- Project_207583204_318738127_206941908.ipynb — Databricks / PySpark notebook that:
  - configures Azure storage and SAS tokens,
  - loads Airbnb and Booking parquet sources,
  - filters to Rome listings,
  - normalizes and unions the platform datasets,
  - ingests scraped hostel CSVs and merges/exports the final CSV for the UI.
- rome_hotels_ui/
  - index.html, style.css, script.js — small static interface (Booking-like listing UI).
  - data.js — contains a CSV string constant used by the UI (example data is committed in this repo). The repo also includes `gen_data.ps1` to automate creating `data.js` from the CSV exported by the notebook.
  - gen_data.ps1 — PowerShell helper to escape a CSV into a JS `const CSV_DATA = `...`;` file used by the UI.
- Scraper / url_extractor config areas contain placeholders (Bright Data endpoint, dates, selectors) — these must be edited before running.

Prerequisites (recommended)
- Python 3.8+
- pip
- Playwright:
  - pip install playwright
  - python -m playwright install
- Other Python packages:
  - pandas
  - asyncio (builtin), glob, json, os (builtin)
  - Example install:
    - pip install pandas requests playwright
- Databricks / Spark environment to run the notebook (the notebook assumes Spark / Databricks runtime and uses ABFS URIs).
- Bright Data (or equivalent) scraping browser endpoint / credentials — a WebSocket CDP endpoint is used by the scripts. You must supply your own endpoint / credentials.
- (Windows) PowerShell to run `gen_data.ps1` or use the provided Python conversion command below.

Quickstart — extract -> scrape -> process -> serve

1) Prepare environment
- Create a virtual environment and install dependencies:
  - python -m venv venv
  - source venv/bin/activate  # or `venv\Scripts\activate` on Windows
  - pip install pandas playwright
  - python -m playwright install

2) Extract listing URLs (url_extractor)
- Edit `url_extractor.py`:
  - Set `URL_CONFIG["endpoint"]` to your Bright Data/Chromium CDP endpoint (or other CDP endpoint).
  - Adjust `search_urls` if you want additional pages.
- Run:
  - python url_extractor.py
- Output:
  - `./scraper_results/rome_hostel_urls.json` — JSON array of listing URLs.

3) Scrape listings (Scraper.py)
- Edit `Scraper.py` CONFIG at top:
  - Set `CONFIG["endpoint"]` to your Bright Data CDP endpoint (or local chrome if running locally).
  - Optionally adjust `checkin`/`checkout`, selectors, and `output_dir`.
- Run (recommended to call the async entrypoint):
  - Example one-liner:
    - python -c "import asyncio, Scraper; asyncio.run(Scraper.run_batch_scraper())"
  - Or edit the `if __name__ == '__main__':` block to call `asyncio.run(run_batch_scraper())` and run `python Scraper.py`
- Output:
  - Batch CSVs: `./scraper_results/batch_*.csv`
  - Final merged CSV: `./scraper_results/final_hostel_results.csv`

Notes:
- The script uses Playwright's connect_over_cdp to connect to Bright Data's managed browser. If you want to run Playwright locally use `async_playwright().start()` and `chromium.launch()` instead.
- If you see Protocol errors, try removing extra headers or using a different connection method. The code already has comments about that.

4) Run the Databricks notebook (merge, QA, export)
- Open `Project_207583204_318738127_206941908.ipynb` in a Databricks workspace (or a local Jupyter that has a Spark session configured).
- Edit the top cells:
  - Set `booking_sas_token`, `airbnb_sas_token`.
  - Update `HOSTEL_CSV_PATH` to point to where you uploaded `final_hostel_results.csv` in DBFS (example in notebook: `dbfs:/FileStore/tables/final_hostel_results_filtered.csv`).
- Edit `GROQ_API_KEY` in cell 17.
- Run cells top-to-bottom. The notebook:
  - loads and standardizes Airbnb / Booking data (parquet via ABFS),
  - loads scraped hostel CSV data,
  - aligns schema and unions datasets,
  - exports a final CSV to DBFS
- Download the exported CSV from Databricks to your local machine.

5) Prepare data for the UI
- Convert the exported CSV to a JS string constant used by the UI. You can:
  - Use provided PowerShell helper (Windows):
    - Edit `gen_data.ps1` and set `$src` to your downloaded CSV path and `$dst` to `rome_hotels_ui/data.js` then run:
      - powershell -ExecutionPolicy Bypass -File rome_hotels_ui\gen_data.ps1
  - Or use Python:
    - Example:
    - python - <<PY
      data = open('rome_all.csv', 'r', encoding='utf-8').read()
      out = "const CSV_DATA = `"+data.replace('`','\\`')+"`;"
      open('rome_hotels_ui/data.js','w',encoding='utf-8').write(out)
      PY
- Confirm `rome_hotels_ui/data.js` is created and contains `const CSV_DATA = `<your csv>`;`

6) Serve the UI locally
- Serve the static UI directory and open it in a browser:
  - cd rome_hotels_ui
  - python -m http.server 8000
  - Open http://localhost:8000 in your browser
- The UI (`index.html`, `script.js`, `style.css`) reads `data.js`, parses CSV via PapaParse (CDN included) and renders hotel cards.

License & contact
- This repo currently contains course work; add a LICENSE file if you want to publish reuse permissions (e.g. MIT).
- Maintainer: YuvalAlt1 — open an issue or PR in this repository for questions.
