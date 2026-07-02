"use client"
/*eslint-disable*/

import { useState } from "react"
import { toast } from "sonner"
import { Contract, ethers } from 'ethers'
import { ABI, BYTECODE } from "@/config"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import { Spinner } from "./ui/spinner"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"

// Note: this styling pass assumes the standard shadcn `card`, `separator`,
// and `badge` primitives are already generated in ./ui. If they aren't yet,
// add them with: npx shadcn@latest add card separator badge

export const ContractInteraction = () => {
    const [fetchedName, setFetchedName] = useState<string | null>(null);
    const [newName, setNewName] = useState<string>("");
    const [newSymbol, setNewSymbol] = useState<string>("");
    const [fetchedSymbol, setFetchedSymbol] = useState<string | null>(null);
    const [decimals, setDecimals] = useState<bigint | null>(null);
    const [spender, setSpender] = useState<string | null>(null);
    const [value, setValue] = useState<bigint | null>(null);
    const [totalSupply, setTotalSupply] = useState<bigint | null>(null);
    const [initialSupply, setInitialSupply] = useState<string>("");
    const [contractAddress, setContractAddress] = useState<string>('0x6B1daEb31D7E1Eb02f9984de21B9515735188bF2')

    const [loading, setLoading] = useState<boolean>(false);

    // Reads a contract at a given address. Address is passed explicitly
    // rather than relying on the `contractAddress` state variable, since
    // state updates are async and wouldn't be visible immediately after
    // a fresh deploy in the same function call.
    const readContract = async (addressToRead?: string) => {
        const target = addressToRead ?? contractAddress;

        if (!ethers.isAddress(target)) {
            toast.error("Enter a valid contract address first");
            return;
        }

        try {
            if (!window.ethereum) return 'Metamask not installed!';
            setLoading(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new Contract(
                target,
                ABI,
                provider
            );

            const name = await contract.name();
            const symbol = await contract.symbol();
            const decimalsResult = await contract.decimals();
            const totalSupplyResult = await contract.totalSupply();

            setFetchedName(name);
            setFetchedSymbol(symbol);
            setDecimals(decimalsResult);
            setTotalSupply(totalSupplyResult);
            setContractAddress(target);

            toast.success(`Contract ${target} fetched successfully!`, { position: 'top-center' })

        } catch (error) {
            console.error(error);
            toast.error(`Error. ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const createContract = async () => {
        try {
            if (!window.ethereum) return 'Metamask not installed!';
            if (!newName || !newSymbol) {
                toast.error("Enter a name and symbol first");
                return;
            }
            setLoading(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const factory = new ethers.ContractFactory(
                ABI,
                BYTECODE,
                signer
            );

            const rawSupply = ethers.parseUnits(initialSupply || "0", 18);

            const contract = await factory.deploy(newName, newSymbol, rawSupply);
            console.log("Transaction submitted! Hash: ", contract.deploymentTransaction()?.hash);

            // waiting for the deployment transaction to be mined
            await contract.waitForDeployment();

            const deployedAddress = await contract.getAddress();
            toast.success(`Contract deployed to: ${deployedAddress}`, { position: 'top-center' });

            // pass the fresh address directly instead of relying on state
            await readContract(deployedAddress);

        } catch (error) {
            console.error(error);
            toast.error(`Error. ${error}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen w-full bg-zinc-950 py-16 px-4 text-zinc-100">
            <div className="mx-auto flex w-full max-w-xl flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-zinc-500">
                            ERC-20
                        </span>
                        <h1 className="text-xl font-semibold text-zinc-50">
                            Token Console
                        </h1>
                    </div>
                    <Badge
                        variant="outline"
                        className="gap-1.5 border-zinc-800 bg-zinc-900/60 font-mono text-xs text-zinc-400"
                    >
                        <span
                            className={`h-1.5 w-1.5 rounded-full ${loading
                                ? "animate-pulse bg-amber-400"
                                : "bg-emerald-400"
                                }`}
                        />
                        {loading ? "processing" : "idle"}
                    </Badge>
                </div>

                {/* Deploy card */}
                <Card className="border-zinc-800 bg-zinc-900/40">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Deploy a new token</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Mints the initial supply to your connected wallet on deployment.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="newName" className="text-xs text-zinc-400">
                                    Name
                                </Label>
                                <Input
                                    id="newName"
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Yogesh Token"
                                    className="border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-400/40"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="newSymbol" className="text-xs text-zinc-400">
                                    Symbol
                                </Label>
                                <Input
                                    id="newSymbol"
                                    type="text"
                                    value={newSymbol}
                                    onChange={(e) => setNewSymbol(e.target.value)}
                                    placeholder="YGT"
                                    className="border-zinc-800 bg-zinc-950 font-mono text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-400/40"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="initialSupply" className="text-xs text-zinc-400">
                                Initial supply
                            </Label>
                            <Input
                                id="initialSupply"
                                type="number"
                                value={initialSupply}
                                onChange={(e) => setInitialSupply(e.target.value)}
                                placeholder="1000"
                                className="border-zinc-800 bg-zinc-950 font-mono text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-400/40"
                            />
                        </div>

                        <Button
                            onClick={createContract}
                            disabled={loading}
                            className="w-full bg-cyan-400 text-zinc-950 hover:bg-cyan-300"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Spinner className="h-4 w-4" />
                                    Deploying
                                </span>
                            ) : (
                                "Deploy contract"
                            )}
                        </Button>
                    </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                    <Separator className="flex-1 bg-zinc-800" />
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">
                        or read existing
                    </span>
                    <Separator className="flex-1 bg-zinc-800" />
                </div>

                {/* Read card */}
                <Card className="border-zinc-800 bg-zinc-900/40">
                    <CardHeader>
                        <CardTitle className="text-base text-zinc-100">Read a contract</CardTitle>
                        <CardDescription className="text-zinc-500">
                            Fetch name, symbol, decimals, and total supply from any deployed token.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="contractAddress" className="text-xs text-zinc-400">
                                Contract address
                            </Label>
                            <Input
                                id="contractAddress"
                                type="text"
                                value={contractAddress}
                                onChange={(e) => setContractAddress(e.target.value)}
                                placeholder="0x..."
                                className="border-zinc-800 bg-zinc-950 font-mono text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-cyan-400/40"
                            />
                        </div>

                        <Button
                            onClick={() => readContract()}
                            disabled={loading}
                            variant="outline"
                            className="w-full border-zinc-700 bg-transparent text-zinc-100 hover:bg-zinc-800 hover:text-zinc-50"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Spinner className="h-4 w-4" />
                                    Fetching
                                </span>
                            ) : (
                                "Fetch contract"
                            )}
                        </Button>

                        {fetchedName && (
                            <dl className="mt-1 divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4">
                                <div className="flex items-center justify-between py-3">
                                    <dt className="text-xs text-zinc-500">Name</dt>
                                    <dd className="text-sm text-zinc-100">{fetchedName}</dd>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <dt className="text-xs text-zinc-500">Symbol</dt>
                                    <dd className="font-mono text-sm text-cyan-300">{fetchedSymbol}</dd>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <dt className="text-xs text-zinc-500">Decimals</dt>
                                    <dd className="font-mono text-sm text-zinc-100">{decimals?.toString()}</dd>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <dt className="text-xs text-zinc-500">Total supply</dt>
                                    <dd className="font-mono text-sm text-zinc-100">
                                        {totalSupply !== null && decimals !== null
                                            ? ethers.formatUnits(totalSupply, decimals)
                                            : ""}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between py-3">
                                    <dt className="text-xs text-zinc-500">Address</dt>
                                    <dd className="truncate font-mono text-xs text-zinc-400" title={contractAddress}>
                                        {contractAddress}
                                    </dd>
                                </div>
                            </dl>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

// Extend window type to include ethereum
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