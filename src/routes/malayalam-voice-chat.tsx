import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/malayalam-voice-chat")({
  head: () =>
    seo({
      title: "Malayalam Voice Chat | Friends Room & Gulf Malayali Chat",
      description:
        "Join Vibemalayali for Malayalam voice chat moments, UAE and Gulf Malayali community talks, friendship, and the existing Friends and Romance rooms.",
      path: "/malayalam-voice-chat",
      ogTitle: "Malayalam Voice Chat | Vibemalayali Chat",
      ogDescription:
        "Find Malayalam voice chat, Gulf Malayali friendship, and community rooms through Vibemalayali's existing chat experience.",
    }),
  component: MalayalamVoiceChatPage,
});

function MalayalamVoiceChatPage() {
  return <SeoLandingPage slug="malayalam-voice-chat" />;
}
