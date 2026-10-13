# Releasing gravity-wave

The implementation is local. Remote creation, Git initialization, commits, pushes, publication, and public hosting are separate actions requiring the owner's explicit instruction.

## Before the first release

1. Review the playground, both wave modes, and the API examples. Decide whether the first release should be 0.1.0 or another version.
2. Choose a GitHub owner and an npm owner. Use existing accounts or create them yourself. Confirm the MIT copyright holder and your right to license the extracted source; update the license holder if desired.
3. Check npm availability with `npm view gravity-wave name version`. An E404 means no package metadata was found, but it is not a guarantee that the name can be registered. If taken, discuss a scope such as `@yourname/gravity-wave`; do not silently rename the package. A scoped npm package can retain gravity-wave as its repository name.
4. Update the package's name if necessary. Add the verified repository URL, homepage, and bug tracker to package.json once ownership is chosen. Do not insert guessed URLs.
5. Run the checks below and inspect the package allowlist. Confirm no credentials, demo files, tests, or local planning notes are included in the tarball.

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run demo:build
npm run check:package
npm pack --dry-run
```

## GitHub

After explicitly authorizing repository creation, create a public gravity-wave repository under the selected owner. Initialize Git in this project folder, commit the reviewed files, add the repository as origin, and push only when those operations have been explicitly authorized. Do not initialize the remote with a second README or license if the local files will be the initial content.

Add a short description and topics, enable issues if desired, and document contribution expectations. The demo build can later be hosted using GitHub Pages or another static host; public hosting is optional and requires a separate instruction.

## npm

Use the selected npm account, verify its email, and enable two-factor authentication for a manual release. Sign in with `npm login`, then confirm the intended account with `npm whoami`. Complete authentication prompts yourself; do not share credentials in chat.

After explicit publication approval, build and publish the reviewed version. An unscoped package is public. For a scoped public package, use the appropriate public access setting. Review npm's current authentication requirements immediately before release:

- https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages/
- https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- https://docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/

A manual first release does not need a CI publishing token. Automated trusted publishing can be configured later after ownership and release policy are settled.

## After publication

Install the published version into fresh vanilla and React examples, confirm the README examples, and check the package page. Add a matching GitHub release with notes describing the supported API and known limits. Replace local-prerelease wording in the README and demo only when a real public package is available.

For updates, increment the version, record user-visible changes, run the checks, and request explicit instructions for commit, push, and publication. Published name/version combinations cannot be reused. Keep fixes compatible where practical; document breaking API changes clearly.
