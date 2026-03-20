/**
 * Seed script — populates the vendors collection with demo vendors.
 * Run: cd server && npx tsx src/scripts/seed-vendors.ts
 *
 * Only inserts vendors that don't already exist (by name).
 */

import "../config/env";
import { connectDB, closeDB } from "../config/db";
import { Vendor } from "../models/Vendor.model";

const VENDORS = [
  {
    name: "Packlane",
    website: "https://packlane.com",
    quoteUrl: "https://packlane.com",
    category: "packaging",
    browserProfile: "lite" as const,
    formInstructions:
      "Packlane has an interactive product configurator. Look for 'Get Started' or 'Design Your Box'. Use the online quote tool — enter the box style, dimensions, quantity. Extract the displayed price per unit.",
  },
  {
    name: "The Custom Boxes",
    website: "https://thecustomboxes.com",
    quoteUrl: "https://thecustomboxes.com/custom-boxes",
    category: "packaging",
    browserProfile: "lite" as const,
    formInstructions:
      "Look for 'Get a Custom Quote' or a quote request form. Fill in box type, dimensions, quantity, printing options, and contact info.",
  },
  {
    name: "UPrinting",
    website: "https://www.uprinting.com",
    quoteUrl: "https://www.uprinting.com/custom-quote.html",
    category: "printing",
    browserProfile: "lite" as const,
    formInstructions:
      "Navigate to the Custom Quote page. Fill in product type, specifications, quantity, and contact information in the form.",
  },
  {
    name: "Packaging Supplies",
    website: "https://www.packagingsupplies.com",
    quoteUrl: "https://www.packagingsupplies.com/contact-us",
    category: "packaging",
    browserProfile: "lite" as const,
    formInstructions:
      "Find the contact or quote request form. Describe the product specifications in the message field.",
  },
  {
    name: "VistaPrint",
    website: "https://www.vistaprint.com",
    quoteUrl: "https://www.vistaprint.com/business-cards-and-more/bulk-order",
    category: "printing",
    browserProfile: "stealth" as const,
    formInstructions:
      "Look for bulk order or corporate pricing options. VistaPrint may have a 'Get a Quote' link for large orders. Try navigating to their Business Solutions section.",
  },
  {
    name: "Global Industrial",
    website: "https://www.globalindustrial.com",
    quoteUrl: "https://www.globalindustrial.com/c/material-handling/boxes-packaging",
    category: "industrial",
    browserProfile: "lite" as const,
    formInstructions:
      "Search for the product type. Look for a 'Request a Quote' or 'Contact Us' link. Fill in the quantity and specifications.",
  },
];

async function seed() {
  await connectDB();

  let inserted = 0;
  let skipped = 0;

  for (const vendor of VENDORS) {
    const existing = await Vendor.findOne({ name: vendor.name });
    if (existing) {
      console.log(`  SKIP  ${vendor.name} (already exists)`);
      skipped++;
      continue;
    }

    await Vendor.create(vendor);
    console.log(`  OK    ${vendor.name}`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await closeDB();
}

console.log("\nSeeding vendors...\n");
seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
