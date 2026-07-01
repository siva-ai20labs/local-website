import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default OpenNext-on-Cloudflare config. Add an incremental cache override
// (e.g. r2IncrementalCache) here if/when ISR or the data cache is needed.
export default defineCloudflareConfig({});
