import cors from 'cors';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import rTracer from 'cls-rtracer'

import { config } from '../config';
import { Logger } from '../logger';
import { RobotState } from '../robot/Robot';
import { TradeAlertsManager, TradeAlertsTelegramBot } from '../trade-alerts';
import { EmergencyController } from './controllers/EmergencyController';
import { RobotController } from './controllers/RobotController';
import { TestHelpersController } from './controllers/TestHelpersController';
import { TradeStateModel } from './db/models/TradeStateModel';
import { ITradeStateRepo, TradeStateRepo } from './db/services/TradeStateRepo';
import { ITransactionsRepo, TransactionsRepo } from './db/services/TransactionsRepo';
import { errorHandler } from './middlewares';
import { ResumeTradesService } from './services/ResumeTradesService';
import { safeControllerWrapper } from './utils'


const databaseURL: string = `mongodb://localhost:27017/robot-${process.env.NODE_ENV}` // TODO: move to config

class Server {
    private _logger = new Logger(Server.name)
    private _tradeStateRepo!: ITradeStateRepo<RobotState>
    private _transactionsRepo!: ITransactionsRepo
    private _tradesAlertManager!: TradeAlertsManager

    public async start() {
        try {
            //TODO: Handle disconnection
            const mongoConnection = await mongoose.connect(databaseURL)
            const app = express()

            //Middleware
            app.use(express.json())
            app.use(cors())
            app.use(rTracer.expressMiddleware())

            this._tradeStateRepo = new TradeStateRepo(TradeStateModel)
            this._transactionsRepo = new TransactionsRepo()
            const telegramAlerts = new TradeAlertsTelegramBot(config.tradeAlerts.telegramBot.botToken, config.tradeAlerts.telegramBot.alertsGroupChatId)
            this._tradesAlertManager = new TradeAlertsManager([telegramAlerts])

            if (config.common.env === 'dev') {
                this.setupDevMethods(app)
            }

            // TODO: Move to a seperate file
            this.setupEmergencyController(app)
            this.setupRobotController(app)

            app.use(errorHandler)

            // Start application
            app.listen(config.server.port, async () => {
                this._logger.info(`Express running, now listening on port ${config.server.port}`)
                this._logger.info(`Server is running with the following config ${JSON.stringify(config)}`)

                if (config.common.env !== 'dev') {
                    this._logger.info('Server is up and running in non dev env, resuming active trades')
                    await this.resumeActiveTrades()
                    this._logger.info('Active trades resumed successfully')
                } else {
                    this._logger.info('Running in dev env, not resuming active trades')
                }
            })
        } catch (e) {
            this._logger.error(e)
            throw e
        }
    }

    private async setupDevMethods(app: Application) {
        const testHelperController = new TestHelpersController(config.robot, config.provider, this._tradeStateRepo, this._transactionsRepo, this._tradesAlertManager)

        app.post('/dev', safeControllerWrapper(testHelperController.onDataReceivedDev.bind(testHelperController)))
        app.post('/dev/resume', safeControllerWrapper(testHelperController.onTestResume.bind(testHelperController)))
        app.post('/dev/dropOldTrades', safeControllerWrapper(testHelperController.dropOldTrades.bind(testHelperController)))
    }

    //TODO: Change to Admin instead of Emergency
    private async setupEmergencyController(app: Application) {
        app.post('/emergency/resumeTrade/:id', safeControllerWrapper((req, res, next) => {
            const emergencyController = new EmergencyController(config.robot, config.provider, this._tradeStateRepo, this._transactionsRepo, this._tradesAlertManager)
            return emergencyController.resumeTrade(req, res, next)
        }))
    }

    private async setupRobotController(app: Application) {
        app.post('/robot', safeControllerWrapper(async (req, res, next) => {
            const robotController = new RobotController(config.robot, config.provider, this._tradeStateRepo, this._transactionsRepo, this._tradesAlertManager)
            return robotController.runRobot(req, res, next)
        }))
    }

    private async resumeActiveTrades() {
        const resumeTradesService = new ResumeTradesService(config.robot, config.provider, this._tradeStateRepo, this._transactionsRepo, this._tradesAlertManager)
        await resumeTradesService.resumeActiveTrades()
    }
}

export const server = new Server()
