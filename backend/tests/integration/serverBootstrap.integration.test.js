const assert = require('assert');
const app = require('../../src/server');

console.log('====================================================');
console.log('RUNNING PHASE 2 - SERVER BOOTSTRAP & ERROR DISCIPLINE TESTS');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

async function test(desc, fn) {
    try {
        await fn();
        console.log(`  ✓ ${desc}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${desc}`);
        console.error(`    Error: ${err.message}`);
        failed++;
    }
}

// Minimal mock request/response helper to test Express middlewares & handlers
function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = {} } = {}) {
    const req = {
        method,
        url,
        originalUrl: url,
        headers: { ...headers },
        header(name) {
            return this.headers[name.toLowerCase()] || this.headers[name];
        },
        body
    };

    const res = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) { this.headers[k] = v; },
        getHeader(k) { return this.headers[k]; },
        status(code) { this.statusCode = code; return this; },
        jsonPayload: null,
        json(data) { this.jsonPayload = data; return this; },
        send(data) { this.jsonPayload = data; return this; }
    };

    return { req, res };
}

async function runPhase2Tests() {
    // 1. Request ID Middleware
    await test('requestId middleware assigns unique UUID and sets X-Request-ID header', async () => {
        const requestIdMiddleware = require('../../src/middleware/requestId');
        const { req, res } = createMockReqRes();

        requestIdMiddleware(req, res, () => {});

        assert.ok(req.id, 'req.id must be set');
        assert.ok(res.headers['X-Request-ID'], 'X-Request-ID response header must be set');
        assert.strictEqual(req.id, res.headers['X-Request-ID']);
    });

    // 2. Structured Error Handler
    await test('errorHandler middleware formats consistent error shape with requestId', async () => {
        const { errorHandler, AppError } = require('../../src/middleware/errorHandler');
        const { req, res } = createMockReqRes({ url: '/api/test-error' });
        req.id = 'req-test-uuid-1234';

        const error = new AppError('Invalid parameter format', 400, 'VALIDATION_ERROR', [{ field: 'email', issue: 'invalid' }]);
        errorHandler(error, req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonPayload.success, false);
        assert.strictEqual(res.jsonPayload.code, 'VALIDATION_ERROR');
        assert.strictEqual(res.jsonPayload.message, 'Invalid parameter format');
        assert.strictEqual(res.jsonPayload.requestId, 'req-test-uuid-1234');
        assert.ok(res.jsonPayload.fieldErrors, 'fieldErrors must be present');
    });

    // 3. Unhandled 500 error sanitization
    await test('errorHandler masks unhandled 500 error messages in production mode', async () => {
        const oldEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const { errorHandler } = require('../../src/middleware/errorHandler');
        const { req, res } = createMockReqRes({ url: '/api/unexpected' });
        req.id = 'req-500-test';

        const rawErr = new Error('Database password leak or connection string failure');
        errorHandler(rawErr, req, res, () => {});

        process.env.NODE_ENV = oldEnv;

        assert.strictEqual(res.statusCode, 500);
        assert.strictEqual(res.jsonPayload.success, false);
        assert.ok(!res.jsonPayload.message.includes('password leak'), 'Must not leak sensitive error in production');
        assert.strictEqual(res.jsonPayload.requestId, 'req-500-test');
    });

    console.log('\n----------------------------------------------------');
    console.log(`TOTAL PHASE 2 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('----------------------------------------------------');

    if (failed > 0) process.exit(1);
    else process.exit(0);
}

runPhase2Tests();
