import mongoose from "mongoose";
import { ApproveTransaction, ApproveTransactionModel, BuyTransaction, BuyTransactionModel, SellTransaction, SellTransactionModel, TransactionsTypes } from "../models/TransactionModel";
import { GeneralRepoActionResult, ICreationRepo, IRepo } from "./IRepo";

export type Transactions = BuyTransaction | SellTransaction | ApproveTransaction

export interface ITransactionsRepo extends ICreationRepo<Transactions> {
    create(transactionToCreate: Transactions): Promise<GeneralRepoActionResult<Transactions>>
}

export class TransactionsRepo implements ITransactionsRepo {
    // Is there a way to use mongoose.Model<Transactions> insted of the | | | ?
    private models: Record<TransactionsTypes, mongoose.Model<BuyTransaction> | mongoose.Model<SellTransaction> | mongoose.Model<ApproveTransaction>>

    constructor(
    ) {
        this.models = {
            [TransactionsTypes.Buy]: BuyTransactionModel,
            [TransactionsTypes.Sell]: SellTransactionModel,
            [TransactionsTypes.Approve]: ApproveTransactionModel,
        }
    }

    async create(transactionToCreate: Transactions): Promise<GeneralRepoActionResult<Transactions>> {
        try {
            const result = await this.models[transactionToCreate.type].create(transactionToCreate);
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err };
        }
    }
}

