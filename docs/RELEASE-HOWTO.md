Make sure `npm config set git-tag-version true` 

For patch, e.g., from 0.0.8 to 0.0.9
```shell
npm version patch
git push
git push --tags
```

For minor, e.g., from 0.0.8 to 0.1.0
```shell
npm version minor
git push
git push --tags
```

Note the release version and do 
```shell
gh release create --generate-notes
```

Publish to NPM
```shell
npm login
npm publish
```