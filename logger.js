const fs = require('fs');
const path = require('path');
require("dotenv").config();

class Logger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.ensureLogDir();
    this.currentDate = this.getToday();
    this.stream = this.createStream();
    setInterval(() => this.rotateIfNeeded(), 60000);
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
  }
  getToday() { return new Date().toISOString().slice(0, 10); }
  createStream() {
    const filePath = path.join(this.logDir, `${this.currentDate}.log`);
    return fs.createWriteStream(filePath, { flags: 'a' });
  }
  rotateIfNeeded() {
    const today = this.getToday();
    if (today !== this.currentDate) {
      this.currentDate = today;
      this.stream.end();
      this.stream = this.createStream();
    }
  }

  writeLog(level, args) {
    this.rotateIfNeeded();
    const timestamp = new Date().toISOString();
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    const line = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    this.stream.write(line);

    // 🔥 THE MAGIC: auto-detects environment
    if (process.env.NODE_ENV !== 'production') {
      const consoleMethod = level === 'error' ? console.error :
                            level === 'warn'  ? console.warn  :
                            level === 'debug' ? console.debug : console.log;
      consoleMethod(`[${level.toUpperCase()}]`, ...args);
    }
  }

  info(...args)  { this.writeLog('info', args); }
  warn(...args)  { this.writeLog('warn', args); }
  error(...args) { this.writeLog('error', args); }
  debug(...args) { this.writeLog('debug', args); }

  close() { this.stream.end(); }
}

const logger = new Logger();
process.on('exit', () => logger.close());
process.on('SIGINT', () => { logger.close(); process.exit(); });
process.on('SIGTERM', () => { logger.close(); process.exit(); });

module.exports = logger;