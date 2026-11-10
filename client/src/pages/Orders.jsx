import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { getMyOrders } from '../api/api';

function Orders() {
  const { user, isCustomer, isAdmin } = useContext(AppContext);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (isCustomer) {
      getMyOrders().then(res => setOrders(res.data.data)).catch(() => setOrders([]));
    }
  }, [isCustomer]);

  if (!user && !isCustomer) return <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>Please log in to view your orders.</div>;

  return (
    <div>
      <h2>Your Orders</h2>
      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <ul>
          {orders.map(order => (
            <li key={order._id}>
              Order #{order._id} - {order.status} - {order.total} KSh
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Orders;