import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from './Login';
import { AuthProvider } from '../contexts/AuthContext';

const mockLogin = jest.fn();
const mockOnSwitchToRegister = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: () => ({
    login: mockLogin,
  }),
}));

const renderWithAuthProvider = (component: React.ReactNode) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the login form', () => {
    renderWithAuthProvider(<Login onSwitchToRegister={mockOnSwitchToRegister} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('should call the login function on form submission', async () => {
    mockLogin.mockResolvedValue(true);
    renderWithAuthProvider(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
    });
  });

  it('should show an error message on failed login', async () => {
    mockLogin.mockResolvedValue(false);
    renderWithAuthProvider(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'wrong@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/email ou senha inválidos/i)).toBeInTheDocument();
  });

  it('should show a generic error message on API error', async () => {
    mockLogin.mockRejectedValue(new Error('API Error'));
    renderWithAuthProvider(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/erro ao fazer login/i)).toBeInTheDocument();
  });

  it('should disable form elements during login', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)));
    renderWithAuthProvider(<Login onSwitchToRegister={mockOnSwitchToRegister} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password' } });
    const loginButton = screen.getByRole('button', { name: /entrar/i });
    fireEvent.click(loginButton);

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/senha/i)).toBeDisabled();
    expect(loginButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).not.toBeDisabled();
    });
  });

  it('should call onSwitchToRegister when the register link is clicked', () => {
    renderWithAuthProvider(<Login onSwitchToRegister={mockOnSwitchToRegister} />);
    fireEvent.click(screen.getByText(/não tem uma conta\? cadastre-se/i));
    expect(mockOnSwitchToRegister).toHaveBeenCalled();
  });
});
