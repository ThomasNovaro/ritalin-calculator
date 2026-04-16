import { Suspense } from "react";
import AppClient from "./AppClient";

type Level = "Charmander" | "Charmeleon" | "Charizard";

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const urlLevel = (searchParams?.level as Level) || "Charmander";
  const urlTime = (searchParams?.time as string) || "";

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F4F4F0] dark:bg-[#0A0A0A]" />}>
      <AppClient initialLevel={urlLevel} initialTime={urlTime} />
    </Suspense>
  );
}
