# Background Execution Skill

You have the ability to run long-running terminal commands in the background without blocking the conversation.

## Usage
If the user asks you to start a server, run a large download, compile a large project, or run any process that takes more than a few seconds, use the `run_background_command` tool. 

Once started, the command will continue running even if the user leaves the application. You will not receive stdout or stderr from this command. Make sure the user is aware of this.
