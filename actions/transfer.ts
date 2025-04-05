import { z } from "zod";
import { transfer_funds } from "../tools";
import { parseEther, isAddress } from "viem";

const transferFundsAction = {
  name: "TRANSFER_FUNDS_ACTION",
  similes: [
    "send eth",
    "transfer funds",
    "send money",
    "make a payment",
  ],
  description: `Sends ETH from a specified wallet (managed by this system) to a recipient address on Base Sepolia. Requires the sender's address, recipient's address, and the amount in ETH. The sender's wallet must exist in the system and be funded. Returns the transaction hash on success.`,
  examples: [
    [
      {
        input: {
          fromAddress: "0xSenderAddressManagedBySystem",
          toAddress: "0xRecipientAddress",
          value: "0.01"
        },
        output: {
          status: "success",
          transactionHash: "0xTransactionHashHere",
          fromAddress: "0xSenderAddressManagedBySystem",
          toAddress: "0xRecipientAddress",
          valueSentEther: "0.01",
          estimatedFeeEther: "0.00005"
        },
        explanation: "Successfully initiated the transfer of 0.01 ETH.",
      },
    ],
    [
      {
        input: {
          fromAddress: "0xSenderAddressManagedBySystem",
          toAddress: "0xRecipientAddress",
          value: "100"
        },
        output: {
          status: "error",
          message: "Failed to send transaction: <specific error, e.g., insufficient funds>"
        },
        explanation: "Example of an error during the transfer attempt.",
      },
    ],
  ],
  schema: z.object({
    fromAddress: z.string().refine(isAddress, { message: "Invalid fromAddress format." }),
    toAddress: z.string().refine(isAddress, { message: "Invalid toAddress format." }),
    value: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, { message: "Value must be a positive number string." })
  }),
  handler: async (input: Record<string, any>) => {
    try {
      if (!isAddress(input.fromAddress) || !isAddress(input.toAddress)) {
          throw new Error('Invalid sender or recipient address format provided.');
      }

      const valueInWei = parseEther(input.value);

      const transferDetails = {
          fromAddress: input.fromAddress as `0x${string}`,
          toAddress: input.toAddress as `0x${string}`,
          value: valueInWei
      };

      console.log(`Action: Initiating transfer_funds tool with details:`, transferDetails);
      const result = await transfer_funds(transferDetails);
      console.log(`Action: transfer_funds tool completed successfully.`);

      return {
        status: "success",
        transactionHash: result.transactionHash,
        fromAddress: result.fromAddress,
        toAddress: result.toAddress,
        valueSentEther: result.valueSentEther,
        estimatedFeeEther: result.estimatedFee.estimatedTotalFeeEther
      };
    } catch (error) {
      console.error(`Action Error: Failed during transfer_funds execution:`, error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred during the fund transfer."
      };
    }
  },
};

export default transferFundsAction;