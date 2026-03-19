import type { IVendor, IRFQ } from "../types";

/**
 * Builds a TinyFish goal string from RFQ specs and vendor info.
 * The goal is explicit, numbered, and ends with a structured JSON output spec.
 */
export function buildGoal(vendor: IVendor, rfq: IRFQ): string {
  const { specs, contactInfo } = rfq;

  const customFieldLines = Object.entries(specs.customFields ?? {})
    .map(([k, v]) => `- ${k}: "${v}"`)
    .join("\n");

  return `
Navigate to the page. Look for a quote request form, contact form, or "Get a Quote" / "Request Pricing" / "Get Pricing" button. If you see a button leading to a quote form, click it first.

Fill in the form with the following information:
- Company Name: "${contactInfo.companyName}"
- Contact Name: "${contactInfo.contactName}"
- Email: "${contactInfo.email}"
${contactInfo.phone ? `- Phone: "${contactInfo.phone}"` : ""}
- Product/Item: "${specs.productType}"
- Quantity: "${specs.quantity}"
${specs.dimensions ? `- Dimensions/Size: "${specs.dimensions}"` : ""}
${specs.material ? `- Material: "${specs.material}"` : ""}
${specs.color ? `- Color/Print: "${specs.color}"` : ""}
${customFieldLines}

If the form has a message, notes, or description field, enter the following professional message:
"We are requesting a quote for ${specs.quantity} units of ${specs.productType}${specs.dimensions ? ` (${specs.dimensions})` : ""}${specs.material ? `, ${specs.material}` : ""}${specs.color ? `, ${specs.color}` : ""}. Please provide your best pricing, lead time, minimum order quantity, and shipping cost to [your zip code]. Thank you."

${vendor.formInstructions ? `Additional vendor-specific instructions:\n${vendor.formInstructions}\n` : ""}

After filling all available fields, click the Submit / Send / Request Quote / Get a Quote button.

Then extract any visible information from the confirmation page, results page, or any pricing shown. Look for:
- Price or pricing estimate
- Lead time or delivery estimate
- Minimum order quantity
- Shipping cost or shipping policy
- Confirmation number or reference ID
- Any other relevant pricing or terms

Return the result as JSON with exactly these fields:
{
  "submitted": true or false,
  "price": number or null,
  "currency": "USD" or other currency code or null,
  "unitPrice": number or null,
  "leadTime": "string description of lead time" or null,
  "minimumOrder": number or null,
  "shippingCost": number or null,
  "confirmationId": "string" or null,
  "notes": "any other extracted information, errors encountered, or explanation if form was not submitted"
}
`.trim();
}

/**
 * Builds a lightweight test goal for verifying agent connectivity.
 */
export function buildTestGoal(vendorUrl: string): string {
  return `
Navigate to ${vendorUrl}.
Look at the page and describe what you see.
Find any "Get a Quote", "Request Quote", "Contact Us", or pricing-related links or forms.
Return as JSON:
{
  "pageTitle": "the page title",
  "hasQuoteForm": true or false,
  "quoteFormUrl": "URL of quote form if different from starting page" or null,
  "formFields": ["list of form field labels you can see"],
  "notes": "any other observations"
}
`.trim();
}
