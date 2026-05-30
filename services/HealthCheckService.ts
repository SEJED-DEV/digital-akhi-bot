import http from 'http';
import { client } from '../index.js';
import mongoose from 'mongoose';
import { register } from 'prom-client';
import { Logger } from './Logger.js';
import { getRedis } from '../utils/RedisClient.js';

export class HealthCheckService {
  private static server: http.Server;

  public static start(port: number = 3000) {
    this.server = http.createServer(async (req, res) => {
      if (req.url === '/health') {
        const health = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            redis: (() => {
                try {
                    return getRedis().status === 'ready' ? 'connected' : 'disconnected';
                } catch (e) {
                    return 'error';
                }
            })(),
            discord: client.isReady() ? 'connected' : 'disconnected'
          }
        };

        const isHealthy = health.services.database === 'connected' &&
                          health.services.redis === 'connected' &&
                          health.services.discord === 'connected';

        res.writeHead(isHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
      } else if (req.url === '/metrics') {
        try {
          res.setHeader('Content-Type', register.contentType);
          res.end(await register.metrics());
        } catch (ex) {
          res.writeHead(500);
          res.end(ex instanceof Error ? ex.message : String(ex));
        }
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.server.listen(port, () => {
      Logger.info(`Health check server listening on port ${port}`);
    });
  }

  public static stop() {
      if (this.server) {
          this.server.close();
      }
  }
}
