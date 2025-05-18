# UX Research


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
- If .gsloth directory is found, gsloth must check the type of file it is going to write: 
- if gsloth is going to write an output file which name has ending (suffix) made of the name of the command that created that file, gsloth must write that file to the .gsloth directory;
- otherwise gsloth must search for .gsloth-settings directory inside of the .gsloth directory:
- if the .gsloth-settings directory is found inside of .gsloth directory, then gsloth must write these files there; 
- if .gsloth-settings directory is not found inside of .gsloth directory, then gsloth must create the .gsloth-settings directory inside of the existed .gsloth directory and write these files there. 
- If .gsloth directory is not found, gsloth must write all its files to the root of user's project (as it does now)

- For example, if user runs gsloth ask "What is the best way to implement this feature?", gsloth should create a file named gth_2025-05-17_21-09-08_ASK.md in the .gsloth directory if .gsloth directory is found, or in the root of user's project if .gsloth directory is not found.
- For example, if user installs gsloth, gsloth should create a .gsloth-settings directory in the .gsloth directory, if it is found in the root of user's project and write their files, which are not output-type, there, or simply write all files in the root of user's project if .gsloth directory is not found.

## Currently available commands:
```
gsloth --help
Usage: gsloth [options] [command]

Gaunt Sloth Assistant reviewing your PRs

Options:
  -V, --version            output the version number
  -h, --help               display help for command

Commands:
  init <type>              Initialize the Gaunt Sloth Assistant in your project.
                           This will write necessary config files.
  pr [options] <prNumber>  Review a PR in current git directory (assuming that
                           GH cli is installed and authenticated for current
                           project
  review [options]         Review provided diff or other content
  ask [options] <message>  Ask a question
  help [command]           display help for command
```

pr (we decided to rename it to r as shortcut for review with pull request provider)
```
gsloth pr --help
Usage: gsloth pr [options] <prNumber>

Review a PR in current git directory (assuming that GH cli is installed and
authenticated for current project

Arguments:
  prNumber           PR number to review

Options:
  -f, --file <file>  Input file. Content of this file will be added BEFORE the
                     diff
  -h, --help         display help for command
```

ask
```
gsloth ask --help
Usage: gsloth ask [options] <message>

Ask a question

Arguments:
  message            A message

Options:
  -f, --file <file>  Input file. Context of this file will be added BEFORE the
                     diff
  -h, --help         display help for command
```

review (lacks documentaion, it also accepts pipe with stdin)
```
gsloth review --help
Usage: gsloth review [options]

Review provided diff or other content

Options:
  -f, --file <file>  Input file. Context of this file will be added BEFORE the
                     diff
  -h, --help         display help for command
```

## Future functions

- JIRA. We need to privide a jira number as a criteria, this should somehow go through separate provider and using config from .gsloth.config.
- External links (simple public links)
- Editing files
- Improve experience with specs or criteria (or requirements?)
- Should we allow to mention that the data is diff or plain code? Maybe we can somehow deduct it or ask smaller model to guess?
- Slot editing local files
