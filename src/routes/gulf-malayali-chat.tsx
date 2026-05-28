import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gulf-malayali-chat")({
  head: () =>
    seo({
      title: "Gulf Malayali Chat | UAE Malayalam Friends & Voice Chat",
      description:
        "Connect with UAE and Gulf Malayalis on Vibemalayali Chat through existing Friends and Romance rooms for Malayalam friendship and voice conversations.",
      path: "/gulf-malayali-chat",
      ogTitle: "Gulf Malayali Chat | Vibemalayali Chat",
      ogDescription:
        "A Malayalam community chat path for UAE and Gulf Malayalis looking for friendship, voice notes, and familiar online rooms.",
    }),
  component: GulfMalayaliChatPage,
});

function GulfMalayaliChatPage() {
  return <SeoLandingPage slug="gulf-malayali-chat" />;
}
