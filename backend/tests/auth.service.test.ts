import 'mocha';
import { expect } from 'chai';
import bcrypt from 'bcryptjs';
import sinon from 'sinon';
import User from '../src/models/User';
import TokenRevocation from '../src/models/TokenRevocation';
import { ApiError } from '../src/utils/ApiError';
import * as authService from '../src/services/auth.service';

describe('Auth Service (auth.service.ts)', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('register', () => {
        it('should register a new user successfully and return token and public user profile', async () => {
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as any);

            sinon.stub(User, 'create').resolves(mockUser as any);

            const result = await authService.register({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result).to.have.property('token').that.is.a('string');
            expect(result.user).to.deep.equal({
                id: '507f1f77bcf86cd799439011',
                name: 'Test User',
                email: 'test@example.com',
            });
        });

        it('should throw 409 conflict error when email is already registered', async () => {
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves({ _id: '507f1f77bcf86cd799439011' }),
            } as any);

            try {
                await authService.register({
                    name: 'Test User',
                    email: 'existing@example.com',
                    password: 'password123',
                });
                expect.fail('Expected register to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(409);
                expect(err.message).to.equal('Email is already registered');
            }
        });

        it('should throw 400 validation error for invalid email or password too short', async () => {
            try {
                await authService.register({
                    name: 'Test User',
                    email: 'invalid-email',
                    password: 'short',
                });
                expect.fail('Expected register to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(400);
                expect(err.message).to.equal('Invalid email address');
            }
        });

        it('should throw 400 validation error when name is empty', async () => {
            try {
                await authService.register({
                    name: '   ',
                    email: 'test@example.com',
                    password: 'password123',
                });
                expect.fail('Expected register to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(400);
                expect(err.message).to.equal('Name is required');
            }
        });
    });

    describe('login', () => {
        it('should authenticate valid credentials and return token and user profile', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as any);

            const result = await authService.login({
                email: 'test@example.com',
                password: 'password123',
            });

            expect(result.token).to.be.a('string');
            expect(result.user.email).to.equal('test@example.com');
        });

        it('should throw 401 for non-existent user email', async () => {
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(null),
            } as any);

            try {
                await authService.login({
                    email: 'unknown@example.com',
                    password: 'password123',
                });
                expect.fail('Expected login to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
                expect(err.message).to.equal('Invalid email or password');
            }
        });

        it('should throw 401 for incorrect password', async () => {
            const hashedPassword = await bcrypt.hash('realpassword123', 10);
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as any);

            try {
                await authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                });
                expect.fail('Expected login to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
                expect(err.message).to.equal('Invalid email or password');
            }
        });
    });

    describe('logout', () => {
        it('should revoke token and return userId when successful', async () => {
            const userId = '507f1f77bcf86cd799439011';
            const tokenId = 'test-token-uuid';
            const expiresAt = new Date(Date.now() + 3600000);

            sinon.stub(User, 'findById').resolves({ _id: userId } as any);
            sinon.stub(TokenRevocation, 'findOneAndUpdate').returns({
                exec: sinon.stub().resolves({}),
            } as any);

            const result = await authService.logout(userId, tokenId, expiresAt);
            expect(result).to.deep.equal({ userId });
        });

        it('should throw 401 if user does not exist', async () => {
            sinon.stub(User, 'findById').resolves(null);

            try {
                await authService.logout('507f1f77bcf86cd799439011', 'token-id', new Date());
                expect.fail('Expected logout to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
            }
        });
    });

    describe('getAuthenticatedUser', () => {
        it('should return public user profile when user exists', async () => {
            const mockUser = {
                _id: { toString: () => '507f1f77bcf86cd799439011' },
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findById').resolves(mockUser as any);

            const user = await authService.getAuthenticatedUser('507f1f77bcf86cd799439011');
            expect(user).to.deep.equal({
                id: '507f1f77bcf86cd799439011',
                email: 'test@example.com',
                name: 'Test User',
            });
        });

        it('should throw 401 when user is not found', async () => {
            sinon.stub(User, 'findById').resolves(null);

            try {
                await authService.getAuthenticatedUser('507f1f77bcf86cd799439011');
                expect.fail('Expected getAuthenticatedUser to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
            }
        });
    });
});
