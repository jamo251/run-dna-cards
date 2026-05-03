/** Maximum GPX file size accepted in the browser uploader (bytes). */
export const MAX_GPX_FILE_BYTES = 12 * 1024 * 1024;

/** Rough ceiling for XML string length passed to `parseGpx` (matches file byte cap). */
export const MAX_GPX_XML_CHARS = MAX_GPX_FILE_BYTES;

/** Maximum trackpoints kept after parsing (uniform sample if exceeded). */
export const MAX_GPX_TRACKPOINTS = 100_000;
