import HomeClient from "./_components/home-client";
import { TestData } from "@/types";
import { fetchInternal } from "@/utils/server/api";


export default async function Home() {
  const data = await fetchInternal<TestData>("/test");
  const audioId = process.env.AUDIO_ID

  return (
    <HomeClient initialData={data} initialAudioId={audioId} />
  )
}
