import mongoose, { Document } from "mongoose";
import { RobotState } from "../../../robot/Robot";

export enum RobotTypes {
    BestRobot = 'BestRobot'
}

//TODO: Add auto timestamp
export interface TradeState<TStateData> extends Document {
    _id: mongoose.Types.ObjectId,
    isActive: boolean // To Index
    correlationId: string
    address: string,
    network: string
    walletInfo: {
        address: string
        nickname: string
    }
    state: {
        type: RobotTypes
        data: TStateData
    }
}

const robotTradeStateSchema: mongoose.Schema<TradeState<RobotState>> = new mongoose.Schema({
    isActive: Boolean,
    correlationId: String,
    address: String,
    network: String,
    walletInfo: {
        address: String,
        nickname: String
    },
    state: {
        type: String,
        data: {
            isApproved: Boolean,
            tokenAmountBought: String,
            profitTargetInEth: String,
            sellSlippage: Number,
            deadline: Date, //TODO: Add deadline
            stoplossPrice: String, //TODO: Add stoploss
        }
    }
},
    {
        timestamps: true,
        typeKey: '$type'
    });

export const TradeStateModel = mongoose.model('TradeState', robotTradeStateSchema)

