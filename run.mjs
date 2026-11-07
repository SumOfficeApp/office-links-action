// Links every changed .docx/.xlsx/.pptx file to Layers: read, fill in, sign. No dependencies.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('./layers-door.js');

const env = process.env;
const api = env.GITHUB_API_URL || 'https://api.github.com';
const token = env.INPUT_TOKEN || '';
const event = env.GITHUB_EVENT_PATH ? JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, 'utf8')) : {};
const repo = env.GITHUB_REPOSITORY || '';
const owner = repo.split('/')[0] || 'local';
const from = env.INPUT_FROM || `door-gh-action-${owner}`;
const OFFICE = /\.(docx|xlsx|pptx)$/i;
const MARK = '<!-- layers-office-links -->';

async function gh(path, init = {}) {
  const r = await fetch(api + path, {
    ...init,
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'layers-office-links', ...(init.headers || {}) },
  });
  if (!r.ok) throw new Error(`GitHub API ${r.status} ${path}`);
  return r.status === 204 ? null : r.json();
}

async function changed() {
  const pr = event.pull_request;
  if (pr) {
    const out = [];
    for (let page = 1; page < 30; page++) {
      const files = await gh(`/repos/${repo}/pulls/${pr.number}/files?per_page=100&page=${page}`);
      out.push(...files.filter((f) => f.status !== 'removed').map((f) => f.filename));
      if (files.length < 100) break;
    }
    return { files: out, sha: pr.head.sha, src: pr.head.repo ? pr.head.repo.full_name : repo };
  }
  const sha = env.GITHUB_SHA;
  if (event.before && !/^0+$/.test(event.before) && event.after) {
    const c = await gh(`/repos/${repo}/compare/${event.before}...${event.after}`);
    return { files: (c.files || []).filter((f) => f.status !== 'removed').map((f) => f.filename), sha, src: repo };
  }
  const c = await gh(`/repos/${repo}/commits/${sha}`);
  return { files: (c.files || []).filter((f) => f.status !== 'removed').map((f) => f.filename), sha, src: repo };
}

function raw(src, sha, path) {
  return `https://raw.githubusercontent.com/${src}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function main() {
  const explicit = (env.INPUT_FILES || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const isPrivate = !!(event.repository && event.repository.private);
  let list;
  if (explicit.length) list = { files: explicit, sha: env.GITHUB_SHA, src: repo };
  else list = await changed();
  const office = list.files.filter((f) => OFFICE.test(f) || /^https?:\/\//.test(f));
  const links = office.map((p) => ({ path: p, url: D.viewerUrl(/^https?:/.test(p) ? p : raw(list.src, list.sha, p), from) })).filter((x) => x.url);

  let md = `${MARK}\n### Office files in this change\n\n`;
  if (isPrivate) {
    md += 'This repository is private, so Layers cannot read its files by link. Make the files public, or pass public links in `files`.\n';
  } else if (!links.length) {
    md += 'No .docx, .xlsx or .pptx files changed.\n';
  } else {
    md += '| File | Read, fill in, sign |\n|---|---|\n';
    for (const l of links) md += `| \`${l.path}\` | [Open in Layers](${l.url}) |\n`;
    md += `\nNo download needed: the file opens as a page, on a phone too. [Layers plans](${D.pricingUrl(from)})\n`;
  }
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md + '\n');
  if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `links=${JSON.stringify(isPrivate ? [] : links)}\n`);
  console.log(md);

  const pr = event.pull_request;
  if (pr && env.INPUT_COMMENT !== 'false' && links.length && !isPrivate) {
    try {
      const comments = await gh(`/repos/${repo}/issues/${pr.number}/comments?per_page=100`);
      const mine = comments.find((c) => (c.body || '').includes(MARK));
      const body = JSON.stringify({ body: md });
      if (mine) await gh(`/repos/${repo}/issues/comments/${mine.id}`, { method: 'PATCH', body });
      else await gh(`/repos/${repo}/issues/${pr.number}/comments`, { method: 'POST', body });
    } catch (e) {
      console.log(`::notice::Links are in the job summary. Comment not posted (${e.message}); add "permissions: pull-requests: write".`);
    }
  }
}

main().catch((e) => { console.log(`::error::${e.message}`); process.exit(1); });
