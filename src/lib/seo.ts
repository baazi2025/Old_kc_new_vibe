export const SITE_URL = "https://vibemalayali.com";
export const OG_IMAGE = `${SITE_URL}/og-vibemalayali.svg`;

type SeoInput = {
  title: string;
  description: string;
  path?: string;
  ogTitle?: string;
  ogDescription?: string;
};

export function seo({
  title,
  description,
  path = "/",
  ogTitle = "Vibemalayali Chat | Malayali Community Platform",
  ogDescription = "Chat with Malayalis worldwide, join live rooms, listen to radio, share voice notes, and enjoy a nostalgic KC-style community experience.",
}: SeoInput) {
  const canonical = `${SITE_URL}${path}`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: ogDescription },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:site_name", content: "Vibemalayali Chat" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Vibemalayali Chat | Malayali Community Platform" },
      {
        name: "twitter:description",
        content:
          "Chat rooms, radio, voice notes, moods, friendships, and nostalgic Malayali community vibes worldwide.",
      },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [
      { rel: "canonical", href: canonical },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
    ],
  };
}
