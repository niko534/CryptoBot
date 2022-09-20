import rTracer from 'cls-rtracer'
import winston from 'winston'
import { StreamTransportInstance } from 'winston/lib/winston/transports'
import { TransformableInfo } from 'logform'
import { config } from '../config'

export class Logger {
    private _logger: winston.Logger
    private consoleTransport = new winston.transports.Console({
        format: winston.format.colorize({ all: true })
    })
    private fileTransport = new winston.transports.File({
        filename: `${config.logger.appName}${`-${process.env.NODE_ENV}` || ''}.log`,
        dirname: config.logger.dir,
        maxsize: 1000000 // 1 MB
    })

    constructor(label: string) {
        if (winston.loggers.has(label)) {
            this._logger = winston.loggers.get(label)
            return
        }

        let logLevel = 'debug'
        const logTransports: StreamTransportInstance[] = [this.consoleTransport]

        if (process.env.NODE_ENV === 'production') {
            logLevel = 'info'
            logTransports.push(this.fileTransport)
        }

        this._logger = winston.loggers.add(label, {
            level: logLevel,
            transports: logTransports,
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                // winston.format.splat(),
                winston.format.errors({ stack: true }),
                winston.format.label({ label }),
                winston.format.printf(this.logFormat.bind(this))
            )
        })
    }

    private metaFormat(meta: any): string {
        const splat: any[] | undefined = meta[Symbol.for('splat')]
        if (!splat) return ''

        return splat.reduce((resultMessage: string, curr: any) => {
            return `${resultMessage} ${typeof curr === 'object' ? JSON.stringify(curr) : curr}`
        }, '')
    }

    private logFormat({ message, stack, timestamp, level, label, ...meta }: TransformableInfo): string {
        message = typeof message === 'object' ? JSON.stringify(message) : message
        message = stack ? `${message} -- ${stack}` : message
        const cid = rTracer.id()
        const cidFormat = cid ? `[correlationId: ${cid}] ` : ''
        return `[${timestamp}] [${level.toUpperCase()}] [${label}] ${cidFormat}>>>> ${message} ${this.metaFormat(meta)}`
    }

    public debug(message: any, ...meta: any[]) {
        this._logger.debug(message, ...meta)
    }

    public info(message: any, ...meta: any[]) {
        this._logger.info(message, ...meta)
    }

    public error(message: any, ...meta: any[]) {
        this._logger.error(message, ...meta)
    }

    public warn(message: any, ...meta: any[]) {
        this._logger.warn(message, ...meta)
    }
}
