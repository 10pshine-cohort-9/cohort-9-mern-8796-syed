import 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import sinon from 'sinon';
import app from '../src/app';
import User from '../src/models/User';
import Note from '../src/models/Note';
import TokenRevocation from '../src/models/TokenRevocation';

describe('Note Controller & Routes (/api/notes)', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validNoteId = '507f1f77bcf86cd799439022';
    let authToken = '';

    beforeEach(async () => {
        const mockUser = {
            _id: { toString: () => validUserId },
            id: validUserId,
            email: 'test@example.com',
            name: 'Test User',
        };

        sinon.stub(User, 'findOne').returns({
            select: sinon.stub().returnsThis(),
            lean: sinon.stub().resolves(null),
        } as any);
        sinon.stub(User, 'create').resolves(mockUser as any);

        const regRes = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
            });

        authToken = regRes.body.data.token;
        sinon.restore();

        sinon.stub(TokenRevocation, 'findOne').returns({
            select: sinon.stub().returnsThis(),
            lean: sinon.stub().resolves(null),
        } as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('POST /api/notes', () => {
        it('should return 201 created with note data when creation succeeds', async () => {
            const mockNote = {
                _id: validNoteId,
                id: validNoteId,
                userId: validUserId,
                title: 'New Note',
                content: 'New Note Body',
            };

            sinon.stub(Note, 'create').resolves(mockNote as any);

            const res = await request(app)
                .post('/api/notes')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    title: 'New Note',
                    content: 'New Note Body',
                });

            expect(res.status).to.equal(201);
            expect(res.body.success).to.be.true;
            expect(res.body.data.note.title).to.equal('New Note');
        });

        it('should return 401 when Authorization header is missing', async () => {
            const res = await request(app)
                .post('/api/notes')
                .send({ title: 'New Note', content: 'Body' });

            expect(res.status).to.equal(401);
        });
    });

    describe('GET /api/notes', () => {
        it('should return 200 OK with list of notes and pagination info', async () => {
            const mockNotes = [
                {
                    _id: validNoteId,
                    userId: validUserId,
                    title: 'Note 1',
                    content: 'Content 1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            sinon.stub(Note, 'countDocuments').resolves(1);
            sinon.stub(Note, 'find').returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().returnsThis(),
                lean: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(mockNotes),
            } as any);

            const res = await request(app)
                .get('/api/notes')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.data.notes).to.be.an('array').with.lengthOf(1);
            expect(res.body.data.total).to.equal(1);
        });
    });

    describe('GET /api/notes/:id', () => {
        it('should return 200 OK with single note by ID', async () => {
            const mockNote = {
                _id: validNoteId,
                userId: validUserId,
                title: 'Single Note',
                content: 'Content',
            };

            sinon.stub(Note, 'findOne').returns({
                exec: sinon.stub().resolves(mockNote),
            } as any);

            const res = await request(app)
                .get(`/api/notes/${validNoteId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.data.note.title).to.equal('Single Note');
        });

        it('should return 404 when note is not found', async () => {
            sinon.stub(Note, 'findOne').returns({
                exec: sinon.stub().resolves(null),
            } as any);

            const res = await request(app)
                .get(`/api/notes/${validNoteId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).to.equal(404);
            expect(res.body.message).to.equal('Note not found');
        });
    });

    describe('PUT /api/notes/:id', () => {
        it('should return 200 OK with updated note', async () => {
            const mockUpdatedNote = {
                _id: validNoteId,
                userId: validUserId,
                title: 'Updated Title',
                content: 'Updated Content',
            };

            sinon.stub(Note, 'findOneAndUpdate').returns({
                exec: sinon.stub().resolves(mockUpdatedNote),
            } as any);

            const res = await request(app)
                .put(`/api/notes/${validNoteId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Updated Title' });

            expect(res.status).to.equal(200);
            expect(res.body.data.note.title).to.equal('Updated Title');
        });
    });

    describe('DELETE /api/notes/:id', () => {
        it('should return 200 OK when note deletion succeeds', async () => {
            const mockDeletedNote = {
                _id: validNoteId,
                userId: validUserId,
            };

            sinon.stub(Note, 'findOneAndDelete').returns({
                exec: sinon.stub().resolves(mockDeletedNote),
            } as any);

            const res = await request(app)
                .delete(`/api/notes/${validNoteId}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.status).to.equal(200);
            expect(res.body.data.deleted).to.be.true;
        });
    });
});
