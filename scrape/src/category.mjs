import puppeteer from "puppeteer";
import fs from "fs";

const timeout = 100000;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(
    "https://mybillbook.in/store/skin_elixir?page_no=1&category=all",
    { waitUntil: "networkidle2" }
  );

  await page.waitForSelector(".category-tab", { timeout });

  // Get all category elements
  const categoryHandles = await page.$$(".category-tab");

  console.log(`Found ${categoryHandles.length} categories.`);

  let allProducts = [];

  for (let i = 0; i < categoryHandles.length; i++) {
    console.log(`Clicking category ${i + 1} of ${categoryHandles.length}`);

    // Click the category
    await categoryHandles[i].click();

    // Wait for a short delay (no full page reload)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    let hasNextPage = true;
    let categoryName = await page.evaluate(
      (el) => el.innerText.trim(),
      categoryHandles[i]
    );
    let categoryProducts = [];

    while (hasNextPage) {
      console.log(`Scraping category: ${categoryName}`);

      await page.waitForSelector(".details", { timeout });
      const productTitles = await page.evaluate(() => {
        return Array.from(document.querySelectorAll(".details .name")).map(
          (el) => el.innerText.trim()
        );
      });

      console.log(`Products in ${categoryName}:`, productTitles);
      categoryProducts.push(...productTitles);

      // Check if next page exists
      const nextButton = await page.$(".pagination-next");
      const isDisabled = await page.$(".pagination-next.disabled");
      if (nextButton && !isDisabled) {
        console.log("Going to next page...");
        await Promise.all([
          nextButton.click(),
          new Promise((resolve) => setTimeout(resolve, 3000)), // Short delay instead of full navigation
        ]);
      } else {
        hasNextPage = false;
      }
    }

    allProducts.push({ category: categoryName, products: categoryProducts });
  }

  console.log("Final Scraped Data:", allProducts);
  fs.writeFileSync("scrapedTitles.json", JSON.stringify(allProducts, null, 2));

  await browser.close();
})();
