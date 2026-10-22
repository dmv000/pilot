# Security

pilot's hooks run on your machine with your user permissions every time Claude Code uses a tool in a pilot project. Treat an update to pilot like an update to any program you run.

## Before you update

1. Read the CHANGELOG entry for the new version.
2. Look at what changed in code that runs: `git diff pilot--v<old>..pilot--v<new> -- plugin/hooks/ plugin/scripts/ plugin/workflows/ .github/actions/`.
3. Then run `claude plugin update pilot@pilot`.

Auto-update is off by default for this marketplace. Keep it off unless you trust every future release.

## What the kit does to stay safe

- The hook scripts have no npm dependencies, so no third-party package code runs.
- Releases are created only by the release workflow. Maintainers can pin the marketplace entry to an exact commit (`ref` plus `sha`).
- Projects call the `pilot-check` GitHub Action by full commit SHA. It needs no secrets and runs with read-only repository permission.
- Every hook does nothing unless the project has `.pilot/manifest.json`.
- The guards for secret files, dangerous shell commands and protected files fail closed.

## Report a vulnerability

Open a private security advisory on the GitHub repository, under Security, then "Report a vulnerability". Please do not open a public issue.
