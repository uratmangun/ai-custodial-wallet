import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";



// Define the raw shape type that MCP tools expect
export type MCPSchemaShape = {
  [key: string]: z.ZodType<any>;
};

// Type guards for Zod schema types
function isZodOptional(schema: z.ZodTypeAny): schema is z.ZodOptional<any> {
  return schema instanceof z.ZodOptional;
}

function isZodObject(schema: z.ZodTypeAny): schema is z.ZodObject<any> {
  // Check both instanceof and the typeName property
  return (
    schema instanceof z.ZodObject || schema?._def?.typeName === "ZodObject"
  );
}

/**
 * Converts a Zod object schema to a flat shape for MCP tools
 * @param schema The Zod schema to convert
 * @returns A flattened schema shape compatible with MCP tools
 * @throws Error if the schema is not an object type
 */
export function zodToMCPShape(schema: z.ZodTypeAny): {
  result: MCPSchemaShape;
  keys: string[];
} {
  if (!isZodObject(schema)) {
    throw new Error("MCP tools require an object schema at the top level");
  }

  const shape = schema.shape;
  const result: MCPSchemaShape = {};

  for (const [key, value] of Object.entries(shape)) {
    result[key] = isZodOptional(value as any) ? (value as any).unwrap() : value;
  }

  return {
    result,
    keys: Object.keys(result),
  };
}


interface ActionExample {
  input: Record<string, any>;
  output: Record<string, any>;
  explanation: string;
}

interface Action {
  name: string;
  similes?: string[];
  description: string;
  examples?: ActionExample[][];
  schema: z.ZodType;
  handler: (params: Record<string, any>) => Promise<any>;
}

export function createMcpServer(
   server: McpServer,
   actions: Record<string, Action>
  ) {
  
  
    // Convert each action to an MCP tool
    for (const [_key, action] of Object.entries(actions)) {
      const { result } = zodToMCPShape(action.schema);
      server.tool(action.name, action.description, result, async (params:any) => {
        try {
          // Execute the action handler with the params directly
          const result = await action.handler(params);
  
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
            const examples = action.examples?.flat() ?? [];
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