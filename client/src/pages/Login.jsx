// components/Login.jsx
import { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import '../App.css';

const Login = () => {
  const { loginCustomer, loginAdmin, userType } = useContext(AppContext); // Use specific login functions
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'customer' // Add user type selection
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response;
      
      // Use the correct login function based on user type
      if (formData.userType === 'admin') {
        response = await loginAdmin({
          email: formData.email,
          password: formData.password
        });
        // Redirect to admin dashboard
        navigate('/admin');
      } else {
        response = await loginCustomer({
          email: formData.email,
          password: formData.password
        });
        // Redirect to customer dashboard or home
        navigate('/account');
      }
      
      console.log('✅ Login successful:', response);
      
    } catch (err) {
      console.error('❌ Login error:', err);
      setFormData(prev => ({ ...prev, password: '' }));
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <h2>Login to Your Account</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {/* User type selection */}
        <div className="form-group">
          <label>Login As</label>
          <select 
            name="userType" 
            value={formData.userType} 
            onChange={handleChange}
          >
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <input
          type="email"
          name="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p>
        Don't have an account? <a href="/signup">Sign Up</a>
      </p>
      
      {/* Admin test credentials */}
      {formData.userType === 'admin' && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
            <strong>Admin Test Credentials:</strong><br />
            Email: admin@rerendetcoffee.com<br />
            Password: Admin123!
          </p>
        </div>
      )}
    </div>
  );
};

export default Login;