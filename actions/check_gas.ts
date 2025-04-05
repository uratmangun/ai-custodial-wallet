import { z } from "zod";
import { estimate_transaction_fee } from "../tools";
import { parseEther, isAddress, type Address, isHex } from "viem";

const checkGasAction = {
  name: "CHECK_GAS_ACTION",
  similes: [
    "estimate tx cost",
    "calculate transaction fee",
    "how much gas for this send",
    "get fee estimate for transfer",
    "estimate contract call gas",
  ],
  description: `Estimates the gas fee for a specific hypothetical transaction on Base Sepolia. Requires sender address, recipient address, and the amount in ETH. Optionally accepts transaction data (hex string starting with 0x) for smart contract interactions. Returns detailed fee estimates including gas units and total cost in ETH/wei.`,
  examples: [
    [
      {
        input: {
          fromAddress: "0xSenderAddress",
          toAddress: "0xRecipientAddress",
          value: "0.05"
        },
        output: {
          status: "success",
          maxFeePerGas: "1000000000",
          maxFeePerGasGwei: "1",
          maxPriorityFeePerGas: "100000000",
          maxPriorityFeePerGasGwei: "0.1",
          estimatedGasUnits: "21000",
          estimatedTotalFeeWei: "21000000000000",
          estimatedTotalFeeEther: "0.000021"
        },
        explanation: "Successfully estimated the fee for sending 0.05 ETH.",
      },
    ],
    [
      {
        input: {
          fromAddress: "0xSenderAddress",
          toAddress: "0xContractAddress",
          value: "0",
          data: "0xa9059cbb000000000000000000000000ReceiverAddress000000000000000000000001"
        },
        output: {
          status: "success",
          maxFeePerGas: "1000000000",
          maxFeePerGasGwei: "1",
          maxPriorityFeePerGas: "100000000",
          maxPriorityFeePerGasGwei: "0.1",
          estimatedGasUnits: "55000",
          estimatedTotalFeeWei: "55000000000000",
          estimatedTotalFeeEther: "0.000055"
        },
        explanation: "Successfully estimated the fee for a contract interaction (e.g., ERC20 transfer).",
      },
    ],
    [
      {
        input: {
          fromAddress: "0xInvalidAddress",
          toAddress: "0xRecipientAddress",
          value: "0.1"
        },
        output: {
          status: "error",
          message: "Invalid fromAddress format."
        },
        explanation: "Example of an error due to invalid input or estimation failure.",
      },
    ],
  ],
  schema: z.object({
    fromAddress: z.string().refine(isAddress, { message: "Invalid fromAddress format." }),
    toAddress: z.string().refine(isAddress, { message: "Invalid toAddress format." }),
    value: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, { message: "Value must be a non-negative number string." }),
    data: z.string().optional().refine((val) => val === undefined || isHex(val, { strict: true }), {
        message: "Data must be a valid hex string starting with 0x."
    })
  }),
  handler: async (input: Record<string, any>) => {
    try {
      const valueInWei = parseEther(input.value);

      const txDetails = {
        account: input.fromAddress as Address,
        to: input.toAddress as Address,
        value: valueInWei,
        data: input.data as `0x${string}` | undefined
      };

      console.log(`Action: Initiating estimate_transaction_fee tool with details:`, txDetails);
      const feeEstimateResult = await estimate_transaction_fee(txDetails);
      console.log(`Action: estimate_transaction_fee tool completed successfully.`);

      return {
        status: "success",
        ...feeEstimateResult
      };
    } catch (error) {
      console.error(`Action Error: Failed during estimate_transaction_fee execution:`, error);
      return {
        status: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred during fee estimation."
      };
    }
  },
};

export default checkGasAction;