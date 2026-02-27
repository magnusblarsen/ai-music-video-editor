import HomeClient from "./_components/home-client";
import { TestData } from "@/types";
import { fetchInternal } from "@/utils/server/api";


export default async function Home() {
	const data = await fetchInternal<TestData>("/api/health/db");
	const taskId = process.env.TASK_ID

	return (
		<HomeClient initialData={data} initialTaskId={taskId} />
	)
}
