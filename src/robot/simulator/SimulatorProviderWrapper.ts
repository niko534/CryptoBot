import { ethers, Wallet } from "ethers";
import Ganache from "ganache";
import { ProviderConfig } from "../../config";

const devPrivateKey = '0x38883d0e698ca117552871d989849e10e6bc36a6097de51677166ff646613e1e'

// TODO: Create an interface for ProviderWrappers and use it around the App instead of adding "| SimulatorProviderWrapper" each time
// TODO: Try to use the general provider with special config maybe
export class SimulatorProviderWrapper {
    private readonly _provider: ethers.providers.Web3Provider;
    private readonly _devEnvWallet: Wallet

    constructor(
        private readonly _config: ProviderConfig
    ) {
        const ganache = Ganache.provider({
            fork: {
                url: this._config.nodeEndPoint,
                preLatestConfirmations: 5,
            },
            logging: { quiet: true },
            chain: { vmErrorsOnRPCResponse: true },
            miner: { legacyInstamine: true },
            network_id: 59,
            wallet: {
                accounts: [{
                    secretKey: devPrivateKey,
                    balance: ethers.utils.hexlify(ethers.utils.parseEther('100')) // Populate with Fake ETH because it's a clone, Real Account Has it's own Real ETH Balance
                }]
            }
        });
        this._provider = new ethers.providers.Web3Provider(ganache as any);
        this._devEnvWallet = new ethers.Wallet(devPrivateKey, this._provider)
    }

    get provider() {
        return this._provider;
    }

    get chainId() {
        return this._config.chainId
    }
    get devWallet() {
        return this._devEnvWallet
    }
}