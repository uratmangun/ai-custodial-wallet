export function createMcpServer(
    actions: Record<string, Action>,
    solanaAgentKit: SolanaAgentKit,
    options: {
      name: string;
      version: string;
    },
  ) {
    // Create MCP server instance
    const server = new McpServer({
      name: options.name,
      version: options.version,
    });
  
    // Convert each action to an MCP tool
    for (const [_key, action] of Object.entries(actions)) {
      const { result } = zodToMCPShape(action.schema);
      server.tool(action.name, action.description, result, async (params) => {
        try {
          // Execute the action handler with the params directly
          const result = await action.handler(solanaAgentKit, params);
  
          // Format the result as MCP tool response
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        } catch (error) {
          console.error("error", error);
          // Handle errors in MCP format
          return {
            isError: true,
            content: [
              {
                type: "text",
                text:
                  error instanceof Error
                    ? error.message
                    : "Unknown error occurred",
              },
            ],
          };
        }
      });
  
      // Add examples as prompts if they exist
      if (action.examples && action.examples.length > 0) {
        server.prompt(
          `${action.name}-examples`,
          {
            showIndex: z
              .string()
              .optional()
              .describe("Example index to show (number)"),
          },
          (args) => {
            const showIndex = args.showIndex
              ? parseInt(args.showIndex)
              : undefined;
            const examples = action.examples.flat();
            const selectedExamples =
              typeof showIndex === "number" ? [examples[showIndex]] : examples;
  
            const exampleText = selectedExamples
              .map(
                (ex, idx) => `
  Example ${idx + 1}:
  Input: ${JSON.stringify(ex.input, null, 2)}
  Output: ${JSON.stringify(ex.output, null, 2)}
  Explanation: ${ex.explanation}
              `,
              )
              .join("\n");
  
            return {
              messages: [
                {
                  role: "user",
                  content: {
                    type: "text",
                    text: `Examples for ${action.name}:\n${exampleText}`,
                  },
                },
              ],
            };
          },
        );
      }
    }
  
    return server;
  }