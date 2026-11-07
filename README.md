# Office file links for pull requests

**Reviewers read, fill in and sign the .docx and .xlsx files of a pull request without downloading them.**

A pull request changes a contract, a price list or a report in `.docx`, `.xlsx` or `.pptx`. GitHub shows "Binary file not shown". This action adds one comment with a link per file: the reviewer opens it as a page, reads it, fills it in and sends it for signature. No download, no office suite.

```yaml
name: office-links
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  links:
    runs-on: ubuntu-latest
    steps:
      - uses: SumOfficeApp/office-links-action@v1
```

That is all. The links also appear in the job summary.

## Inputs

| Input | Default | What it does |
|---|---|---|
| `files` | changed files | Paths or public links, one per line |
| `comment` | `true` | One comment on the pull request, updated on each push |
| `from` | | Your own tag in Layers statistics |

Output `links`: JSON list of `{path, url}`, for your own steps (chat message, release notes).

Works with public repositories: Layers reads the file by its public link at the commit of the pull request. For private repositories, pass public links in `files`.

## What the reviewer gets

The file opens in Layers: read it on a phone, edit it, send it for signature, save a finished copy. Start free: https://app.layers.md/register?from=door-gh-action. Plans: https://layers.md/pricing?from=door-gh-action.

The self-test in this repository opens two real files on every push: [samples/service-agreement.docx](samples/service-agreement.docx) and [samples/invoice.xlsx](samples/invoice.xlsx).

MIT. Made by SumOffice.
