import { z } from "zod";
import { generate_secret } from "../tools";

const generateSecretAction = {
  name: "GENERATE_SECRET_ACTION",
  similes: [
    "generate secret",
    "generate secret key",
    
  ],
  description: `Generate a new secret key.`,
  examples: [
    [
      {
        input: {},
        output: {
          status: "success",
          secret: "dasdasasdasdasdasasdd",
          createdAt: "2021-01-01T00:00:00.000Z"
        },
        explanation: "Generate a new secret key",
      },
    ],
   
  ],
  schema: z.object({

  }),
  handler: async (input: Record<string, any>) => {
    const secret = generate_secret();

    return {
      status: "success",
     ...secret
    };
  },
};

export default generateSecretAction;