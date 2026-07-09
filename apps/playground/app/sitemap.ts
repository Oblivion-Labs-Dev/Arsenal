import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://arsenal.oblivionlabs.dev", lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
