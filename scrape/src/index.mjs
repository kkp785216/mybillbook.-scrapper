import puppeteer from "puppeteer";
import fs from "fs";

const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
};

const timeout = 100000;

(async () => {
  const browser = await puppeteer.launch({ headless: false }); // Debugging mode
  const page = await browser.newPage();

  await page.goto(
    "https://mybillbook.in/store/skin_elixir?page_no=1&category=all",
    { waitUntil: "networkidle2" }
  );

  let hasNextPage = true;
  const scrapedData = [];

  while (hasNextPage) {
    console.log("Scraping products on current page...");

    await page.waitForSelector(".details", { timeout: timeout });

    let productHandles = await page.$$(".details"); // Fetch fresh handles

    console.log(`Found ${productHandles.length} products.`);

    await asyncForEach(productHandles, async (_, index) => {
      console.log(`Clicking product ${index + 1} of ${productHandles.length}`);

      // Re-fetch product handles in each iteration to avoid stale elements
      productHandles = await page.$$(".details");

      if (!productHandles[index]) {
        return;
      }
      await productHandles[index].click();

      await page.waitForSelector(".item-info", { timeout: timeout });

      const productData = await page.evaluate(() => {
        const title =
          document.querySelector(".item-info .name")?.innerText.trim() || "";
        const price =
          document.querySelector(".selling-price")?.innerText.trim() || "";
        const mrp = document.querySelector(".mrp")?.innerText.trim() || "";
        const images = Array.from(
          document.querySelectorAll(".carousel-image img")
        ).map((img) => img.src);
        const description = document.querySelector(".description")?.innerHTML;
        const measuringUnit = document.querySelector(".unit")?.innerText.trim();

        return { title, price, images, mrp, description, measuringUnit };
      });

      console.log("Scraped:", productData);
      scrapedData.push(productData);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      // await page.goBack({ waitUntil: "networkidle2" });
      await page.goBack();
      // wait for 5 sec here
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await page.waitForSelector(".details", { timeout: timeout });
    });

    // Check if the "Next" button exists and click it properly
    let currentPage = 1;
    const nextButton = await page.$(".pagination-next");
    const isDisabled = await page.$(".pagination-next.disabled");
    if (nextButton && !isDisabled) {
      console.log("Going to next page..." + `Page ${currentPage++}`);
      await Promise.all([
        nextButton.click(), // Click
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: timeout }), // Ensure next page load
      ]);
    } else {
      console.log("No more pages. Scraping completed.");
      hasNextPage = false;
    }
  }

  console.log("Final Scraped Data:", scrapedData);
  fs.writeFileSync("scrapedData.json", JSON.stringify(scrapedData));

  await browser.close();
})();
