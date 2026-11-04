// src/components/Admin/UsersManagement.jsx — Premium Rewrite
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch, FaUser, FaEnvelope, FaPhone, FaCalendar,
  FaSync, FaTimes, FaShoppingBag, FaMapMarkerAlt,
  FaTrash, FaUserTag, FaShieldAlt, FaUserCheck,
  FaUserClock, FaChevronLeft, FaChevronRight,
  FaCrown, FaUsers, FaUserShield, FaLockOpen, FaLock,
  FaKey, FaUnlock, FaCopy, FaCheck, FaExternalLinkAlt, FaWhatsapp
} from 'react-icons/fa';
import './UsersManagement.css';

// ─── Helpers ────────────────────────────────────────────────────
const ROLE_CONFIG = {
  'super-admin': { label: 'Super Admin', color: 'gold', icon: <FaCrown />, bg: 'rgba(212,175,55,0.12)', text: '#D4AF37' },
  'admin': { label: 'Admin', color: 'blue', icon: <FaUserShield />, bg: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
  'customer': { label: 'Customer', color: 'green', icon: <FaUser />, bg: 'rgba(16,185,129,0.12)', text: '#10b981' },
};

const getInitials = (firstName, lastName) =>
  `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase() || '?';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Avatar Component ──────────────────────────────────────────
const UserAvatar = ({ user, size = 'md' }) => {
  const initials = getInitials(user.firstName, user.lastName);
  const role = user.userType || user.role || 'customer';
  const colors = {
    'super-admin': 'linear-gradient(135deg, #D4AF37, #b38f2a)',
    'admin': 'linear-gradient(135deg, #3b82f6, #2563eb)',
    'customer': 'linear-gradient(135deg, #6F4E37, #4a3425)',
  };
  return (
    <div className={`user-avatar-circle size-${size}`} style={{ background: colors[role] || colors.customer }}>
      {initials}
    </div>
  );
};

// ─── Role Badge ────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.customer;
  return (
    <span className="role-badge-pill" style={{ background: cfg.bg, color: cfg.text }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

// ─── Main Component ────────────────────────────────────────────
const UsersManagement = () => {
  const { showAlert, fetchAdminUsers, updateUserRole, deleteUser, unlockAccount, resetUserSecurity, generateAdminPasswordReset, togglePasswordUnlock } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [filters, setFilters] = useState({ search: '', role: '', page: 1, limit: 12 });
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, admins: 0, verified: 0, recent: 0 });
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    user: null,
    loading: false,
    result: null,
    error: null
  });

  const handleTriggerReset = async (targetUser) => {
    setResetModal({
      isOpen: true,
      user: targetUser,
      loading: true,
      result: null,
      error: null
    });

    try {
      const res = await generateAdminPasswordReset(targetUser._id);
      setResetModal(prev => ({
        ...prev,
        loading: false,
        result: res.data || res
      }));
    } catch (err) {
      setResetModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message || 'Failed to generate reset credentials'
      }));
    }
  };

  // Helper: check if a user account is currently locked
  const isUserLocked = (user) => user.lockUntil && new Date(user.lockUntil) > new Date();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetchAdminUsers(filters);
      if (response.success) {
        const userList = response.data.users || [];
        setUsers(userList);
        setPagination(response.data.pagination || {});
        // Compute stats
        setStats({
          total: response.data.pagination?.total || userList.length,
          admins: userList.filter(u => u.userType === 'admin' || u.userType === 'super-admin').length,
          verified: userList.filter(u => u.isVerified).length,
          recent: userList.filter(u => {
            const d = new Date(u.createdAt);
            return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
          }).length,
        });
      }
    } catch {
      showAlert('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters(p => ({ ...p, search: searchTerm, page: 1 }));
    }, 450);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    setFilters(p => ({ ...p, role: roleFilter === 'all' ? '' : roleFilter, page: 1 }));
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [filters]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        fetchUsers();
        if (selectedUser?._id === userId) setSelectedUser(prev => ({ ...prev, userType: newRole, role: newRole }));
      }
    } catch { /* Error handled by context */ }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user permanently? This cannot be undone.')) return;
    try {
      const res = await deleteUser(userId);
      if (res.success) {
        fetchUsers();
        if (selectedUser?._id === userId) setSelectedUser(null);
      }
    } catch { /* Error handled by context */ }
  };

  const handleBulkDelete = async () => {
    if (!selectedUsers.length) return;
    if (!window.confirm(`Delete ${selectedUsers.length} users? This cannot be undone.`)) return;
    try {
      setLoading(true);
      await Promise.all(selectedUsers.map(id => deleteUser(id)));
      setSelectedUsers([]);
      fetchUsers();
    } catch { /* Error handled by context */ }
    finally { setLoading(false); }
  };

  const handleUnlockUser = async (userId) => {
    try {
      const res = await unlockAccount(userId);
      if (res.success) {
        fetchUsers();
        if (selectedUser?._id === userId) {
          setSelectedUser(prev => ({ ...prev, lockUntil: null, loginAttempts: 0 }));
        }
      }
    } catch {
      // Error is already handled by context
    }
  };
  
  const handleSecurityReset = async (userId, type) => {
    // Confirm before proceeding
    const typeLabel = type === 'mfa' ? 'Two-Factor Authentication' : 'Recovery Phone Number';
    if (!window.confirm(`Are you sure you want to reset the ${typeLabel} for this user?`)) return;

    try {
      const res = await resetUserSecurity(userId, type);
      if (res.success) {
        fetchUsers(); // Refresh the list
        // Update the drawer if it's the same user
        if (selectedUser?._id === userId) {
          setSelectedUser(prev => ({ 
            ...prev, 
            twoFactorEnabled: type === 'mfa' ? false : prev.twoFactorEnabled,
            phone: type === 'phone' ? null : prev.phone
          }));
        }
      }
    } catch {
      // Error is already handled by context
    }
  };

  const handleTogglePasswordUnlock = async (userId, currentOverride) => {
    let reason = null;
    if (!currentOverride) {
      reason = window.prompt(
        "Reason for granting early 30-day password unlock (e.g. 'Customer lost device' or 'Security request'):",
        "Customer requested early password change"
      );
      if (reason === null) return;
      if (!reason.trim()) reason = "Customer requested early password change";
    }

    try {
      const res = await togglePasswordUnlock(userId, {
        unlock: !currentOverride,
        reason: reason
      });
      if (res?.success) {
        setUsers(prev => prev.map(u => {
          if (u._id === userId) {
            return {
              ...u,
              allowPasswordChangeOverride: res.data?.allowPasswordChangeOverride,
              passwordOverrideReason: res.data?.passwordOverrideReason,
              passwordOverrideGrantedAt: res.data?.passwordOverrideGrantedAt,
              passwordChangedAt: res.data?.passwordChangedAt
            };
          }
          return u;
        }));

        if (selectedUser?._id === userId) {
          setSelectedUser(prev => ({
            ...prev,
            allowPasswordChangeOverride: res.data?.allowPasswordChangeOverride,
            passwordOverrideReason: res.data?.passwordOverrideReason,
            passwordOverrideGrantedAt: res.data?.passwordOverrideGrantedAt,
            passwordChangedAt: res.data?.passwordChangedAt
          }));
        }
      }
    } catch {
      // Handled by context
    }
  };

  const handleSelectAll = (e) => setSelectedUsers(e.target.checked ? users.map(u => u._id) : []);
  const handleSelectUser = (id) =>
    setSelectedUsers(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);

  return (
    <div className="users-management">
      {/* ── Stats Row ── */}
      <div className="um-stats-row">
        {[
          { icon: <FaUsers />, label: 'Total Users', value: pagination.total || stats.total, color: '#3b82f6' },
          { icon: <FaUserShield />, label: 'Admins', value: stats.admins, color: '#D4AF37' },
          { icon: <FaUserCheck />, label: 'Verified', value: stats.verified, color: '#10b981' },
          { icon: <FaUserClock />, label: 'New This Week', value: stats.recent, color: '#8b5cf6' },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="um-stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="um-stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <p className="um-stat-value">{s.value}</p>
              <p className="um-stat-label">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="um-toolbar">
        <div className="um-search-box">
          <FaSearch className="um-search-icon" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="um-clear-btn" onClick={() => setSearchTerm('')}><FaTimes /></button>
          )}
        </div>

        <div className="um-role-pills">
          {['all', 'customer', 'admin', 'super-admin'].map(r => (
            <button
              key={r}
              className={`um-role-pill ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r === 'all' ? 'All Roles' : ROLE_CONFIG[r]?.label || r}
            </button>
          ))}
        </div>

        <button className="um-refresh-btn" onClick={fetchUsers} disabled={loading} title="Refresh">
          <FaSync className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* ── Bulk Bar ── */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div
            className="um-bulk-bar"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span>{selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected</span>
            <button className="um-bulk-delete-btn" onClick={handleBulkDelete}>
              <FaTrash /> Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Table ── */}
      {loading ? (
        <div className="um-loading">
          <div className="um-spinner" />
          <p>Loading users…</p>
        </div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={users.length > 0 && selectedUsers.length === users.length}
                  />
                </th>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="um-empty-row">
                    <div className="um-empty">
                      <FaUsers className="um-empty-icon" />
                      <h3>No users found</h3>
                      <p>{searchTerm ? `No results for "${searchTerm}"` : 'Your user list is empty'}</p>
                      {searchTerm && <button onClick={() => setSearchTerm('')} className="um-clear-link">Clear search</button>}
                    </div>
                  </td>
                </tr>
              ) : users.map((user, i) => (
                <motion.tr
                  key={user._id}
                  className={`um-row ${selectedUsers.includes(user._id) ? 'selected' : ''}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user._id)}
                      onChange={() => handleSelectUser(user._id)}
                    />
                  </td>
                  <td>
                    <div className="um-user-cell">
                      <UserAvatar user={user} size="sm" />
                      <div className="um-user-name-block">
                        <strong>{user.firstName} {user.lastName}</strong>
                        <span className="um-user-id">#{user._id?.slice(-6)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="um-contact-block">
                      <span><FaEnvelope /> {user.email}</span>
                      {user.phone && <span><FaPhone /> {user.phone}</span>}
                    </div>
                  </td>
                  <td><RoleBadge role={user.userType || user.role || 'customer'} /></td>
                  <td>
                    <span className="um-date">{formatDate(user.createdAt)}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span className={`um-verified-badge ${user.isVerified ? 'yes' : 'no'}`}>
                        {user.isVerified ? '✓ Verified' : '⌛ Pending'}
                      </span>
                      {isUserLocked(user) && (
                        <span className="um-verified-badge no" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                          <FaLock style={{ fontSize: '0.65rem' }} /> Locked
                        </span>
                      )}
                      {user.allowPasswordChangeOverride ? (
                        <span className="um-verified-badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }} title={`Password Override Active: ${user.passwordOverrideReason || 'Admin approved'}`}>
                          <FaUnlock style={{ fontSize: '0.62rem' }} /> Pass Unlocked
                        </span>
                      ) : (user.passwordChangedAt && (Date.now() - new Date(user.passwordChangedAt).getTime()) < 30 * 24 * 60 * 60 * 1000) ? (
                        <span className="um-verified-badge" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }} title="30-day password cooldown active">
                          <FaKey style={{ fontSize: '0.62rem' }} /> Cooldown ({Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(user.passwordChangedAt).getTime())) / (24 * 60 * 60 * 1000))}d)
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="um-actions">
                      <button
                        className="um-action-btn view"
                        title="View Profile"
                        onClick={() => setSelectedUser(user)}
                      >
                        <FaUser />
                      </button>
                      <button
                        className="um-action-btn key"
                        title="Generate Password Reset Link & Code"
                        style={{ color: '#D4AF37' }}
                        onClick={() => handleTriggerReset(user)}
                      >
                        <FaKey />
                      </button>
                      <button
                        className="um-action-btn delete"
                        title="Delete User"
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="um-pagination">
              <button
                className="um-page-btn"
                disabled={filters.page === 1}
                onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}
              >
                <FaChevronLeft /> Prev
              </button>
              <div className="um-page-numbers">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(pg => (
                  <button
                    key={pg}
                    className={`um-page-num ${filters.page === pg ? 'active' : ''}`}
                    onClick={() => setFilters(p => ({ ...p, page: pg }))}
                  >
                    {pg}
                  </button>
                ))}
              </div>
              <button
                className="um-page-btn"
                disabled={filters.page === pagination.pages}
                onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── User Profile Drawer ── */}
      <AnimatePresence>
        {selectedUser && (
          <UserProfileDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onRoleChange={handleRoleChange}
            onDelete={handleDeleteUser}
            onUnlock={handleUnlockUser}
            onSecurityReset={handleSecurityReset}
            onTogglePasswordUnlock={handleTogglePasswordUnlock}
            onTriggerReset={handleTriggerReset}
            isLocked={isUserLocked(selectedUser)}
          />
        )}
      </AnimatePresence>

      {/* ── Admin Password Reset Modal ── */}
      <AnimatePresence>
        {resetModal.isOpen && (
          <AdminResetModal
            modal={resetModal}
            onClose={() => setResetModal({ isOpen: false, user: null, loading: false, result: null, error: null })}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── User Profile Drawer ────────────────────────────────────────
const UserProfileDrawer = ({ user, onClose, onRoleChange, onDelete, onUnlock, onSecurityReset, onTogglePasswordUnlock, onTriggerReset, isLocked }) => {
  const [role, setRole] = useState(user.userType || user.role || 'customer');
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleRoleSave = async () => {
    setSaving(true);
    await onRoleChange(user._id, role);
    setSaving(false);
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    await onUnlock(user._id);
    setUnlocking(false);
  };

  const initials = getInitials(user.firstName, user.lastName);
  const joinDate = formatDate(user.createdAt);

  const getCooldownInfo = () => {
    if (user.allowPasswordChangeOverride) {
      return {
        status: 'unlocked',
        label: 'Early Password Change Permitted (Override Active)',
        sublabel: `Reason: ${user.passwordOverrideReason || 'Admin concierge approved upon request'}. Member can change their password immediately in dashboard.`,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.08)',
        canUnlock: false,
        canRevoke: true
      };
    }

    if (user.passwordChangedAt) {
      const elapsed = Date.now() - new Date(user.passwordChangedAt).getTime();
      const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
      if (elapsed < COOLDOWN_MS) {
        const daysRemaining = Math.ceil((COOLDOWN_MS - elapsed) / (24 * 60 * 60 * 1000));
        return {
          status: 'cooldown',
          label: `30-Day Policy Cooldown (${daysRemaining} days remaining)`,
          sublabel: `Standard security policy restricts password updates to once every 30 days. Last changed: ${formatDate(user.passwordChangedAt)}.`,
          color: '#d97706',
          bg: 'rgba(245, 158, 11, 0.08)',
          daysRemaining,
          canUnlock: true,
          canRevoke: false
        };
      }
    }

    return {
      status: 'eligible',
      label: 'Eligible to Change Password (30+ Days Satisfied)',
      sublabel: user.passwordChangedAt
        ? `Last updated on ${formatDate(user.passwordChangedAt)}. Member is currently eligible to update credentials.`
        : 'Member has not recently changed password and is fully eligible.',
      color: '#6F4E37',
      bg: 'rgba(111, 78, 55, 0.06)',
      canUnlock: true,
      canRevoke: false
    };
  };

  const cooldownInfo = getCooldownInfo();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="um-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <motion.div
        className="um-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 250 }}
      >
        {/* Drawer Header */}
        <div className="um-drawer-header">
          <span className="um-drawer-title">User Profile</span>
          <button className="um-drawer-close" onClick={onClose}><FaTimes /></button>
        </div>

        {/* Profile Hero */}
        <div className="um-profile-hero">
          <div className={`um-avatar-large role-${user.userType || 'customer'}`}>
            {initials}
          </div>
          <div className="um-profile-hero-info">
            <h2>{user.firstName} {user.lastName}</h2>
            <RoleBadge role={user.userType || user.role || 'customer'} />
            <span className={`um-verified-badge large ${user.isVerified ? 'yes' : 'no'}`}>
              {user.isVerified ? '✓ Verified Account' : '⌛ Unverified Account'}
            </span>
            {isLocked && (
              <span className="um-verified-badge large no" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaLock /> Account Locked
              </span>
            )}
          </div>
        </div>

        {/* Profile Body */}
        <div className="um-drawer-body">

          {/* Contact Info */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title"><FaEnvelope /> Contact Information</h4>
            <div className="um-info-rows">
              <div className="um-info-row">
                <span className="um-info-label"><FaEnvelope /> Email</span>
                <span className="um-info-value">{user.email}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label"><FaPhone /> Phone</span>
                <span className="um-info-value">{user.phone || <em>Not provided</em>}</span>
              </div>
              {user.address && (
                <div className="um-info-row">
                  <span className="um-info-label"><FaMapMarkerAlt /> Address</span>
                  <span className="um-info-value">{user.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Account Details */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title"><FaCalendar /> Account Details</h4>
            <div className="um-info-rows">
              <div className="um-info-row">
                <span className="um-info-label">User ID</span>
                <span className="um-info-value mono">{user._id}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label">Joined</span>
                <span className="um-info-value">{joinDate}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label">Last Login</span>
                <span className="um-info-value">{user.lastLogin ? formatDate(user.lastLogin) : 'Never recorded'}</span>
              </div>
              <div className="um-info-row">
                <span className="um-info-label">Orders</span>
                <span className="um-info-value">
                  <FaShoppingBag style={{ marginRight: '0.3rem', color: 'var(--color-primary)' }} />
                  {user.orderCount ?? '—'} orders
                </span>
              </div>
            </div>
          </div>

          {/* Role Management */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title"><FaShieldAlt /> System Role</h4>
            <p className="um-drawer-section-hint">Changing the role grants or revokes administrative access to this platform.</p>

            <div className="um-role-options">
              {['customer', 'admin', 'super-admin'].map(r => {
                const cfg = ROLE_CONFIG[r];
                return (
                  <button
                    key={r}
                    type="button"
                    className={`um-role-option ${role === r ? 'active' : ''}`}
                    style={role === r ? { borderColor: cfg.text, background: cfg.bg, color: cfg.text } : {}}
                    onClick={() => setRole(r)}
                  >
                    <span className="um-role-option-icon">{cfg.icon}</span>
                    <span className="um-role-option-label">{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {role !== (user.userType || user.role || 'customer') && (
              <motion.button
                className="um-save-role-btn"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleRoleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : `✓ Apply Role: ${ROLE_CONFIG[role]?.label}`}
              </motion.button>
            )}
          </div>

          {/* Account Lock Management */}
          {isLocked && (
            <div className="um-drawer-section" style={{ border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '1.25rem' }}>
              <h4 className="um-drawer-section-title" style={{ color: '#ef4444' }}><FaLock /> Account Locked</h4>
              <p className="um-drawer-section-hint">
                This account is temporarily locked due to multiple failed login attempts.
                The customer cannot log in until the lock expires or you manually unlock it.
              </p>
              <button
                className="um-save-role-btn"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', marginTop: '0.75rem' }}
                onClick={handleUnlock}
                disabled={unlocking}
              >
                <FaLockOpen /> {unlocking ? 'Unlocking…' : 'Unlock Account Now'}
              </button>
            </div>
          )}

          {/* Customer Security & Credential Control (30-Day Policy Concierge Override) */}
          <div className="um-drawer-section" style={{
            border: cooldownInfo.status === 'unlocked'
              ? '1px solid rgba(16, 185, 129, 0.35)'
              : cooldownInfo.status === 'cooldown'
                ? '1px solid rgba(245, 158, 11, 0.35)'
                : '1px solid var(--border-main)',
            background: cooldownInfo.status === 'unlocked'
              ? 'rgba(16, 185, 129, 0.03)'
              : cooldownInfo.status === 'cooldown'
                ? 'rgba(245, 158, 11, 0.02)'
                : 'var(--bg-home)'
          }}>
            <h4 className="um-drawer-section-title" style={{ color: cooldownInfo.status === 'unlocked' ? '#10b981' : cooldownInfo.status === 'cooldown' ? '#d97706' : 'var(--text-muted)' }}>
              <FaKey /> Credential & Password Policy Control
            </h4>
            <p className="um-drawer-section-hint">
              Rerendet Farm enforces a 30-day password cooldown to protect customer accounts. Administrators can grant a concierge override upon verified customer request.
            </p>

            {/* Status Card */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: cooldownInfo.bg,
              border: `1px solid ${cooldownInfo.color}35`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: `${cooldownInfo.color}20`,
                color: cooldownInfo.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                flexShrink: 0
              }}>
                {cooldownInfo.status === 'unlocked' ? <FaUnlock /> : <FaLock />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: cooldownInfo.color }}>
                  {cooldownInfo.label}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                  {cooldownInfo.sublabel}
                </div>
              </div>
            </div>

            {/* Override metadata if unlocked */}
            {user.allowPasswordChangeOverride && (
              <div className="um-info-rows" style={{ marginBottom: '1rem', fontSize: '0.78rem' }}>
                <div className="um-info-row">
                  <span className="um-info-label">Override Reason</span>
                  <span className="um-info-value" style={{ fontWeight: 600 }}>{user.passwordOverrideReason || 'Concierge approved'}</span>
                </div>
                {user.passwordOverrideGrantedAt && (
                  <div className="um-info-row">
                    <span className="um-info-label">Granted On</span>
                    <span className="um-info-value">{formatDate(user.passwordOverrideGrantedAt)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            {user.allowPasswordChangeOverride ? (
              <button
                className="um-save-role-btn"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  boxShadow: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => onTogglePasswordUnlock(user._id, true)}
              >
                <FaLock /> Revoke Unlock (Restore 30-Day Policy)
              </button>
            ) : (
              <button
                className="um-save-role-btn"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onClick={() => onTogglePasswordUnlock(user._id, false)}
              >
                <FaUnlock /> Unlock Password Change (Grant Override)
              </button>
            )}

            <button
              type="button"
              className="um-save-role-btn"
              style={{
                background: 'linear-gradient(135deg, #D4AF37, #996515)',
                color: '#1a1816',
                fontWeight: 700,
                marginTop: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(212, 175, 55, 0.25)'
              }}
              onClick={() => onTriggerReset(user)}
            >
              <FaKey /> Generate Reset Link &amp; OTP Code
            </button>
          </div>

          {/* Emergency Recovery */}
          <div className="um-drawer-section">
            <h4 className="um-drawer-section-title" style={{ color: '#f59e0b' }}><FaShieldAlt /> Emergency Recovery</h4>
            <p className="um-drawer-section-hint">
              Use these tools to help users who have lost access to their 2FA device or recovery phone.
            </p>
            
            <div className="um-recovery-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '1rem' }}>
              <button 
                className="um-recovery-btn mfa"
                onClick={() => onSecurityReset(user._id, 'mfa')}
                disabled={!user.twoFactorEnabled}
                style={{ 
                  padding: '10px', 
                  borderRadius: '8px', 
                  border: '1px solid #f59e0b',
                  background: 'transparent',
                  color: '#f59e0b',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: user.twoFactorEnabled ? 'pointer' : 'not-allowed',
                  opacity: user.twoFactorEnabled ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaLock /> Disable MFA
              </button>
              
              <button 
                className="um-recovery-btn phone"
                onClick={() => onSecurityReset(user._id, 'phone')}
                disabled={!user.phone}
                style={{ 
                  padding: '10px', 
                  borderRadius: '8px', 
                  border: '1px solid #3b82f6',
                  background: 'transparent',
                  color: '#3b82f6',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: user.phone ? 'pointer' : 'not-allowed',
                  opacity: user.phone ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <FaPhone /> Clear Phone
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="um-drawer-section danger-zone">
            <h4 className="um-drawer-section-title danger"><FaTrash /> Danger Zone</h4>
            <p className="um-drawer-section-hint">Deleting this user is permanent and cannot be reversed. Their orders and data will be preserved.</p>
            <button className="um-delete-btn" onClick={() => { onDelete(user._id); onClose(); }}>
              <FaTrash /> Delete This Account
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

// ─── Admin Password Reset Modal ─────────────────────────────────
const AdminResetModal = ({ modal, onClose }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!modal?.isOpen) return null;

  const { user, loading, result, error } = modal;
  const name = result?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email;
  const email = result?.email || user?.email;
  const code = result?.code;
  const resetUrl = result?.resetUrl;
  const phone = (result?.phone || user?.phone || '').replace(/[^0-9]/g, '');

  const copyToClipboard = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Hello ${name}, here is your secure password reset link for Rerendet Farm: ${resetUrl}\n\nOr enter code: ${code}\n(This link expires in 60 minutes).`
  );
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${whatsappMessage}` : `https://wa.me/?text=${whatsappMessage}`;

  return (
    <div className="um-modal-overlay" onClick={onClose}>
      <motion.div
        className="um-reset-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="um-reset-modal-header">
          <div className="um-reset-modal-icon">
            <FaKey />
          </div>
          <div>
            <h3>Customer Password Recovery</h3>
            <p>Direct reset link &amp; OTP code for <strong>{name}</strong></p>
          </div>
          <button className="um-drawer-close" onClick={onClose}><FaTimes /></button>
        </div>

        <div className="um-reset-modal-body">
          {loading && (
            <div className="um-modal-loading">
              <FaSync className="spin" />
              <span>Generating secure cryptographic recovery tokens…</span>
            </div>
          )}

          {error && (
            <div className="um-modal-error">
              <p>⚠️ {error}</p>
            </div>
          )}

          {result && (
            <>
              {/* Notice Banner */}
              <div className={`um-status-banner ${result.emailSent ? 'success' : 'warning'}`}>
                {result.emailSent ? (
                  <span>✅ An automated email was sent to <strong>{email}</strong>, but you can also share the direct link below immediately.</span>
                ) : (
                  <span>ℹ️ Automated email could not be delivered, but this direct link and code are live and ready to send to the customer!</span>
                )}
              </div>

              {/* 6-Digit OTP Code */}
              <div className="um-reset-block">
                <label className="um-reset-label">6-Digit Verification Code (OTP)</label>
                <div className="um-code-display-wrap">
                  <span className="um-code-digits">{code}</span>
                  <button
                    type="button"
                    className="um-copy-btn"
                    onClick={() => copyToClipboard(code, 'code')}
                  >
                    {copiedCode ? <><FaCheck /> Copied!</> : <><FaCopy /> Copy Code</>}
                  </button>
                </div>
                <span className="um-reset-hint">Customer can enter this 6-digit code on the reset screen or login portal.</span>
              </div>

              {/* 1-Click Direct Reset Link */}
              <div className="um-reset-block">
                <label className="um-reset-label">Direct 1-Click Reset Link</label>
                <div className="um-link-display-wrap">
                  <input
                    type="text"
                    readOnly
                    value={resetUrl}
                    className="um-link-input"
                    onClick={e => e.target.select()}
                  />
                  <button
                    type="button"
                    className="um-copy-btn primary"
                    onClick={() => copyToClipboard(resetUrl, 'link')}
                  >
                    {copiedLink ? <><FaCheck /> Copied Link!</> : <><FaCopy /> Copy Link</>}
                  </button>
                </div>
                <span className="um-reset-hint">Customer can click this link directly to set their new password without needing an email.</span>
              </div>

              {/* Action Buttons */}
              <div className="um-reset-actions-row">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="um-whatsapp-btn"
                >
                  <FaWhatsapp /> Send via WhatsApp
                </a>
                <a
                  href={resetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="um-test-link-btn"
                >
                  <FaExternalLinkAlt /> Open Reset Page
                </a>
              </div>

              <div className="um-expiry-notice">
                <span>⏱️ Token &amp; Code expire in <strong>60 minutes</strong>. The customer must choose a <strong>new password</strong> different from their previous one.</span>
              </div>
            </>
          )}
        </div>

        <div className="um-reset-modal-footer">
          <button type="button" className="um-btn-close" onClick={onClose}>
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UsersManagement;