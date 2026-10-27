# Changesets

Every pull request that changes how tunestra works adds a file here. Run `npx changeset`
and answer two questions, or write the file by hand:

```md
---
"tunestra": patch
---

uninstall no longer leaves an empty .tunestra folder.
```

- `patch` for fixes, `minor` for new features. Until 1.0, breaking changes are `minor` too.
- The text goes to `CHANGELOG.md` as is: one or two simple sentences for users.
- Changes that users do not notice, like tests or refactoring, need no changeset.

After a merge to `main`, a bot keeps a "Release a new version" pull request up to date.
Merging it publishes the package to npm, adds the git tag and creates the GitHub release.
