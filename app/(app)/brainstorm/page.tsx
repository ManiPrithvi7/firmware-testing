import { ThreadList } from "@/features/brainstorm";

export default async function BrainstormPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { issue } = await searchParams;
    const raw = Array.isArray(issue) ? issue[0] : issue;
    const issueId = raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : null;
    return <ThreadList issueId={issueId} />;
}
