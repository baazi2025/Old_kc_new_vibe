import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/anonymous-malayalam-chat")({
  head: () =>
    seo({
      title: "Anonymous Malayalam Chat | Malayali Friends & Voice Notes",
      description:
        "Discover guest-friendly anonymous Malayalam chat on Vibemalayali with Gulf Malayali community, friendship, voice notes, and existing room choices.",
      path: "/anonymous-malayalam-chat",
      ogTitle: "Anonymous Malayalam Chat | Vibemalayali Chat",
      ogDescription:
        "Use Vibemalayali's existing Friends Room and Romance Room for Malayalam community conversations, friendship, and voice notes.",
    }),
  component: AnonymousMalayalamChatPage,
});

function AnonymousMalayalamChatPage() {
  return <SeoLandingPage slug="anonymous-malayalam-chat" />;
}
