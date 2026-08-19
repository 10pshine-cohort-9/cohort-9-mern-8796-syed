import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Register } from '../Register';
import * as AuthContextModule from '../../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Register (Signup) Component', () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <Register />
      </BrowserRouter>
    );
  };

  it('renders registration form elements correctly', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('validates missing name, invalid email, and password under 8 characters', async () => {
    renderComponent();

    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'bad-email' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters long')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('submits valid registration details and navigates to home', async () => {
    mockRegister.mockResolvedValueOnce(undefined);
    renderComponent();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: 'securepassword123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('displays server error banner on duplicate registration error', async () => {
    mockRegister.mockRejectedValueOnce(new Error('Email is already registered'));
    renderComponent();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepassword123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText('Email is already registered')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
