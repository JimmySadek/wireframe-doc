#!/usr/bin/env bash
# pre-publish-check.sh — leak + consistency guard for the wireframe-doc skill.
#
# Runs three checks and fails CLOSED (non-zero exit, no greenlight) on any
# problem found:
#
#   A  Confidentiality scan  — denylist patterns vs the working tree AND the
#                              full git history (every commit, not just HEAD)
#   B  Version consistency   — SKILL.md frontmatter version == top CHANGELOG
#                              version (bracketed token; dash/date agnostic)
#   C  Fixture render loop    — every tests/fixtures/*.md exits with the code
#                              EXPECTED.md declares for it (default mode)
#
# Zero-dependency. Uses only: bash 3.2, git, grep, sed, awk, basename, mktemp,
# and node (node solely to run the existing renderer). No npm / jq / python.
# BSD / macOS-compatible flags only.
#
# Read-only on the repo EXCEPT: it creates .pre-publish-denylist from a generic
# template on first run, and its own temp files. It never commits anything.
#
# Run from anywhere inside the repo. Exits 0 with "SAFE TO PUBLISH" only when
# checks A, B and C all pass.

set -u -o pipefail

# ── Locate the repo root ───────────────────────────────────────────────────
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "${REPO_ROOT:-}" ]; then
  printf 'FATAL: not inside a git repository (cannot scan history). Failing closed.\n' >&2
  exit 1
fi
cd "$REPO_ROOT" || { printf 'FATAL: cannot cd to repo root.\n' >&2; exit 1; }

DENYLIST=".pre-publish-denylist"
SKILL="SKILL.md"
CHANGELOG="CHANGELOG.md"
FIXTURE_DIR="tests/fixtures"
EXPECTED="$FIXTURE_DIR/EXPECTED.md"
RENDERER="scripts/wireframe-render.mjs"

# ── Temp workspace (cleaned on any exit) ───────────────────────────────────
TMPDIR_PP=$(mktemp -d -t prepub) || { printf 'FATAL: mktemp failed.\n' >&2; exit 1; }
# shellcheck disable=SC2329  # invoked indirectly via the trap on the next line
cleanup() { rm -rf "$TMPDIR_PP"; }
trap cleanup EXIT INT TERM

A_STATUS="PASS"; B_STATUS="PASS"; C_STATUS="PASS"
A_NOTES="";       B_NOTES="";     C_NOTES=""

fail_a() { A_STATUS="FAIL"; }
fail_b() { B_STATUS="FAIL"; }
fail_c() { C_STATUS="FAIL"; }

# ───────────────────────────────────────────────────────────────────────────
# Check A — Confidentiality scan
# ───────────────────────────────────────────────────────────────────────────
printf '== Check A: confidentiality scan (working tree + full git history) ==\n'

# (a/b) Bootstrap a generic, non-confidential denylist on first run. The
# patterns are written so their own literal text does NOT satisfy them (a regex
# metachar follows each literal anchor), so this script can safely scan itself.
if [ ! -f "$DENYLIST" ]; then
  cat > "$DENYLIST" <<'DENY'
# .pre-publish-denylist — LOCAL-ONLY confidentiality denylist for
# scripts/pre-publish-check.sh. This file is .gitignore'd and MUST NEVER be
# committed. One POSIX extended-regex (ERE) pattern per line. Lines starting
# with '#' are comments; blank lines are ignored.
#
# --- Generic secret patterns (shipped defaults — no confidential nouns) ---
-----BEGIN [A-Z ]*PRIVATE KEY-----
AKIA[0-9A-Z]{16}
(api[_-]?key|secret|token|passwd|password)["' ]*[:=]["' ]*[A-Za-z0-9/+=]{20,}
(SECRET|TOKEN|PASSWORD|PRIVATE_?KEY|ACCESS_?KEY|API_?KEY)[A-Z0-9_]*=[^[:space:]]{12,}
xox[baprs]-[0-9A-Za-z-]{10,}
gh[pousr]_[0-9A-Za-z]{20,}
#
# Add project-specific confidential markers below this line (this file is
# gitignored and never committed). One ERE per line — e.g. internal codenames,
# client names, private hostnames, or internal path prefixes.
#
DENY
  printf 'NOTICE: created %s from the generic template.\n' "$DENYLIST"
  printf 'NOTICE: populate it with project-specific confidential markers\n'
  printf '        (internal codenames, client/people names, private hosts) and re-run.\n'
  printf '        The scan below uses the generic patterns only for now.\n\n'
fi

# Sanitised pattern file (no comments / blanks) for the aggregate -f scan.
PATFILE="$TMPDIR_PP/patterns"
grep -vE '^[[:space:]]*(#|$)' "$DENYLIST" > "$PATFILE" 2>/dev/null || true
PATCOUNT=$(grep -cvE '^[[:space:]]*(#|$)' "$DENYLIST" 2>/dev/null || true)
: "${PATCOUNT:=0}"
if [ "$PATCOUNT" -eq 0 ]; then
  printf 'FATAL: %s has no active patterns — refusing to greenlight a vacuous scan.\n' "$DENYLIST"
  A_NOTES="empty denylist"
  fail_a
fi

REVS=$(git rev-list --all 2>/dev/null || true)

# Location reporters: print ONLY ref:file:line — never the matched value.
report_loc_wt()   { awk -F: 'NF>=2 {printf "      worktree  %s:%s\n",  $1,$2}'; }
report_loc_hist() { awk -F: 'NF>=3 {printf "      history   %s:%s:%s\n",$1,$2,$3}'; }

if [ "$A_STATUS" = "PASS" ]; then
  HITS=0

  # (c) Working tree — aggregate -f scan, exactly as specified by the brief.
  git grep -qIE -f "$PATFILE" -- . 2>/dev/null
  rc=$?
  if [ "$rc" -eq 0 ]; then
    HITS=1
  elif [ "$rc" -ge 2 ]; then
    printf 'FATAL: git grep errored on the working-tree aggregate scan. Failing closed.\n'
    A_NOTES="git grep error (worktree)"
    fail_a
  fi

  # Per-pattern attribution for the working tree AND (d) the full history.
  # The secret value is never printed — only the denylist line ref + location.
  LN=0
  while IFS= read -r raw || [ -n "$raw" ]; do
    LN=$((LN + 1))
    stripped=$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+//')
    case "$stripped" in
      ''|'#'*) continue ;;
    esac
    pat=$raw

    wt=$(git grep -nIE -e "$pat" -- . 2>/dev/null); wrc=$?
    if [ "$wrc" -ge 2 ]; then
      printf 'FATAL: git grep error (worktree, denylist line %d). Failing closed.\n' "$LN"
      A_NOTES="git grep error"
      fail_a
    fi
    if [ -n "$wt" ]; then
      HITS=1
      printf '  x  denylist line %d matched in the WORKING TREE:\n' "$LN"
      printf '%s\n' "$wt" | report_loc_wt
    fi

    if [ -n "$REVS" ]; then
      # shellcheck disable=SC2086  # $REVS MUST word-split: one arg per commit SHA
      hh=$(git grep -nIE -e "$pat" $REVS -- . 2>/dev/null); hrc=$?
      if [ "$hrc" -ge 2 ]; then
        printf 'FATAL: git grep error (history, denylist line %d). Failing closed.\n' "$LN"
        A_NOTES="git grep error"
        fail_a
      fi
      if [ -n "$hh" ]; then
        HITS=1
        printf '  x  denylist line %d matched in GIT HISTORY:\n' "$LN"
        printf '%s\n' "$hh" | report_loc_hist
      fi
    fi
  done < "$DENYLIST"

  if [ "$HITS" -ne 0 ]; then
    [ -z "$A_NOTES" ] && A_NOTES="denylist match in tracked content or history"
    fail_a
  fi
fi

if [ "$A_STATUS" = "PASS" ]; then
  printf '  OK — no denylist pattern found in the working tree or history.\n\n'
else
  printf '  FAIL — see offending refs above. Matched values are intentionally withheld.\n\n'
fi

# ───────────────────────────────────────────────────────────────────────────
# Check B — SKILL.md / CHANGELOG.md version parity
# ───────────────────────────────────────────────────────────────────────────
printf '== Check B: SKILL.md / CHANGELOG.md version parity ==\n'
if [ ! -f "$SKILL" ] || [ ! -f "$CHANGELOG" ]; then
  printf '  FAIL — missing %s or %s.\n\n' "$SKILL" "$CHANGELOG"
  B_NOTES="missing SKILL.md or CHANGELOG.md"
  fail_b
else
  # version: from the YAML frontmatter only (between the first two '---' lines).
  SKILL_VER=$(awk '
    /^---[[:space:]]*$/ { d++; next }
    d==1 && /^version:[[:space:]]*/ { sub(/^version:[[:space:]]*/,""); gsub(/[[:space:]]/,""); print; exit }
  ' "$SKILL")
  # First bracketed token of the first "## [x.y.z]" heading — dash/date agnostic.
  CHLOG_VER=$(sed -nE 's/^##[[:space:]]+\[([^]]+)\].*/\1/p' "$CHANGELOG" | head -1)

  printf '  SKILL.md     version: %s\n' "${SKILL_VER:-<none>}"
  printf '  CHANGELOG.md version: %s\n' "${CHLOG_VER:-<none>}"

  if [ -z "$SKILL_VER" ] || [ -z "$CHLOG_VER" ]; then
    B_NOTES="could not extract one or both versions"
    fail_b
  elif [ "$SKILL_VER" != "$CHLOG_VER" ]; then
    B_NOTES="version mismatch ($SKILL_VER vs $CHLOG_VER)"
    fail_b
  fi

  if [ "$B_STATUS" = "PASS" ]; then
    printf '  OK — versions match.\n\n'
  else
    printf '  FAIL — %s\n\n' "$B_NOTES"
  fi
fi

# ───────────────────────────────────────────────────────────────────────────
# Check C — Fixture render loop (default mode, honoring EXPECTED.md)
# ───────────────────────────────────────────────────────────────────────────
printf '== Check C: fixture render loop (default mode, honoring EXPECTED.md) ==\n'
if [ ! -f "$EXPECTED" ]; then
  printf '  FAIL — missing %s.\n\n' "$EXPECTED"
  C_NOTES="missing EXPECTED.md"
  fail_c
elif [ ! -f "$RENDERER" ]; then
  printf '  FAIL — missing %s.\n\n' "$RENDERER"
  C_NOTES="missing renderer"
  fail_c
elif ! command -v node >/dev/null 2>&1; then
  printf '  FAIL — node not found on PATH.\n\n'
  C_NOTES="node missing"
  fail_c
else
  # Expected DEFAULT-mode exit code for a fixture = first "exit: N" line in its
  # "## <fixture>.md" section (the --lenient variant always appears after it).
  expected_exit_for() {
    awk -v f="$1" '
      $0 ~ ("^##[[:space:]]+" f "[[:space:]]*$") { inblk=1; next }
      inblk && /^##[[:space:]]/                  { exit }
      inblk && /^exit:[[:space:]]*[0-9]+/        { v=$0; sub(/^exit:[[:space:]]*/,"",v); print v; exit }
    ' "$EXPECTED"
  }

  OUT="$TMPDIR_PP/out.html"
  any=0
  for f in "$FIXTURE_DIR"/*.md; do
    [ -e "$f" ] || continue
    base=$(basename "$f")
    [ "$base" = "EXPECTED.md" ] && continue
    any=1

    exp=$(expected_exit_for "$base")
    if [ -z "$exp" ]; then
      printf '  x  %-30s no expected exit code found in EXPECTED.md\n' "$base"
      C_NOTES="missing expectation for $base"
      fail_c
      continue
    fi

    node "$RENDERER" "$f" "$OUT" >/dev/null 2>&1
    act=$?
    rm -f "$OUT"

    if [ "$act" -eq "$exp" ]; then
      printf '  ok %-30s expected=%s actual=%s\n' "$base" "$exp" "$act"
    else
      printf '  x  %-30s expected=%s actual=%s  <-- DEVIATION\n' "$base" "$exp" "$act"
      C_NOTES="render exit deviation"
      fail_c
    fi
  done

  if [ "$any" -eq 0 ]; then
    printf '  FAIL — no fixtures found in %s\n' "$FIXTURE_DIR"
    C_NOTES="no fixtures"
    fail_c
  fi
  printf '\n'
fi

# ───────────────────────────────────────────────────────────────────────────
# Aggregation + exit contract
# ───────────────────────────────────────────────────────────────────────────
summary_line() { # $1=letter  $2=label  $3=status  $4=notes
  if [ -n "$4" ]; then
    printf '  %s  %-22s %s  (%s)\n' "$1" "$2" "$3" "$4"
  else
    printf '  %s  %-22s %s\n' "$1" "$2" "$3"
  fi
}

printf '================== SUMMARY ==================\n'
summary_line A "Confidentiality scan" "$A_STATUS" "$A_NOTES"
summary_line B "Version consistency"  "$B_STATUS" "$B_NOTES"
summary_line C "Fixture render loop"  "$C_STATUS" "$C_NOTES"
printf '============================================\n'

if [ "$A_STATUS" = "PASS" ] && [ "$B_STATUS" = "PASS" ] && [ "$C_STATUS" = "PASS" ]; then
  printf '\nSAFE TO PUBLISH — all checks passed.\n'
  exit 0
else
  printf '\nNOT SAFE TO PUBLISH — resolve the above before pushing.\n'
  exit 1
fi
