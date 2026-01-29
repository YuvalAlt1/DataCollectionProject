import asyncio
import json
import os
from playwright.async_api import async_playwright

# --- CONFIGURATION ---
# Update URL_CONFIG before running the code
URL_CONFIG = {
    "endpoint": "wss://USERNAME:PASSWORD.superproxy.io:9222",
    "search_urls": ["https://www.hostelworld.com/hostels/europe/italy/rome/",
                    "https://www.hostelworld.com/hostels/europe/italy/rome/p/2/",
                    "https://www.hostelworld.com/hostels/europe/italy/rome/p/3/",
                    "https://www.hostelworld.com/hostels/europe/italy/rome/p/4/"],
    "output_file": "./scraper_results/rome_hostel_urls.json",
    # Based on the HTML you provided:
    "container_selector": "a.property-card-container",
    "name_selector": ".property-name span"
}


async def scroll_to_bottom(page):
    """Scrolls slowly to trigger lazy loading of all property cards."""
    print("Scrolling to load all listings...")
    last_height = await page.evaluate("document.body.scrollHeight")
    while True:
        await page.mouse.wheel(0, 1500)
        await page.wait_for_timeout(1500)
        new_height = await page.evaluate("document.body.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height


async def extract_urls():
    if not os.path.exists("./scraper_results"):
        os.makedirs("./scraper_results")

    async with async_playwright() as p:
        print("Connecting to Bright Data...")
        browser = await p.chromium.connect_over_cdp(URL_CONFIG["endpoint"])
        context = await browser.new_context()
        page = await context.new_page()

        try:
            for search_url in URL_CONFIG["search_urls"]:
                print(f"Opening search page: {search_url}")
                await page.goto(search_url, wait_until="domcontentloaded", timeout=60000)

                # Wait for the property cards to load
                await page.wait_for_selector(URL_CONFIG['container_selector'], timeout=15000)

                # Scroll to reveal all hidden cards
                await scroll_to_bottom(page)

                # Find all listing containers
                cards = await page.query_selector_all(URL_CONFIG['container_selector'])

                unique_urls = []
                seen_hrefs = set()

                for card in cards:
                    href = await card.get_attribute("href")
                    # Get the name just for the console log so you can see progress
                    name_el = await card.query_selector(URL_CONFIG['name_selector'])
                    name = await name_el.inner_text() if name_el else "Unknown Property"

                    if href and href not in seen_hrefs:
                        full_url = href if href.startswith("http") else f"https://www.hostelworld.com{href}"
                        unique_urls.append(full_url)
                        seen_hrefs.add(href)
                        print(f"Found: {name} -> {full_url}")

            # Save to JSON
            with open(URL_CONFIG['output_file'], 'w') as f:
                json.dump(unique_urls, f, indent=4)

            print(f"\n✅ Success! Extracted {len(unique_urls)} property URLs to {URL_CONFIG['output_file']}")

        except Exception as e:
            print(f"❌ Error during extraction: {e}")
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(extract_urls())