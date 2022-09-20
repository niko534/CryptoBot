import { ethers } from "ethers";
import Ganache from "ganache";
import { Networks, ProviderConfig } from "../config";

export class ProviderWrapper {
    private readonly _provider: ethers.providers.BaseProvider

    constructor(
        private readonly _config: ProviderConfig
    ) {
        switch (this._config.network) {
            case Networks.binanceSmartChain:
                this._provider = new ethers.providers.WebSocketProvider(this._config.nodeEndPoint);
                break

            case Networks.binanceSmartChainDevelopment:
                const ganache = Ganache.provider({
                    fork: {
                        url: this._config.nodeEndPoint,
                        /**
                        * When the `fork.blockNumber` is set to "latest" (default), the number of
                        * blocks before the remote node's "latest" block to fork from.
                         */
                        preLatestConfirmations: 49, // More than 50 is archive mode in the node we are currently using(Quicknode)
                    },
                    logging: {
                        // quiet: true,
                        debug: true,
                        // verbose: true,
                    },
                    // chain + miner must be true in order to recive RpcError reason (e.g Pancakeswap: ISSUFISENT_OUTPUT_AMOUNT...)
                    // but this is bad pratice because on mainnet when a revert happends all the logs are reverted too, so there's no revert reason to catch
                    // what everyone is doing is when a transaction fails they use eth_call (ethers.callStatic) with the same params in order to simulated the tx and get the error message
                    // https://github.com/trufflesuite/ganache/discussions/1075#user-content-v7.0.0-alpha.0-vm-errors-on-rpc-response-now-defaults-to-disabled
                    // https://github.com/ethers-io/ethers.js/issues/368
                    // chain: { vmErrorsOnRPCResponse: true },
                    // miner: { legacyInstamine: true },
                    network_id: 59,
                    // Leaving accounts empty will create 10 default accounts with 100 ETH Each
                    accounts: this._config.devWallets?.map(wallet => ({
                        secretKey: wallet,
                        balance: ethers.utils.hexlify(ethers.utils.parseEther('100')) // Populate with Fake ETH because it's a clone, Real Account Has it's own Real ETH Balance
                    }))
                });

                this._provider = new ethers.providers.Web3Provider(ganache as any);
                break
            default:
                throw new Error("Invalid network");
        }
    }

    get provider() {
        return this._provider;
    }

    get chainId() {
        return this._config.chainId
    }

    get networkName() {
        return this._config.network
    }

}