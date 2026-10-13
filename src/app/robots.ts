import type { MetadataRoute } from "next";
import { siteUrl } from "@/infrastructure/config/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: "GPTBot", disallow: "/" },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
