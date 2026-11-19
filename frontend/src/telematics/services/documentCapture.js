export const captureKindLabel = (kind) =>
  ({
    UNKNOWN: "Unidentified document",
    FUEL_SLIP: "Fuel slip",
    ODOMETER: "Odometer",
    REPAIR_INVOICE: "Repair invoice",
    OIL_BILL: "Oil bill",
    LOADING_PAPER: "Loading paper",
    UNLOADING_PAPER: "Unloading paper",
    POD: "Proof of delivery",
    WEIGH_IN: "Weighbridge slip",
    RC: "Registration certificate",
    PUC: "Pollution certificate",
    DRIVER_LICENSE: "Driving licence",
    PAN: "PAN",
    AADHAAR: "Aadhaar",
  })[kind] ||
  kind?.replaceAll("_", " ") ||
  "Document";

export function captureWarnings(review) {
  const labels = {
    OWNER_REVIEW_REQUIRED: "Awaiting owner review",
    OCR_UNAVAILABLE:
      "Automatic reading was unavailable. Review the original file.",
    UNKNOWN_KIND: "Document type could not be identified.",
    EXACT_DUPLICATE:
      "This exact photo was uploaded before. Both copies are retained.",
    BLURRY: "Photo may be blurry. Check the original or take a clearer photo.",
    QUALITY_UNAVAILABLE: "Image clarity could not be checked.",
    MISSING_FIELDS: "Some details could not be read.",
  };
  return [...new Set(review?.reasons || [])].map(
    (reason) => labels[reason] || "Check the original document.",
  );
}
