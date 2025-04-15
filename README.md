# Gaunt Sloth Assistant

Currently needs
`gcloud auth login`

and 
`gcloud config set project `

TODO figure out how to set project separately.

## Review PR
`gsloth pr 42`

## Review Diff
`git --no-pager diff origin/master...ffd079c134eabf18d85975f155b76d62a895cdec | gsloth review`
(May be helpful to review subset of PR)

## Installation
There's no npm module yet. Do `npm install -g ./` to install local build globally to your machine.
```
git clone https://github.com/andruhon/gaunt-sloth.git
npm install
npm install -g ./
```

## Configuration
There is no global configuration yet. The project you want to get reviewed needs gsloth configuration.

Add .gsloth.config.js, for Google VertexAI it will look like this:
```javascript
export async function configure(importFunction, global) {
    // this is going to be imported from sloth dependencies,
    // but can potentially be pulled from global node modules or from this project
    // At a moment only google-vertexai packaged with Sloth, but you can install support for any other langchain llms 
    // Note: for vertex AI you likely to need to do `gcloud auth login`
    const vertexAi = await importFunction('@langchain/google-vertexai');
    return {
        llm: new vertexAi.ChatVertexAI({
            model: "gemini-2.5-pro-exp-03-25", // Consider checking for latest recommended model versions
            temperature: 0,
            //// Other parameters might be relevant depending on Vertex AI API updates.
            //// The project is not in the interface, but it is in documentation and it seems to work.
            // project: 'your-cool-google-cloud-project',
        })
    }
}
```
