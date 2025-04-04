import fs from "fs";

const outputDir = "output";

function convertArrayToCSV(arr) {
  // Escape CSV value by wrapping it in double quotes if it contains commas, quotes, or newlines
  const escapeCSVValue = (value) => {
    if (typeof value === "string") {
      // Escape double quotes by doubling them
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Extract keys from the first object (assuming all objects have the same keys)
  const headers = Object.keys(arr[0]);

  // Create CSV rows
  const csvRows = [];

  // Add the header row with keys (handling spaces by keeping them as they are)
  csvRows.push(headers.map(escapeCSVValue).join(","));

  // Add each row of values
  arr.forEach((obj) => {
    const row = headers.map((header) => escapeCSVValue(obj[header]));
    csvRows.push(row.join(","));
  });

  // Create a CSV string
  const csvString = csvRows.join("\n");

  return csvString;
}

const data = JSON.parse(fs.readFileSync("scrapedData.json", "utf8"));
const categories = JSON.parse(fs.readFileSync("scrapedTitles.json", "utf8"));

const titleCategoryMap = {};
data.forEach((product) => {
  const tempCategories = [];
  categories.forEach((category) => {
    if (category.products.includes(product.title)) {
      tempCategories.push(category.category);
    }
  });
  titleCategoryMap[product.title] = tempCategories;
});

const maxAvailableCategoryPerRow = data.reduce(
  (max, { title }) => Math.max(max, titleCategoryMap[title].length),
  0
);

const maxAvailableImagesPerRow = data.reduce(
  (max, { images }) => Math.max(max, images.length),
  0
);

const finalProducts = [];

data.forEach((product) => {
  finalProducts.push({
    Name: product.title,
    Description: product.description,
    "Sale PRice": product.price
      .replace("₹", "")
      .replaceAll(",", "")
      .replaceAll(" ", ""),
    MRP: product.mrp.replace("₹", "").replaceAll(",", "").replaceAll(" ", ""),
    "Measuring Unit": product.measuringUnit,
    ...(() => {
      const categoryObject = {};

      new Array(maxAvailableCategoryPerRow)
        .fill(undefined)
        .forEach((_, position) => {
          categoryObject[`Category${position + 1}`] = "";
          categoryObject[`Sub Category${position + 1}`] = "";
        });

      titleCategoryMap[product.title].forEach((item, index) => {
        if (item) {
          categoryObject[`Category${index + 1}`] = item;
          categoryObject[`Sub Category${index + 1}`] = "";
        }
      });
      return categoryObject;
    })(),

    ...(() => {
      const imagesObject = {};

      new Array(maxAvailableImagesPerRow)
        .fill(undefined)
        .forEach((_, position) => {
          imagesObject[`Image${position + 1}`] = "";
        });

      product.images.forEach((item, index) => {
        if (item) {
          imagesObject[`Image${index + 1}`] = item;
        }
      });
      return imagesObject;
    })(),
  });
});

// Step Next: Convert the final JSON into batch of 250 products and export into output-csv folder with name as final-1.csv, final-2.csv, final-3.csv, etc.
const batchSize = 250;
const batchedData = [];
for (let i = 0; i < finalProducts.length; i += batchSize) {
  batchedData.push(finalProducts.slice(i, i + batchSize));
}
batchedData.forEach((batch, index) => {
  const finalCsv = convertArrayToCSV(batch);
  fs.writeFile(
    `output-csv/final-${index + 1}.csv`,
    finalCsv,
    { encoding: "utf-8" },
    (err) => {
      if (err) {
        console.error(`Error writing final CSV file ${index + 1}:`, err);
        return;
      }
      console.log(`Final CSV file ${index + 1} written successfully!`);
    }
  );
});
