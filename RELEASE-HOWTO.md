Make sure `npm config set git-tag-version true` 

```shell
npm version patch
git push
git push --tags
```

Note the release version and do 
```shell
gh release create --generate-notes
```

Publish to NPM
```shell
npm publish
```