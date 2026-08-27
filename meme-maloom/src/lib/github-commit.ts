/**
 * Minimal wrapper around GitHub's REST + Git Data API, used by the admin
 * upload tool to commit new meme entries (and their media files) straight
 * to the repo. One call to `commitFiles` creates one atomic commit covering
 * every file touched, so a bulk upload of many memes lands as a single
 * commit instead of one per file.
 *
 * Requires GITHUB_TOKEN (a fine-grained PAT scoped to this repo, with
 * "Contents: read and write" permission) set as a server-side env var.
 */

const OWNER = "RahmanRyamseon";
const REPO = "Time-Rupture";
const API = "https://api.github.com";

function branch(): string {
  return process.env.ADMIN_GITHUB_BRANCH || "master";
}

function headers() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function gh(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

/** Fetches a repo file's current text content and its blob sha (for reading data.ts before editing it). */
export async function getFileContent(path: string): Promise<{ content: string; sha: string }> {
  const data = await gh(`/repos/${OWNER}/${REPO}/contents/${path}?ref=${branch()}`);
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { content, sha: data.sha };
}

export type FileWrite = {
  /** Path relative to the repo root, e.g. "meme-maloom/src/lib/data.ts" */
  path: string;
  /** Raw bytes to write. Text files: pass a UTF-8 string. Binary uploads: pass a Buffer. */
  content: string | Buffer;
};

/**
 * Commits one or more file writes as a single atomic commit on the
 * configured branch, fast-forwarding the ref. Returns the new commit's sha
 * and html_url.
 */
export async function commitFiles(files: FileWrite[], message: string): Promise<{ sha: string; htmlUrl: string }> {
  if (files.length === 0) throw new Error("commitFiles called with no files");
  const br = branch();

  const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${br}`);
  const latestCommitSha = ref.object.sha as string;

  const latestCommit = await gh(`/repos/${OWNER}/${REPO}/git/commits/${latestCommitSha}`);
  const baseTreeSha = latestCommit.tree.sha as string;

  const blobs = await Promise.all(
    files.map(async (file) => {
      const base64 = Buffer.isBuffer(file.content)
        ? file.content.toString("base64")
        : Buffer.from(file.content, "utf-8").toString("base64");
      const blob = await gh(`/repos/${OWNER}/${REPO}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: base64, encoding: "base64" }),
      });
      return { path: file.path, sha: blob.sha as string };
    })
  );

  const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: blobs.map((b) => ({ path: b.path, mode: "100644", type: "blob", sha: b.sha })),
    }),
  });

  const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: tree.sha, parents: [latestCommitSha] }),
  });

  await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${br}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });

  return { sha: commit.sha, htmlUrl: `https://github.com/${OWNER}/${REPO}/commit/${commit.sha}` };
}
