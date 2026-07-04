// Extend window type to include ethereum
export { };

declare global {
    interface Window {
        ethereum?: {
            isMetaMask?: boolean;

            request: (args: RequestArguments) => Promise<unknown>;

            on(event: 'accountsChanged', callback: (accounts: string[]) => void): void;
            on(event: 'chainChanged', callback: (chainId: string) => void): void;
            on(event: 'disconnect', callback: (error: { code: number; message: string }) => void): void;

            removeListener(event: 'accountsChanged', callback: (accounts: string[]) => void): void;
            removeListener(event: 'chainChanged', callback: (chainId: string) => void): void;
            removeListener(event: 'disconnect', callback: (error: { code: number; message: string }) => void): void;
        };
    }
}

interface RequestArguments {
    method: 'eth_accounts' | 'eth_requestAccounts' | 'eth_chainId' | 'eth_getBalance';
    params?: unknown[];
}