import { Logger } from './logger'

import { server } from './server/server'

class App {
    private readonly _logger = new Logger(App.name)

    async bootstrap() {
        this.registerFatalErrorHandlers()
        try {
            await server.start()
        } catch (error) {
            this._logger.error("Failed to start server", error)
        }
    }

    registerFatalErrorHandlers() {
        // graceful shutdown
        process.on('SIGTERM', () => {
            this._logger.info('SIGTERM received');
            // TODO: add graceful exit
            process.exit(1)
        });

        process.on('SIGINT', () => {
            this._logger.info('SIGINT received');
            // TODO: add graceful exit
            process.exit(1)
        });

        process.on('unhandledRejection', (reason, promise) => {
            this._logger.error(`Unhandled Rejection:`, promise, `\nReason: ${reason}`);
        });

        process.on('uncaughtException', (err) => {
            this._logger.error('Uncaught Exception:', err);
        });
    }
}
new App().bootstrap()

