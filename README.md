# @uratmangun/ai-custodial-wallet

A secure custodial wallet service that can be used with MCP (Model Context Protocol) server.

## Installation

To install dependencies:

```bash
bun install
```

## Configuration

1. First, generate a secret key for encryption:

```bash
bun run tools/generate-secret.ts
```

2. The tool will output something like:
```
Generated SECRET:
<your-generated-secret>

Please add this to your .env file as:
SECRET=<your-generated-secret>
```


## Usage

### Claude Desktop MCP Configuration

To use this wallet service with Claude Desktop MCP, you need to configure it in the MCP settings:

1. Open Claude Desktop
2. Go to Settings > MCP Servers
3. Add a new MCP server with the following configuration:

```json
{
  "mcpServers": {
    "ai-custodial-wallet": {
      "command": "bun",
      "args": ["run", "/path/to/your/ai-custodial-wallet/index.ts"],
      "env": {
        "SECRET": "<your-generated-secret>"
      }
    }
  }
}
```

Replace `/path/to/your/ai-custodial-wallet` with the actual path to your project directory.

### Cursor MCP Configuration

If you're using Cursor IDE, you can configure the MCP server in the settings:

1. Open Cursor settings
2. Navigate to the MCP configuration section
3. Add the following configuration:

```json
{
  "mcpServers": {
    "ai-custodial-wallet": {
      "command": "bun",
      "args": ["run", "/path/to/your/ai-custodial-wallet/index.ts"],
      "env": {
        "SECRET": "<your-generated-secret>"
      }
    }
  }
}
```

This project was created using `bun init` in bun v1.1.43. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
