import { createFileRoute } from "@tanstack/react-router";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/malayalam-chat-room")({
  head: () =>
    seo({
      title: "Malayalam Chat Room | Friends, Romance & Voice Chat",
      description:
        "Join Vibemalayali's Malayalam chat room pages for friendship, UAE and Gulf Malayali community conversations, voice notes, and respectful room choices.",
      path: "/malayalam-chat-room",
      ogTitle: "Malayalam Chat Room | Vibemalayali Chat",
      ogDescription:
        "Find Malayalam community chat, friendship, Gulf Malayali users, and voice chat through the existing Friends Room and Romance Room.",
    }),
  component: MalayalamChatRoomPage,
});

function MalayalamChatRoomPage() {
  return <SeoLandingPage slug="malayalam-chat-room" />;
}
