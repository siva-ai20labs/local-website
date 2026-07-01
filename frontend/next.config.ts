import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Makes getCloudflareContext() (service bindings + env) work during `next dev`.
initOpenNextCloudflareForDev();
