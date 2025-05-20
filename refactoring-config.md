# Refactoring config

First of all read .gsloth.guidelines.md

Intent of this refactoring is to replace global mutable SlothContext with "attribute drilling" of configuration object.

- remove reset funciton from config.ts
- remove sloth context
- refactor initConfig function to return promise with config object itself
- create `{ configurable: { thread_id: uuidv4() } }` session and propagate it from commands to modules where they expect session.
- find all remaining uses of slothContext and propagate config as appropriate
- remove leftovers of sloth context from tests, remove reset function and replace it with initialization of new config

Don't forget to follow Development Workflow from .gsloth.guidelines.md