# UX Research

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
  -f, --file <file>  Input file. Context of this file will be added BEFORE the
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
