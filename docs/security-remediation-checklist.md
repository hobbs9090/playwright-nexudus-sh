# Security Remediation Checklist

Use this checklist if the previously committed Nexudus test credential may have been exposed.

## Immediate actions

1. Rotate the Nexudus test account password immediately.
2. Change the account email or username as well if that identifier should no longer be public.
3. Check whether the same password was reused anywhere else and rotate those accounts too.

## CI and automation updates

1. Update the `NEXUDUS_AP_EMAIL` and `NEXUDUS_AP_PASSWORD` repository secrets in GitHub Actions.
2. Update any local shell profiles, password managers, `.env` files, or secret stores used by developers.

## Repository cleanup

1. Treat commit `84dafba` as containing exposed credentials.
2. If this repository is public or widely shared, remove the credential from git history with a coordinated history rewrite.
3. Force-push the rewritten history and have collaborators re-clone or hard reset only after they have preserved any local work.
4. Invalidate or delete any old forks, bundles, archives, or cached mirrors that still contain the exposed credential if you control them.

## Artifacts and access review

1. Review CI logs and Playwright artifacts to confirm the plaintext password was not echoed anywhere else.
2. Remove old workflow artifacts if they contain sensitive account identifiers or session data.
3. Review Nexudus audit logs or access history for unexpected sign-ins tied to the exposed account.

## Prevention

1. Keep all live credentials in CI secret stores or local environment variables only.
2. Enable GitHub secret scanning and push protection if available for the repository.
3. Add secret scanning to local or CI checks with a tool such as `gitleaks` or `detect-secrets`.
4. Use a dedicated low-privilege test account for browser automation.
