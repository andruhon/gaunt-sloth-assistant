Make sure `npm config set git-tag-version true`

! Important ! The `files` block of package.json strictly controls what is actually released,
the `files` makes .npmignore ignored.

For patch, e.g., from 0.0.8 to 0.0.9
```shell
npm version patch -m "Release notes"
git push
git push --tags
```

For minor, e.g., from 0.0.8 to 0.1.0
```shell
npm version minor -m "Release notes"
git push
git push --tags
```
Type `\` and then Enter to type new line in message.

Note the release version and do
```shell
gh release create --notes-from-tag
```
or
```shell
gh release create --notes-file pathToFile
```
Alternatively `gh release create --notes "notes"`

Publish to NPM
```shell
npm login
npm publish
```

Remember to review a list of files in the build, before confirming it.

Delete incidental remote and local tag
```shell
git tag -d v0.3.0
git push --delete origin v0.3.0
```