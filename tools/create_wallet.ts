import { generatePrivateKey } from 'viem/accounts'


export function create_wallet(): Promise<any> {
    const privateKey = generatePrivateKey()
  return token_account.value.uiAmount || 0;
}