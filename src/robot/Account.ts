import { ethers } from "ethers";

export class Account {
    constructor(
        private readonly _privateKey: string
    ) { }

    public getwallet(provider: ethers.providers.BaseProvider) {
        return new ethers.Wallet(this._privateKey, provider);
    }
}
