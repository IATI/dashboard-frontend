#!/usr/bin/env python3
"""
Post the generated issues to GitHub, once they have been reviewed.

Needs the GitHub CLI, authenticated:

    brew install gh
    gh auth login

Dry run by default — it prints what it would do and posts nothing:

    python3 scripts/consultation/post_issues.py                 # show what would be posted
    python3 scripts/consultation/post_issues.py --post          # actually post
    python3 scripts/consultation/post_issues.py --post --only indicator-2-10

It refuses to post an issue whose title already exists in the repository, so
re-running after adding a few files does not duplicate the rest.

Labels need write access to create. Anyone can open an issue on a public
repository, but only a collaborator can add a label that does not already
exist, and `gh issue create` fails outright on an unknown label rather than
ignoring it. So labels that cannot be created are dropped, with a warning, and
the issues are posted without them — better than posting nothing. Ask for write
access, create the labels, and re-run to have them applied to later issues.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = 'IATI/dashboard-feedback'
# Matches generate_issues.py. Gitignored: the issues belong on GitHub, and this
# is only where they are staged for review first.
OUT_DEFAULT = HERE.parent.parent / 'consultation-issues'


def gh(*args, check=True):
    out = subprocess.run(['gh', *args], capture_output=True, text=True)
    if check and out.returncode:
        sys.exit(f'gh {" ".join(args)} failed:\n{out.stderr.strip()}')
    return out.stdout


def parse(path):
    """Split '---\\ntitle: ...\\nlabels: [...]\\n---\\n\\nbody' into its parts."""
    text = path.read_text()
    m = re.match(r'---\n(.*?)\n---\n\n(.*)', text, re.S)
    if not m:
        sys.exit(f'{path.name}: no front matter')
    head, body = m.groups()
    title = re.search(r'title:\s*"(.*)"', head)
    labels = re.search(r'labels:\s*\[(.*)\]', head)
    if not title:
        sys.exit(f'{path.name}: no title in front matter')
    return title.group(1), re.findall(r'"([^"]*)"', labels.group(1) if labels else ''), body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--post', action='store_true', help='actually create the issues')
    ap.add_argument('--only', default='', help='only files whose name contains this')
    ap.add_argument('--dir', default=str(OUT_DEFAULT),
                    help='where generate_issues.py wrote them (default: %(default)s)')
    args = ap.parse_args()

    source = pathlib.Path(args.dir).expanduser().resolve()
    files = sorted(p for p in source.glob('*.md') if args.only in p.name)
    if not files:
        sys.exit('no matching issue files')

    # Read first, in both modes: a dry run that cannot say what already exists
    # cannot answer the only question worth asking before a re-run.
    rows = json.loads(gh('issue', 'list', '--repo', REPO, '--state', 'all',
                         '--limit', '1000', '--json', 'title'))
    existing = {r['title'] for r in rows}
    known, unavailable = set(), set()
    if args.post:
        known = {l['name'] for l in json.loads(
            gh('label', 'list', '--repo', REPO, '--limit', '200', '--json', 'name'))}

    if not args.post:
        todo = sum(1 for f in files if parse(f)[0] not in existing)
        print(f'DRY RUN — {REPO} already has {len(existing)} issue(s); '
              f'{todo} of these {len(files)} would be created\n')

    posted = skipped = 0
    for path in files:
        title, labels, body = parse(path)
        if not args.post:
            if title in existing:
                print(f'  SKIP (exists)  {title}')
                skipped += 1
            else:
                print(f'  would create   {title}')
                print(f'                 labels: {", ".join(labels) or "none"}'
                      f'   ({len(body)} chars, {path.name})')
            continue
        if title in existing:
            print(f'  skipped, already exists: {title}')
            skipped += 1
            continue
        for label in labels:
            if label in known or label in unavailable:
                continue
            made = subprocess.run(['gh', 'label', 'create', label, '--repo', REPO,
                                   '--color', 'ededed'], capture_output=True, text=True)
            if made.returncode:
                print(f'  ! cannot create label "{label}" — posting without it'
                      f' ({made.stderr.strip().splitlines()[-1] if made.stderr.strip() else "no detail"})')
                unavailable.add(label)
            else:
                known.add(label)

        usable = [l for l in labels if l in known]
        cmd = ['issue', 'create', '--repo', REPO, '--title', title, '--body', body]
        for label in usable:
            cmd += ['--label', label]
        print(f'  created: {gh(*cmd).strip()}')
        posted += 1

    if args.post:
        print(f'\n{posted} created, {skipped} already existed')
    else:
        print(f'\nNothing posted. {skipped} already exist and would be skipped; '
              f'{len(files) - skipped} would be created. Re-run with --post to do it.')


if __name__ == '__main__':
    main()
