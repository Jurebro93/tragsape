import type { Metadata } from "next";
import { HubPage } from "@/components/content/hub-page";
import { hubPath } from "@/lib/content/hubs";
import { content } from "@/messages/hr/content";
import { listPublishedArticles } from "@/server/content/articles";

const page = content.guide.hubs.pages["zdravlje-macaka"];

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.description,
  alternates: { canonical: hubPath("zdravlje-macaka") },
};

export default async function Page() {
  const articles = await listPublishedArticles();
  return <HubPage hub="zdravlje-macaka" articles={articles} />;
}
