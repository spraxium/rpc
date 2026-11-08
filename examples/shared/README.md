# Shared environment settings

[ExampleEnvironment](environment.service.js) reads required variables and validates the HTTP port used by the JavaScript examples. It has no framework dependency.

Each project loads the root `.env` through its Node start command. Shell variables take precedence. The bot owns the method schemas; backends call the same `guild.stats` contract without importing bot code.
