import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// Create server instance
const server = new McpServer({
  name: "ai-custodial-wallet",
  version: "1.0.0",
  capabilities: {
    
  },
});

server.tool(
  "GET_FORECAST",
  "Get weather forecast for a location",
  {
    random_string: z.string().optional().describe("Dummy parameter for no-parameter tools")
  },
  async ({random_string}) => {
    // Mock weather forecast response
    return {
      content: [
        {
          type: "text",
          text: `Current Weather Forecast:
Temperature: 22°C
Condition: Partly cloudy
Humidity: 65%
Wind: 10 km/h`,
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});