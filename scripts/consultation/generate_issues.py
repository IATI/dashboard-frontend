#!/usr/bin/env python3
"""
Build one consultation issue per dimension component and per indicator.

Generated rather than hand-written so the issues say the same thing as the
dashboard: the descriptions come from the frontend's own locale file, the
thresholds from the methodology it scores against, and the tests from the
feature files that actually run. Re-run it after any of those change and
re-post, instead of editing 44 files by hand.

Most of what an issue says already lives in this repository — the indicator
descriptions and notes in i18n/locales/indicators.en.json, the thresholds in
sample-data/methodology.json, the framework's own ordering in
useIndicatorHelp.js. The Gherkin scenarios come from a sibling checkout of
IATI/dashboard-tests.

The issues belong on GitHub, not in a repository: dashboard-feedback holds only
its README, and these files are a staging post for review before posting. They
are written outside the repo for that reason — see OUT_DEFAULT.

Usage:  python3 scripts/consultation/generate_issues.py [--out DIR]
        python3 scripts/consultation/post_issues.py          # dry run
"""
import argparse
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
FRONTEND = HERE.parent.parent                      # the frontend checkout
TESTS = (FRONTEND.parent.parent / 'dashboard-tests' / 'test_definitions')

# Which component belongs to which dimension, and the order they are presented
# in. Mirrors DIMENSIONS in the frontend's about.vue.
DIMENSIONS = [
    ('availability', 'Availability', ['downloadable', 'no_critical_errors', 'no_errors']),
    ('timeliness', 'Timeliness', ['frequency', 'timeliness']),
    ('coverage', 'Coverage', ['coverage', 'disaggregation']),
    ('comprehensiveness', 'Comprehensiveness',
     ['organisation_fields', 'basic_fields', 'financial_fields', 'advanced_fields']),
]
COMPONENT_LABEL = {
    'downloadable': 'No download errors',
    'no_critical_errors': 'No critical errors',
    'no_errors': 'No other errors',
    'frequency': 'Frequency',
    'timeliness': 'Time lag',
    'coverage': 'Coverage',
    'disaggregation': 'Disaggregation',
    'organisation_fields': 'Organisation fields',
    'basic_fields': 'Basic fields',
    'financial_fields': 'Financial fields',
    'advanced_fields': 'Advanced fields',
}
BANDS = [('good', 'Good'), ('very_good', 'Very good'), ('excellent', 'Excellent')]

# In the frontend checkout so they are easy to read before posting, but
# gitignored: these are a staging post for review, not source. The issues live
# on GitHub once posted, and dashboard-feedback holds only its README.
OUT_DEFAULT = FRONTEND / 'consultation-issues'

COVERAGE_SITE = 'https://iati.github.io/dashboard-coverage/'
COVERAGE_METHODOLOGY = 'https://iati.github.io/dashboard-coverage/methodology/'

# Coverage and disaggregation are not calculated from the IATI data alone, so
# the one-line description the dashboard shows is not enough to consult on.
# Summarised from the coverage methodology, which is linked for the detail.
COMPONENT_DETAIL = {
    'coverage': f'''### How it is calculated

Coverage compares an organisation's **gross spending in IATI** — disbursements
plus expenditure — against an independent reference figure for the same
organisation and the same period. It asks how much of what an organisation
actually spent can be seen in its IATI data.

Reference figures are taken from the first of these that covers the publisher:

| Source | Reference figure |
| --- | --- |
| UN CEB | Total annual expenses |
| OECD CRS | Disbursements per donor or agency |
| Charity Commission (UK) | Latest filed expenditure |
| CBF (Netherlands) | Doelbesteding |
| IRS Form 990 (US) | Total functional expenses |
| The publisher's own total budget | Declared in its IATI organisation file |

Each source is compared against the period its own reference covers rather than
one fixed year, because organisations file on different cycles. The publisher's
own declared total budget is the fallback of last resort: self-declared,
unaudited, and a statement of intent rather than outcome.

Coverage is a property of a reference entity rather than of a publisher, so
where several publishers sit beneath one reference figure they share its
percentage.

Of 2,119 publishers, 547 currently have a reference figure. The rest report
coverage of 0 with `no_reference: true`, meaning none of their spending could be
corroborated — publishing a total budget in the organisation file is enough to
make coverage calculable.

Figures over 100% are common and usually explicable: incoming funds not
reported, or a reference covering a narrower scope than the IATI data.

Full detail: [coverage methodology]({COVERAGE_METHODOLOGY}) ·
[coverage statistics]({COVERAGE_SITE})
''',
    'disaggregation': f'''### How it is calculated

This counts the **quarters in which an organisation reports disbursement or
expenditure transactions**, averaged over the last five years. Four means
spending is attributed to every quarter of the year; one means it is reported as
a single annual lump.

It describes how finely spending is broken down through the year. Quarterly
figures let a partner country see when money actually moved, which an annual
total cannot.

**It is not a measure of how often a publisher updates its files.** That is
measured separately, by the timeliness dimension. A publisher can update weekly
while still reporting one annual total, or update once a year with full
quarterly detail.

Full detail: [coverage methodology]({COVERAGE_METHODOLOGY}) ·
[coverage statistics]({COVERAGE_SITE})
''',
}

# The four indicators calculated outside the Gherkin runner have no scenarios to
# quote, so their measures are described here. The names are the API's own, from
# comprehensiveness_new_non_gherkin on 2026-10-15; a measure with no description
# is one whose name already says what it is.
NON_GHERKIN = {
    '1.5_country_strategy_or_mou': {
        'measures': {'Country Strategy or MOU': None},
    },
    '1.8_country_budgets': {
        'measures': {
            'Country budget available 1 year forward': None,
            'Country budget available 2 years forward': None,
            'Country budget available 3 years forward': None,
        },
    },
    '3.3_traceability': {
        'measures': {
            'Upward traceability':
                "The share of this organisation's incoming funds which explicitly state "
                "which provider organisation's activity is providing the funds.",
            'Downward traceability':
                'The share of activities of downstream partners which report receiving '
                'funding from this organisation.',
        },
    },
    '4.7_organisation_identifiers': {
        'intro': 'Whether the organisation identifiers used in implementing organisations '
                 'and transaction receiver organisations are correctly structured.',
        'measures': {
            'Receiver Org Transaction Valid Refs':
                'The share of transaction receiver organisations whose identifier is '
                'correctly structured.',
            'Implementing Org Transaction Valid Refs':
                'The share of implementing organisations whose identifier is correctly '
                'structured.',
        },
    },
}


def load_framework():
    """The indicators, grouped by component, in the framework's own order."""
    src = (FRONTEND / 'app' / 'composables' / 'useIndicatorHelp.js').read_text()
    blocks = re.findall(r"\{ component: '([^']+)', ids: \[(.*?)\] \}", src, re.S)
    if not blocks:
        sys.exit('could not read FRAMEWORK_INDICATORS from useIndicatorHelp.js')
    return [(c, re.findall(r"'([^']+)'", ids)) for c, ids in blocks]


def load_features():
    """{indicator id: [(scenario, [given steps], [then steps])]} from the .feature files."""
    out = {}
    for path in sorted(TESTS.rglob('*.feature')):
        indicator = path.stem
        scenarios, current = [], None
        for line in path.read_text().splitlines():
            stripped = line.strip()
            if stripped.startswith('#') or not stripped:
                continue
            m = re.match(r'Scenario(?: Outline)?:\s*(.+)', stripped)
            if m:
                current = (m.group(1).strip(), [], [])
                scenarios.append(current)
                continue
            if current is None:
                continue
            m = re.match(r'(Given|And|Then)\s+(.*)', stripped)
            if not m:
                continue
            keyword, text = m.group(1), m.group(2).strip()
            # `And` continues whichever clause it follows
            target = current[2] if (keyword == 'Then' or (keyword == 'And' and current[2])) else current[1]
            target.append(text)
        if scenarios:
            out[indicator] = scenarios
    return out


def readable(step):
    """
    State a test as a fact rather than an expectation.

    Gherkin writes its assertions as "`title` should be present", which reads
    oddly after "Passes when" — "passes when the title should be present". The
    wording is the test definition's own otherwise; only the modal changes.
    """
    step = re.sub(r'\bshould be\b', 'is', step)
    step = re.sub(r'\bshould have\b', 'has', step)
    step = re.sub(r'\bshould start\b', 'starts', step)
    return step


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def front_matter(title, labels):
    quoted = ', '.join(f'"{l}"' for l in labels)
    return f'---\ntitle: "{title}"\nlabels: [{quoted}]\n---\n\n'


FEEDBACK_INDICATOR = """
### Your feedback

- Is this a reasonable thing to expect publishers to report?
- Are the tests the right way to measure it?
- Should it apply to every publisher, or are there organisation types it should not apply to?

Please comment below. Comments are open until **16 November 2026**.
"""

FEEDBACK_COMPONENT_GROUPED = """
### Your feedback

- Are these the right indicators to group together?
- Are the thresholds set at the right level — too demanding, or not demanding enough?

Please comment below. Comments are open until **16 November 2026**.
"""

# A component that is not made up of indicators — availability, timeliness and
# coverage are measured directly — has no grouping to ask about.
FEEDBACK_COMPONENT_DIRECT = """
### Your feedback

- Is this the right thing to measure?
- Are the thresholds set at the right level — too demanding, or not demanding enough?

Please comment below. Comments are open until **16 November 2026**.
"""


def indicator_issue(ind_id, component, dimension, names, helps, notes, features):
    number, _, _ = ind_id.partition('_')
    name = names.get(ind_id, ind_id)
    body = front_matter(f'{number} {name}', ['indicator', COMPONENT_LABEL[component].lower()])
    body += f'**Dimension:** {dimension} · **Component:** {COMPONENT_LABEL[component]}\n\n'
    body += f'{helps.get(ind_id, "")}\n\n'

    body += '### How it is measured\n\n'
    scenarios = features.get(ind_id)
    skipped = scenarios and all(
        any('skip it' in t.lower() for t in thens) for _, _, thens in scenarios)

    if ind_id in NON_GHERKIN:
        spec = NON_GHERKIN[ind_id]
        if spec.get('intro'):
            body += spec['intro'] + '\n\n'
        body += ('Calculated across the organisation\'s data rather than activity by activity, '
                 'so it has no pass/fail scenarios. It reports:\n\n')
        for measure, description in spec['measures'].items():
            body += f'- **{measure}**'
            body += f' — {description}\n' if description else '\n'
        body += '\nEach is a proportion, and the indicator is their average.\n'
    elif not scenarios or skipped:
        body += '_No test definition is published for this indicator yet._\n'
    else:
        # Scope comes from the feature's own Given steps, not from the indicator
        # number: the 1.x indicators are assessed against the organisation file,
        # everything else against activities.
        organisation = any('file is an organisation file' in g
                           for _, givens, _ in scenarios for g in givens)
        if organisation:
            body += 'Each test below runs against each organisation file.\n'
        else:
            body += ('Each test below runs against every current activity. An activity the test '
                     'does not apply to is left out of the score rather than counted as a '
                     'failure.\n')
        for scenario, givens, thens in scenarios:
            body += f'\n**{scenario}**\n\n'
            conditions = [g for g in givens
                          if g not in ('an IATI activity', 'the activity is current',
                                       'file is an organisation file')]
            # The steps already carry their own backticks around the XPaths,
            # so they are emitted as written rather than wrapped again.
            if conditions:
                body += '- Only where: ' + '; '.join(conditions) + '\n'
            for then in thens:
                body += f'- Passes when: {readable(then)}\n'

    note = notes.get(ind_id)
    if note:
        body += f'\n### Please note\n\n{note}\n'
    return f'indicator-{number.replace(".", "-")}-{slug(name)}.md', body + FEEDBACK_INDICATOR


def component_issue(component, dimension, ids, names, comp_help, methodology):
    label = COMPONENT_LABEL[component]
    body = front_matter(f'Component: {label}', ['component', dimension.lower()])
    body += f'**Dimension:** {dimension}\n\n{comp_help.get(component, "")}\n\n'

    meta = methodology['components'].get(component, {})
    thresholds, unit = meta.get('thresholds', {}), meta.get('unit')
    if thresholds:
        body += '### Thresholds\n\n'
        body += '| ' + ' | '.join(l for _, l in BANDS) + ' |\n'
        body += '| ' + ' | '.join('---' for _ in BANDS) + ' |\n'
        cells = []
        for key, _ in BANDS:
            v = thresholds.get(key)
            if v is None:
                cells.append('Not required')
            elif unit == 'percent':
                cells.append(f'{v}%')
            elif unit == 'count':
                cells.append(f'{v} quarters a year')
            elif unit == 'boolean':
                cells.append('must pass')
            else:
                cells.append(str(v).replace('_', ' '))
        body += '| ' + ' | '.join(cells) + ' |\n'

    detail = COMPONENT_DETAIL.get(component)
    if detail:
        body += '\n' + detail

    if ids:
        body += '\n### Indicators in this component\n\n'
        for ind_id in ids:
            number, _, _ = ind_id.partition('_')
            body += f'- {number} {names.get(ind_id, ind_id)}\n'
    feedback = FEEDBACK_COMPONENT_GROUPED if ids else FEEDBACK_COMPONENT_DIRECT
    return f'component-{slug(label)}.md', body + feedback


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=str(OUT_DEFAULT),
                    help='where to write the files (default: %(default)s)')
    args = ap.parse_args()

    ind = json.loads((FRONTEND / 'i18n' / 'locales' / 'indicators.en.json').read_text())
    methodology = json.loads((FRONTEND / 'sample-data' / 'methodology.json').read_text())
    names, helps, notes = ind['indicatorName'], ind['indicatorHelp'], ind['indicatorNote']
    comp_help = ind['componentHelp']
    framework = dict(load_framework())
    features = load_features()

    out = pathlib.Path(args.out).expanduser().resolve()
    out.mkdir(exist_ok=True)
    for stale in out.glob('*.md'):
        stale.unlink()

    # Components first, in the order the proposal and the dashboard present the
    # dimensions; then every indicator, in the framework's own numbering. The
    # file names carry a sequence number because GitHub numbers issues in the
    # order they are created, and because a plain sort of the names puts 2.10
    # before 2.2 — in the directory listing as well as in the posting.
    planned = []
    for _, dimension, components in DIMENSIONS:
        for component in components:
            ids = framework.get(component, [])
            planned.append(component_issue(component, dimension, ids, names, comp_help, methodology))
    for _, dimension, components in DIMENSIONS:
        for component in components:
            for ind_id in framework.get(component, []):
                planned.append(
                    indicator_issue(ind_id, component, dimension, names, helps, notes, features))

    for position, (fn, body) in enumerate(planned, start=1):
        (out / f'{position:02d}-{fn}').write_text(body)

    written = len(planned)
    print(f'wrote {written} issues to {out}')
    missing = [i for i in names if i not in {x for ids in framework.values() for x in ids}]
    if missing:
        print('WARNING: described but not in any component:', ', '.join(missing))


if __name__ == '__main__':
    main()
