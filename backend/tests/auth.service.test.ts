import 'mocha';
import { expect } from 'chai';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import sinon from 'sinon';
import User, { type PublicUser, type UserDocument } from '../src/models/User';
import TokenRevocation from '../src/models/TokenRevocation';
import { ApiError } from '../src/utils/ApiError';
import * as authService from '../src/services/auth.service';

describe('Auth Service (auth.service.ts)', () => {
    const validUserId = new Types.ObjectId('507f1f77bcf86cd799439011');

    afterEach(() => {
        sinon.restore();
    });

    describe('register', () => {
        it('should register a new user successfully and return token and public user profile', async () => {
            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof User.findOne>);

            const createStub = sinon.stub(User, 'create') as unknown as sinon.SinonStub<[unknown], Promise<UserDocument>>;
            createStub.resolves(mockUser as unknown as UserDocument);

            let result: authService.AuthResult;
            try {
                result = await authService.register({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123',
                });
            } catch (err: unknown) {
                expect.fail(`authService.register rejected unexpectedly: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(result).to.have.property('token').that.is.a('string');
            expect(result.user).to.deep.equal({
                id: validUserId.toString(),
                name: 'Test User',
                email: 'test@example.com',
            });
        });

        it('should throw 409 conflict error when email is already registered', async () => {
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().returnsThis(),
                lean: sinon.stub().resolves({ _id: validUserId }),
            } as unknown as ReturnType<typeof User.findOne>);

            try {
                await authService.register({
                    name: 'Test User',
                    email: 'existing@example.com',
                    password: 'password123',
                });
                expect.fail('Expected register to throw ApiError');
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(409);
                    expect(err.message).to.equal('Email is already registered');
                }
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
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(400);
                    expect(err.message).to.equal('Invalid email address');
                }
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
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(400);
                    expect(err.message).to.equal('Name is required');
                }
            }
        });
    });

    describe('login', () => {
        it('should authenticate valid credentials and return token and user profile', async () => {
            let hashedPassword = '';
            try {
                hashedPassword = await bcrypt.hash('password123', 10);
            } catch (error) {
                throw new Error('Failed to hash password during authentication test setup', {
                    cause: error,
                });
            }

            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as unknown as ReturnType<typeof User.findOne>);

            let result: authService.AuthResult;
            try {
                result = await authService.login({
                    email: 'test@example.com',
                    password: 'password123',
                });
            } catch (err: unknown) {
                expect.fail(`authService.login rejected unexpectedly: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(result.token).to.be.a('string');
            expect(result.user.email).to.equal('test@example.com');
        });

        it('should throw 401 for non-existent user email', async () => {
            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(null),
            } as unknown as ReturnType<typeof User.findOne>);

            try {
                await authService.login({
                    email: 'unknown@example.com',
                    password: 'password123',
                });
                expect.fail('Expected login to throw ApiError');
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(401);
                    expect(err.message).to.equal('Invalid email or password');
                }
            }
        });

        it('should throw 401 for incorrect password', async () => {
            let hashedPassword = '';
            try {
                hashedPassword = await bcrypt.hash('realpassword123', 10);
            } catch (error) {
                throw new Error('Failed to hash password during authentication test setup', {
                    cause: error,
                });
            }

            const mockUser = {
                _id: validUserId,
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
                password: hashedPassword,
            };

            sinon.stub(User, 'findOne').returns({
                select: sinon.stub().resolves(mockUser),
            } as unknown as ReturnType<typeof User.findOne>);

            try {
                await authService.login({
                    email: 'test@example.com',
                    password: 'wrongpassword',
                });
                expect.fail('Expected login to throw ApiError');
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(401);
                    expect(err.message).to.equal('Invalid email or password');
                }
            }
        });
    });

    describe('logout', () => {
        it('should revoke token and return userId when successful', async () => {
            const userId = validUserId.toString();
            const tokenId = 'test-token-uuid';
            const expiresAt = new Date(Date.now() + 3600000);

            sinon.stub(User, 'findById').resolves({ _id: validUserId } as unknown as UserDocument);
            sinon.stub(TokenRevocation, 'findOneAndUpdate').returns({
                exec: sinon.stub().resolves({}),
            } as unknown as ReturnType<typeof TokenRevocation.findOneAndUpdate>);

            let result: { readonly userId: string };
            try {
                result = await authService.logout(userId, tokenId, expiresAt);
            } catch (err: unknown) {
                expect.fail(`authService.logout rejected unexpectedly: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(result).to.deep.equal({ userId });
        });

        it('should throw 401 if user does not exist', async () => {
            sinon.stub(User, 'findById').resolves(null);

            try {
                await authService.logout(validUserId.toString(), 'token-id', new Date());
                expect.fail('Expected logout to throw');
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(401);
                }
            }
        });
    });

    describe('getAuthenticatedUser', () => {
        it('should return public user profile when user exists', async () => {
            const mockUser = {
                _id: validUserId,
                email: 'test@example.com',
                name: 'Test User',
            };

            sinon.stub(User, 'findById').resolves(mockUser as unknown as UserDocument);

            let user: PublicUser;
            try {
                user = await authService.getAuthenticatedUser(validUserId.toString());
            } catch (err: unknown) {
                expect.fail(`authService.getAuthenticatedUser rejected unexpectedly: ${err instanceof Error ? err.message : String(err)}`);
            }

            expect(user).to.deep.equal({
                id: validUserId.toString(),
                email: 'test@example.com',
                name: 'Test User',
            });
        });

        it('should throw 401 when user is not found', async () => {
            sinon.stub(User, 'findById').resolves(null);

            try {
                await authService.getAuthenticatedUser(validUserId.toString());
                expect.fail('Expected getAuthenticatedUser to throw');
            } catch (err: unknown) {
                expect(err).to.be.instanceOf(ApiError);
                if (err instanceof ApiError) {
                    expect(err.statusCode).to.equal(401);
                }
            }
        });
    });
});
