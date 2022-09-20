import mongoose from "mongoose";

export enum TransactionsTypes {
    Buy = "Buy",
    Sell = 'Sell',
    Approve = 'Approve'
}

export interface Transaction<T extends TransactionsTypes> {
    type: T
    network: string
    tokenAddress: string
    correlationId: string
    gasUnitUsed: string
    gasPriceInGwei: string
    totalPaidForGasInEth: string
    from: string
    to: string
}

export interface BuyTransaction extends Transaction<TransactionsTypes.Buy> {
    amountIn: string
    amountOut: string
    amountOutMin: string
    source: {
        type: string,
        data: {
            isFirstPump: boolean,
            address: string,
            buySlippage: number,
            sellSlippage: number
        }
    }
}

export interface SellTransaction extends Transaction<TransactionsTypes.Sell> {
    amountIn: string
    amountOut: string
    amountOutMin: string
}

export interface ApproveTransaction extends Transaction<TransactionsTypes.Approve> {
    allowanceAmount: string
}

const options = {
    discriminatorKey: 'kind', timestamps: true
};

const transactionSchema = new mongoose.Schema<Transaction<TransactionsTypes>>({
    // This field is not avaliable in ethers.js
    // const transactionResponse = await this._provider.getTransaction(receipt.transactionHash), can provider: transactionResponse.timeStamp
    // but it's the time of when the entire block was mined, and also its not avaliable on dev env 
    // blockchainTimestamp: Date,
    network: String,
    tokenAddress: String,
    correlationId: String,
    gasUnitUsed: String,
    gasPriceInGwei: String,
    totalPaidForGasInEth: String,
    from: String,
    to: String,
}, options);

const Transaction = mongoose.model('Transaction', transactionSchema);


export const BuyTransactionModel = Transaction.discriminator<BuyTransaction>('Buy',
    new mongoose.Schema({
        amountIn: String,
        amountOut: String,
        amountOutMin: String,
        source: {
            type: { type: String },
            data: {
                isFirstPump: Boolean,
                address: String,
                buySlippage: Number,
                sellSlippage: Number
            }
        }
    }, options));

export const SellTransactionModel = Transaction.discriminator<SellTransaction>('Sell',
    new mongoose.Schema({
        amountIn: String,
        amountOut: String,
        amountOutMin: String,
    }, options));

export const ApproveTransactionModel = Transaction.discriminator<ApproveTransaction>('Approve',
    new mongoose.Schema({
        allowanceAmount: String
    }, options));
