import 'mocha';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import sinon from 'sinon';
import { env } from '../src/config/env';
import TokenRevocation from '../src/models/TokenRevocation';
import { ApiError } from '../src/utils/ApiError';
import { signAuthToken, verifyAuthToken } from '../src/utils/jwt';

describe('JWT Utility (jwt.ts)', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('signAuthToken', () => {
        it('should generate a valid JWT string containing userId (sub) and random UUID (jti)', () => {
            const userId = '507f1f77bcf86cd799439011';
            const token = signAuthToken(userId);

            expect(token).to.be.a('string');

            const decoded = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
            expect(decoded.sub).to.equal(userId);
            expect(decoded.jti).to.be.a('string').that.is.not.empty;
        });
    });

    describe('verifyAuthToken', () => {
        it('should verify and return the token payload for a valid, non-revoked token', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const token = signAuthToken(userId);

            const findOneStub = sinon.stub(TokenRevocation, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);

            const payload = await verifyAuthToken(token);
            expect(payload.sub).to.equal(userId);
            expect(payload.jti).to.be.a('string');
            expect(findOneStub.calledOnce).to.be.true;
        });

        it('should throw ApiError with 401 status for malformed or invalid tokens', async () => {
            try {
                await verifyAuthToken('invalid.token.string');
                expect.fail('Expected verifyAuthToken to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
                expect(err.message).to.equal('Invalid or expired authentication token');
            }
        });

        it('should throw ApiError when token payload is missing required sub or jti fields', async () => {
            const invalidPayloadToken = jwt.sign({ foo: 'bar' }, env.jwtSecret);

            try {
                await verifyAuthToken(invalidPayloadToken);
                expect.fail('Expected verifyAuthToken to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
                expect(err.message).to.equal('Invalid authentication token payload');
            }
        });

        it('should throw ApiError with 401 when the token has been revoked', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const token = signAuthToken(userId);

            sinon.stub(TokenRevocation, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves({ _id: 'revoked_id' }),
            } as any);

            try {
                await verifyAuthToken(token);
                expect.fail('Expected verifyAuthToken to throw for revoked token');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
                expect(err.message).to.equal('Authentication token revoked');
            }
        });
    });
});
