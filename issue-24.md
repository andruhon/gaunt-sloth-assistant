Before implementing this feature, please read .gsloth.guidelines.md

## Introducing .gsloth files directory

By default, gsloth writes all its files to the user's project's root directory. For tidier experience, user may create a special directory named .gsloth in the root of user's project, and gsloth will write all its files there.

First of all important to note that when .gsloth directory is not present in project root, gsloth will write all its files to the root of user's project which means behavior of gsloth remains unchanged.

### Example structure of .gsloth directory
.gsloth/.gsloth-settings/.gsloth-config.json
.gsloth/.gsloth-settings/.gsloth.guidelines.md
.gsloth/.gsloth-settings/.gsloth.review.md
.gsloth/gth_2025-05-18_09-34-38_ASK.md
.gsloth/gth_2025-05-18_22-09-00_PR-22.md

### Details of implementation
- Every time gsloth is about to write any file, including during the process of installation, gsloth must search for .gsloth directory in the root of user's project.
- If .gsloth directory is found during initialization (src/commands/initCommand.ts), gsloth must create .gsloth-settings directory inside of the existed .gsloth directory and write configuration files there.
- We do not intend to create automated migration for .gsloth directory, this is a feature for advanced users and they should organise it themselves if they decided to switch to directory based config after initialisation (all config files may be manually copied into .gsloth/.gsloth-settings directory).
- Gsloth does not create .gsloth directory if it is not found.
- If .gsloth directory exists gsloth should look for configuration files (eg .gsloth-config.json, .gsloth.guidelines.md, .gsloth.review.md, etc) inside of .gsloth/.gsloth-settings directory.

- If .gsloth directory is found, use it for output files (eg review, ask, etc results).
- If .gsloth directory is not found, gsloth must write all its files to the root of user's project (as it does now)

- For example, if user runs gsloth ask "What is the best way to implement this feature?", gsloth should create a file named gth_2025-05-17_21-09-08_ASK.md in the .gsloth directory if .gsloth directory is found, or in the root of user's project if .gsloth directory is not found.
- For example, if user installs gsloth, gsloth should create a .gsloth-settings directory in the .gsloth directory, if .gsloth directory is found in the root of user's project and write configuration files there, or simply write all files in the root of user's project if .gsloth directory is not found.

docs/CONFIGURATION.md should be updated to reflect these changes.