import { readFileSync } from "node:fs";

const contractUrl = new URL("../attribution.yml", import.meta.url);

export const attributionContract = Object.freeze(
  JSON.parse(readFileSync(contractUrl, "utf8")),
);

function requireValue(condition, message) {
  if (!condition) throw new Error(`Attribution projection requirement: ${message}`);
}

requireValue(attributionContract.schema_version === "1", "schema_version must be 1");
requireValue(
  attributionContract.contract_role === "machine_readable_projection",
  "contract_role must remain machine_readable_projection",
);
requireValue(
  attributionContract.authority?.copyright_holders === "AUTHORS",
  "AUTHORS must remain the copyright-holder authority",
);
requireValue(
  attributionContract.authority?.license_terms === "LICENSE",
  "LICENSE must remain the license authority",
);
requireValue(
  attributionContract.authority?.citation_metadata === "CITATION.cff",
  "CITATION.cff must remain the citation surface",
);

export const artifactAuthor = attributionContract.identity.human_author;
export const publishingCompany = attributionContract.identity.publishing_company;
export const artifactLicense = attributionContract.license.url;
export const artifactSpdxId = attributionContract.license.spdx_id;
export const artifactAttribution = attributionContract.public_html.visible_notice;

const constructedNotice =
  `© ${attributionContract.copyright.start_year}–${attributionContract.copyright.through_year} ` +
  `${artifactAuthor} · ${publishingCompany} · ` +
  `Licensed under the Apache License, Version 2.0 (${artifactSpdxId}).`;

requireValue(artifactAuthor.length > 0, "human_author is required");
requireValue(publishingCompany.length > 0, "publishing_company is required");
requireValue(artifactSpdxId === "Apache-2.0", "license SPDX identifier must be Apache-2.0");
requireValue(
  artifactLicense === "https://www.apache.org/licenses/LICENSE-2.0",
  "license URL must use the official Apache-2.0 location",
);
requireValue(
  artifactAttribution === constructedNotice,
  "visible_notice must agree with its identity, copyright, and license fields",
);
requireValue(
  attributionContract.public_html.schema_pages_index === "schemas/index.html",
  "schema_pages_index must name the authored registry page",
);
