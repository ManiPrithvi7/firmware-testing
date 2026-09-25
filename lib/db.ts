import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { isTag } from "@/lib/constants";
import { proofViewUrl } from "@/lib/storage";

export type TodoRow = {
    id: string;
    issue_id: string;
    title: string;
    done: boolean;
    position: number;
    created_at: string;
};

export type ProofRow = {
    id: string;
    issue_id: string;
    object_key: string;
    filename: string;
    content_type: string;
    created_at: string;
    url: string | null;
};

export type IssueRow = {
    id: string;
    title: string;
    description: string;
    steps: string;
    status: string;
    priority: string;
    area: string;
    owner: string;
    tags: string[];
    created_at: string;
    updated_at: string;
    todos: TodoRow[];
    proofs: ProofRow[];
};

function appUrl() {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    return url;
}

function migrateUrl() {
    return process.env.DATABASE_URL_UNPOOLED || appUrl();
}

let schemaReady: Promise<void> | null = null;

const STATEMENTS = [
    `CREATE TABLE IF NOT EXISTS issues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'open',
    priority text NOT NULL DEFAULT 'medium',
    area text NOT NULL DEFAULT 'other',
    owner text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issues_status_check CHECK (status IN ('open', 'in_progress', 'blocked', 'done')),
    CONSTRAINT issues_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'))
  )`,
    `CREATE TABLE IF NOT EXISTS todos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    title text NOT NULL,
    done boolean NOT NULL DEFAULT false,
    position integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
    `CREATE TABLE IF NOT EXISTS proofs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    object_key text NOT NULL,
    filename text NOT NULL,
    content_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
    `ALTER TABLE issues ADD COLUMN IF NOT EXISTS steps text NOT NULL DEFAULT ''`,
    `ALTER TABLE issues ADD COLUMN IF NOT EXISTS tags text[]`,
    `CREATE INDEX IF NOT EXISTS issues_status_updated_idx ON issues (status, updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS todos_issue_position_idx ON todos (issue_id, position)`,
    `CREATE INDEX IF NOT EXISTS proofs_issue_created_idx ON proofs (issue_id, created_at)`,
];

export function ensureSchema() {
    if (!schemaReady) {
        const sql = neon(migrateUrl());
        schemaReady = (async () => {
            for (const statement of STATEMENTS) {
                await sql.query(statement);
            }
        })().catch((error) => {
            schemaReady = null;
            throw error;
        });
    }
    return schemaReady;
}

function sqlClient() {
    return neon(appUrl());
}

export async function listIssues(): Promise<IssueRow[]> {
    await ensureSchema();
    const sql = sqlClient();
    const issues = await sql`
    SELECT id, title, description, steps, status, priority, area, owner, tags, created_at, updated_at
    FROM issues
    ORDER BY
      CASE status
        WHEN 'open' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'blocked' THEN 2
        ELSE 3
      END,
      CASE priority
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END,
      updated_at DESC
    LIMIT 200
  `;
    if (issues.length === 0) return [];

    const ids = issues.map((issue) => issue.id as string);
    const [todos, proofs] = await Promise.all([
        sql.query(
            `SELECT id, issue_id, title, done, position, created_at
       FROM todos
       WHERE issue_id = ANY($1::uuid[])
       ORDER BY position ASC, created_at ASC`,
            [ids],
        ),
        sql.query(
            `SELECT id, issue_id, object_key, filename, content_type, created_at
       FROM proofs
       WHERE issue_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
            [ids],
        ),
    ]);

    const todosByIssue = groupBy(todos, "issue_id");
    const proofsByIssue = groupBy(proofs, "issue_id");

    return Promise.all(
        issues.map(async (issue) => {
            const id = issue.id as string;
            const proofRows = proofsByIssue.get(id) ?? [];
            return {
                id,
                title: issue.title as string,
                description: issue.description as string,
                steps: String(issue.steps ?? ""),
                status: issue.status as string,
                priority: issue.priority as string,
                area: issue.area as string,
                owner: issue.owner as string,
                tags: readTags(issue.tags),
                created_at: String(issue.created_at),
                updated_at: String(issue.updated_at),
                todos: (todosByIssue.get(id) ?? []).map(mapTodo),
                proofs: await Promise.all(proofRows.map(mapProof)),
            };
        }),
    );
}

export async function getProofKeys(issueId: string) {
    await ensureSchema();
    const sql = sqlClient();
    const rows = await sql`
    SELECT object_key FROM proofs WHERE issue_id = ${issueId}::uuid
  `;
    return rows.map((row) => row.object_key as string);
}

function groupBy(
    rows: Record<string, unknown>[],
    key: string,
) {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const row of rows) {
        const id = String(row[key]);
        const list = map.get(id) ?? [];
        list.push(row);
        map.set(id, list);
    }
    return map;
}

function readTags(value: unknown): string[] {
    if (value == null) return [];
    const raw = Array.isArray(value)
        ? value.map(String)
        : typeof value === "string"
          ? value.replace(/^\{|\}$/g, "").split(",").map((item) => item.trim()).filter(Boolean)
          : [];
    return raw.filter(isTag);
}

function mapTodo(row: Record<string, unknown>): TodoRow {
    return {
        id: String(row.id),
        issue_id: String(row.issue_id),
        title: String(row.title),
        done: Boolean(row.done),
        position: Number(row.position),
        created_at: String(row.created_at),
    };
}

async function mapProof(row: Record<string, unknown>): Promise<ProofRow> {
    const objectKey = String(row.object_key);
    return {
        id: String(row.id),
        issue_id: String(row.issue_id),
        object_key: objectKey,
        filename: String(row.filename),
        content_type: String(row.content_type),
        created_at: String(row.created_at),
        url: await proofViewUrl(objectKey),
    };
}

export function db(): NeonQueryFunction<false, false> {
    return sqlClient();
}
