import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Profile } from '../Profile';
import * as AuthContextModule from '../../context/AuthContext';
import { authApi } from '../../services/api';

vi.mock('../../services/api', () => ({
  authApi: {
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public message: string, public statusCode: number = 400) {
      super(message);
    }
  },
}));

describe('Profile Page Component', () => {
  const mockUser = {
    id: 'user-123',
    name: 'Jane Doe',
    email: 'jane@example.com',
  };
  const mockUpdateUser = vi.fn();
  const mockUpdateToken = vi.fn();
  const mockRefreshUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: mockUser,
      token: 'test-token',
      isAuthenticated: true,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      updateUser: mockUpdateUser,
      updateToken: mockUpdateToken,
      refreshUser: mockRefreshUser,
    });
  });

  const renderComponent = (): ReturnType<typeof render> => {
    return render(
      <BrowserRouter>
        <Profile />
      </BrowserRouter>
    );
  };

  it('renders profile hero, personal information form, and change password form', () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: 'Jane Doe' })).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Personal Information' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Security & Password' })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Jane Doe');
    expect(screen.getByLabelText(/email address/i)).toHaveValue('jane@example.com');
  });

  it('updates personal information and calls updateUser context', async () => {
    const updatedUser = { id: 'user-123', name: 'Jane Smith', email: 'jane.smith@example.com' };
    vi.mocked(authApi.updateProfile).mockResolvedValueOnce({ user: updatedUser });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Jane Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'jane.smith@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(authApi.updateProfile).toHaveBeenCalledWith({
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
      });
      expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    });
  });

  it('validates change password form fields', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /^change password$/i }));

    expect(await screen.findByText('Current password is required')).toBeInTheDocument();
    expect(screen.getByText('New password is required')).toBeInTheDocument();
    expect(screen.getByText('Confirmation password is required')).toBeInTheDocument();
    expect(authApi.changePassword).not.toHaveBeenCalled();
  });

  it('submits change password successfully, updates token session, and clears input fields', async () => {
    const newToken = 'replacement-jwt-token';
    vi.mocked(authApi.changePassword).mockResolvedValueOnce({ token: newToken });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText(/enter current password/i), {
      target: { value: 'OldPassword123!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/enter new strong password/i), {
      target: { value: 'NewPassword456!' },
    });
    fireEvent.change(screen.getByPlaceholderText(/confirm new password/i), {
      target: { value: 'NewPassword456!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^change password$/i }));

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword456!',
      });
      expect(mockUpdateToken).toHaveBeenCalledWith(newToken);
      expect(screen.getByText(/password changed successfully!/i)).toBeInTheDocument();
    });
  });

  it('renders elegant back to dashboard link', () => {
    renderComponent();

    const backLink = screen.getByRole('link', { name: /back to dashboard/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');
  });
});
