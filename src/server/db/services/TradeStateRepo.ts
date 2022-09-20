import mongoose from "mongoose";
import { TradeState } from "../models/TradeStateModel";
import { BooleanRepoActionResult, GeneralRepoActionResult, ICreationRepo, IRepo } from "./IRepo";

export interface ITradeStateRepo<TStateData> extends IRepo<TradeState<TStateData>>, ICreationRepo<TradeState<TStateData>> {
    findActiveTrades(): Promise<GeneralRepoActionResult<TradeState<TStateData>[]>>
}

//TODO: Add retry mechanism
export class TradeStateRepo<TStateData> implements ITradeStateRepo<TStateData> {
    constructor(
        private readonly model: mongoose.Model<TradeState<TStateData>>
    ) {
    }

    public async create(tradeToCreate: TradeState<TStateData>): Promise<GeneralRepoActionResult<TradeState<TStateData>>> {
        try {
            //TODO: Add index to isActive field
            const result = await this.model.create(tradeToCreate);
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err };
        }
    }

    public async deleteById(id: mongoose.ObjectId): Promise<BooleanRepoActionResult> {
        try {
            await this.model.findByIdAndDelete(id).exec();
            return { success: true };
        } catch (err) {
            return { success: false, error: err };
        }
    }

    public async findActiveTrades(): Promise<GeneralRepoActionResult<TradeState<TStateData>[]>> {
        try {
            const result = await this.model.find({ isActive: true }).limit(100).exec();
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err };
        }
    }

    public async update(id: mongoose.ObjectId, body: TradeState<TStateData>): Promise<GeneralRepoActionResult<TradeState<TStateData>>> {
        try {
            const result = await this.model.findByIdAndUpdate(id, body, { new: true, lean: true })
            if (result === null) {
                return { success: false, error: `Failed to find document with id ${id}` }
            }
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err };
        }
    }

    public async dropAllDocuments(): Promise<BooleanRepoActionResult> {
        try {
            await this.model.deleteMany({})
            return { success: true }
        } catch (error) {
            return { success: false, error }
        }
    }

}

