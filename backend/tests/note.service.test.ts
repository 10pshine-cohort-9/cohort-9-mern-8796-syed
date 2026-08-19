import 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import Note from '../src/models/Note';
import { ApiError } from '../src/utils/ApiError';
import * as noteService from '../src/services/note.service';

describe('Note Service (note.service.ts)', () => {
    const validUserId = '507f1f77bcf86cd799439011';
    const validNoteId = '507f1f77bcf86cd799439022';

    afterEach(() => {
        sinon.restore();
    });

    describe('createNote', () => {
        it('should create a new note when provided with valid input and user ID', async () => {
            const mockCreatedNote = {
                _id: validNoteId,
                id: validNoteId,
                userId: validUserId,
                title: 'My Test Note',
                content: 'Some test note content',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            sinon.stub(Note, 'create').resolves(mockCreatedNote as any);

            const result = await noteService.createNote(validUserId, {
                title: 'My Test Note',
                content: 'Some test note content',
            });

            expect(result.title).to.equal('My Test Note');
            expect(result.content).to.equal('Some test note content');
        });

        it('should throw 401 if userId is invalid Mongo ObjectId', async () => {
            try {
                await noteService.createNote('invalid-user-id', {
                    title: 'Title',
                    content: 'Content',
                });
                expect.fail('Expected createNote to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(401);
                expect(err.message).to.equal('Authentication required');
            }
        });

        it('should throw 400 if title is empty or missing', async () => {
            try {
                await noteService.createNote(validUserId, {
                    title: '   ',
                    content: 'Content',
                });
                expect.fail('Expected createNote to throw ApiError');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(400);
                expect(err.message).to.equal('Title is required');
            }
        });
    });

    describe('getNotes', () => {
        it('should fetch user notes with default pagination, sorting, and count total', async () => {
            const mockNotes = [
                { _id: validNoteId, title: 'Note 1', content: 'Content 1', userId: validUserId },
            ];

            sinon.stub(Note, 'countDocuments').resolves(1);
            sinon.stub(Note, 'find').returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().returnsThis(),
                lean: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves(mockNotes),
            } as any);

            const result = await noteService.getNotes(validUserId, {});
            expect(result.total).to.equal(1);
            expect(result.notes).to.deep.equal(mockNotes);
            expect(result.page).to.equal(1);
            expect(result.limit).to.equal(10);
            expect(result.totalPages).to.equal(1);
        });

        it('should filter user notes by search keyword', async () => {
            const countStub = sinon.stub(Note, 'countDocuments').resolves(0);
            sinon.stub(Note, 'find').returns({
                sort: sinon.stub().returnsThis(),
                skip: sinon.stub().returnsThis(),
                limit: sinon.stub().returnsThis(),
                lean: sinon.stub().returnsThis(),
                exec: sinon.stub().resolves([]),
            } as any);

            await noteService.getNotes(validUserId, { search: 'keyword' });
            expect(countStub.firstCall.args[0]).to.have.property('$or');
        });
    });

    describe('getNoteById', () => {
        it('should return note document if note exists and belongs to user', async () => {
            const mockNote = {
                _id: validNoteId,
                userId: validUserId,
                title: 'Existing Note',
                content: 'Body content',
            };

            sinon.stub(Note, 'findOne').returns({
                exec: sinon.stub().resolves(mockNote),
            } as any);

            const note = await noteService.getNoteById(validUserId, validNoteId);
            expect(note).to.deep.equal(mockNote);
        });

        it('should throw 404 if note is not found or owned by another user', async () => {
            sinon.stub(Note, 'findOne').returns({
                exec: sinon.stub().resolves(null),
            } as any);

            try {
                await noteService.getNoteById(validUserId, validNoteId);
                expect.fail('Expected getNoteById to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(404);
                expect(err.message).to.equal('Note not found');
            }
        });
    });

    describe('updateNote', () => {
        it('should update note title and content successfully', async () => {
            const updatedMockNote = {
                _id: validNoteId,
                userId: validUserId,
                title: 'Updated Title',
                content: 'Updated Content',
            };

            sinon.stub(Note, 'findOneAndUpdate').returns({
                exec: sinon.stub().resolves(updatedMockNote),
            } as any);

            const note = await noteService.updateNote(validUserId, validNoteId, {
                title: 'Updated Title',
                content: 'Updated Content',
            });

            expect(note.title).to.equal('Updated Title');
        });

        it('should throw 400 if no fields are provided for update', async () => {
            try {
                await noteService.updateNote(validUserId, validNoteId, {});
                expect.fail('Expected updateNote to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(400);
                expect(err.message).to.equal('At least one field must be provided for update');
            }
        });
    });

    describe('deleteNote', () => {
        it('should delete existing note and return deleted result object', async () => {
            const mockDeletedNote = { _id: validNoteId, userId: validUserId };

            sinon.stub(Note, 'findOneAndDelete').returns({
                exec: sinon.stub().resolves(mockDeletedNote),
            } as any);

            const result = await noteService.deleteNote(validUserId, validNoteId);
            expect(result).to.deep.equal({ deleted: true, noteId: validNoteId });
        });

        it('should throw 404 if note to delete does not exist', async () => {
            sinon.stub(Note, 'findOneAndDelete').returns({
                exec: sinon.stub().resolves(null),
            } as any);

            try {
                await noteService.deleteNote(validUserId, validNoteId);
                expect.fail('Expected deleteNote to throw');
            } catch (err: any) {
                expect(err).to.be.instanceOf(ApiError);
                expect(err.statusCode).to.equal(404);
            }
        });
    });
});
