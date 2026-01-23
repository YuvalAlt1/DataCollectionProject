import asyncio
import os
import json
import pandas as pd
from playwright.async_api import async_playwright
import glob

CONFIG = {
    "endpoint": "wss://brd-customer-hl_80709a30-zone-scraping_browser19:07xgw0fri90j@brd.superproxy.io:9222",
    "urls": [
        "https://www.hostelworld.com/hostels/p/743/yellowsquare-rome/"
    ],
    "checkin": "2026-01-03",
    "checkout": "2026-01-04",
    "container_selector": ".review-card-container, .review-card, .review-item, [data-testid='review-card']",
    "output_dir": "./scraper_results",
    "state_file": "./scraper_state.json",
    "global_fields": {
        "title": "h1.mi-property-name, h1",
        "rating": ".mi-property-rating .score, .rating-score",
        "review_count": ".mi-property-rating .num-reviews, .reviews-count",
        "description": ".about-section .text, #about",
        "house_rules": ".house-rules-section"
    },
    "fields": {
        "rating": ".score",
        "review_text": ".review-card-text, .review-content, .text, [data-testid='review-text']",
        "stay_date": ".review-card-date, .date",
        "user_name": ".avatar-title, .user-name"
    }
}


async def scrape_data(page, url):
    try:
        print(f"Navigating to {url}...")
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)

        # --- EXTRACTION: GLOBAL ELEMENTS ---
        data = {}
        for field, selector in CONFIG.get("global_fields", {}).items():
            # Try/Except to prevent crashing if one metadata field is missing
            try:
                element = await page.query_selector(selector)
                data[field] = (await element.inner_text()).strip() if element else None
            except:
                data[field] = None

        print(f"Captured global fields: {data.get('title', 'Unknown')}")

        # --- HANDLING "VIEW ALL" / EXPAND REVIEWS ---
        # We try multiple selectors because the button text changes or might be an icon
        view_all_selectors = [
            "a:has-text('View all reviews')",  # English
            "a:has-text('Vedi tutte le recensioni')",  # Italian (common proxy default)
            "div[data-testid='reviews-list'] button",  # React UI generic
            ".reviews-list-footer a",  # Footer link style
            ".show-more-reviews"  # Old style
        ]

        button_clicked = False
        for selector in view_all_selectors:
            try:
                # Short timeout to check quickly
                link = await page.wait_for_selector(selector, timeout=3000)
                if link:
                    print(f"Clicking expand button: {selector}")
                    await link.click(force=True)
                    # Wait for the modal or expansion to render
                    await page.wait_for_timeout(3000)
                    button_clicked = True
                    break
            except:
                continue

        if not button_clicked:
            print("⚠️ No 'View All' button found/clicked. Scrolling to trigger lazy load...")

        # Scroll down just in case reviews are lazy-loaded on the main page
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)

        # --- EXTRACTION: REVIEWS ---
        items = await page.query_selector_all(CONFIG['container_selector'])
        print(f"Found {len(items)} potential review containers.")

        all_reviews = []
        for item in items:
            # specifically want the text of the review
            review_element = await item.query_selector(CONFIG['fields']['review_text'])
            if review_element:
                text = (await review_element.inner_text()).strip()
                if text:  # Ensure we don't save empty strings
                    all_reviews.append(text)

        # --- DEBUGGING: SCREENSHOT IF EMPTY ---
        if not all_reviews:
            print(f"⚠️ Zero reviews found for {url}. Taking screenshot for debug...")
            safe_filename = url.rstrip('/').split('/')[-1]
            debug_path = f"{CONFIG['output_dir']}/debug_{safe_filename}.png"
            await page.screenshot(path=debug_path)
            print(f"📸 Saved debug screenshot to {debug_path}")

        # Store the list of strings
        data["review_text"] = all_reviews

        # Return as a list containing ONE dictionary (one row)
        return [data]

    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return None


async def load_progress():
    """Reads the last successful index from the JSON state file."""
    if os.path.exists(CONFIG['state_file']):
        try:
            with open(CONFIG['state_file'], 'r') as f:
                return json.load(f).get("last_index", 0)
        except:
            return 0
    return 0


async def save_progress(index):
    """Saves the current index to the JSON state file."""
    with open(CONFIG['state_file'], 'w') as f:
        json.dump({"last_index": index}, f)


async def run_batch_scraper():
    # 1. Setup Folders
    if not os.path.exists(CONFIG['output_dir']):
        os.makedirs(CONFIG['output_dir'])

    url_source = "./scraper_results/rome_hostel_urls.json"
    if os.path.exists(url_source):
        with open(url_source, "r") as f:
            url_list = json.load(f)
        print(f"📂 Loaded {len(url_list)} URLs from {url_source}")
    else:
        print(f"⚠️  {url_source} not found. Using default URLs from CONFIG.")
        url_list = CONFIG['urls']

    if not url_list:
        print("❌ No URLs found to scrape. Exiting.")
        return

    start_index = await load_progress()
    current_batch_data = []
    BATCH_SIZE = 10
    count = 0
    sbr_connection = None

    print(f"Starting scraper at index {start_index}...")

    async with async_playwright() as p:
        try:
            for i in range(start_index, len(url_list)):
                url = url_list[i]
                print(f"--- Processing {i + 1}/{len(url_list)} ---")

                print(f"Connecting to Bright Data Scraping Browser...")
                sbr_connection = await p.chromium.connect_over_cdp(CONFIG['endpoint'])

                # UPDATED: Removed extra_http_headers to fix Protocol Error
                context = await sbr_connection.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    locale='en-US',  # This sets the browser language via JavaScript
                    timezone_id='Europe/Rome'
                )

                page = await context.new_page()

                reviews = await scrape_data(page, url)

                if reviews:
                    for review in reviews:
                        # Combine the review data with metadata
                        current_batch_data.append({
                            "original_url": url,
                            "scrape_timestamp": "2026-01-02",  # Current context date
                            **review
                        })
                else:
                    # Log empty results so we know it was checked
                    current_batch_data.append({"original_url": url, "status": "no_reviews_found"})
                    count =count+1

                # 2. Save Batch to csv
                if (i + 1 - start_index) % BATCH_SIZE == 0 or (i + 1) == len(url_list):
                    if current_batch_data:
                        batch_filename = f"{CONFIG['output_dir']}/batch_{i + 1}.csv"
                        pd.DataFrame(current_batch_data).to_csv(batch_filename, index=False)
                        print(f"✅ Saved {len(current_batch_data)} records to {batch_filename}")
                        current_batch_data = []  # Clear for next batch
                        await save_progress(i + 1)

                await sbr_connection.close()

        except Exception as e:
            print(f"❌ CRITICAL ERROR: {e}")
        finally:
            print(f"Didn't scrape {count} listings")
            # Use the new unique name with a strict None check
            if sbr_connection is not None:
                print("Closing Bright Data connection...")
                await sbr_connection.close()
            else:
                print("No connection to close.")

    # 3. MERGE ALL BATCHES INTO ONE FINAL CSV
    print("\n--- Merging all batches into final CSV ---")

    # Get all batch files
    all_batch_files = glob.glob(f"{CONFIG['output_dir']}/batch_*.csv")

    if all_batch_files:
        # Create a list of dataframes
        df_list = [pd.read_csv(file) for file in all_batch_files]

        # Concatenate them
        final_df = pd.concat(df_list, ignore_index=True)

        # Save to final location
        final_output_path = f"{CONFIG['output_dir']}/final_hostel_results.csv"
        final_df.to_csv(final_output_path, index=False)

        print(f"🎉 Success! Combined {len(all_batch_files)} batches into: {final_output_path}")
        print(f"Total records: {len(final_df)}")

        # Optional: Clean up batch files if you don't want to keep them
        # for file in all_batch_files:
        #     os.remove(file)
    else:
        print("❌ No batch files found to merge.")


if __name__ == "__main__":
    #asyncio.run(run_batch_scraper())
    all_batch_files = glob.glob(f"{CONFIG['output_dir']}/batch_*.csv")

    if all_batch_files:
        # Create a list of dataframes
        df_list = [pd.read_csv(file) for file in all_batch_files]

        # Concatenate them
        final_df = pd.concat(df_list, ignore_index=True)

        # Save to final location
        final_output_path = f"{CONFIG['output_dir']}/final_hostel_results.csv"
        final_df.to_csv(final_output_path, index=False)

        print(f"🎉 Success! Combined {len(all_batch_files)} batches into: {final_output_path}")
        print(f"Total records: {len(final_df)}")

        # Optional: Clean up batch files if you don't want to keep them
        # for file in all_batch_files:
        #     os.remove(file)
    else:
        print("❌ No batch files found to merge.")
