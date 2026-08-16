import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  use(request: any, response: any, next: () => void) {
    const requestId = randomUUID();
    const startedAt = Date.now();
    response.setHeader('X-Request-Id', requestId);

    response.on('finish', () => {
      const entry = {
        level: 'info',
        event: 'http_request',
        requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
        ...(request.user?.sub ? { userId: request.user.sub } : {}),
      };
      process.stdout.write(`${JSON.stringify(entry)}\n`);
    });

    next();
  }
}
