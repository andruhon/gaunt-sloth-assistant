# Gaunt Sloth Assistant roadmap


## 1.0.0
Doing the following below and making it work stably should be sufficient to call it version 1. 

### ⌛Add tests and gain reasonable coverage
### Configure eslint for code quality checks
### Automate release process
### Add project init command
Add a command to init certain model in certain project, for example `gsloth init gemini`
or `gsloth init` and select one of the provided options. 
-[x] VertexAI
-[x] Anthropic
-[x] Groq
-[ ] Local LLm 
### Allow global configuration
### Streamline and stabilize configuration
### Add JIRA legacy token integration plugin
### Teach assistant to identify important files and include their contents into prompt
The idea is to ask smaller model like flash to find important files from diff then pick them up and include into prompt.
### Teach assistant to access provided public web links
### Consider adding an option to always include certain source code files into prompt
### Test with Groq
### Add general chat command

## Extra stuff for later

### Modify local files within project (gsloth code)
Expected guardrails:
- Make sure it does not go outside project directory
- Make sure project has git (or later other vcs)
- Make sure that local changes are stashed if any present

### Index project into Vector DB

