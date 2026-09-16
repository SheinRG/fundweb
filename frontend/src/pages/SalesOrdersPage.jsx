import { useState, useEffect } from 'react';
import { salesOrderAPI, inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function SalesOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDispatchForm, setShowDispatchForm] = useState(null);
  const [dispatchData, setDispatchData] = useState({
    dispatchDate: new Date().toISOString().split('T')[0],
    vehicleNumber: '',
    driverName: '',
    items: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordRes, invRes] = await Promise.all([
        salesOrderAPI.list(),
        inventoryAPI.list(),
      ]);
      setOrders(ordRes.data);
      setInventory(invRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (orderId) => {
    if (!window.confirm('Confirm this order? This will reserve inventory.')) return;

    try {
      setError('');
      await salesOrderAPI.confirm(orderId);
      setSuccess('Order confirmed and inventory reserved!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm order');
    }
  };

  const openDispatchForm = (order) => {
    setShowDispatchForm(order.id);
    setDispatchData({
      dispatchDate: new Date().toISOString().split('T')[0],
      vehicleNumber: '',
      driverName: '',
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.product?.productName || '',
        quantity: item.quantity,
        maxQty: item.quantity,
      })),
    });
  };

  const handleDispatch = async (orderId) => {
    try {
      setError('');
      const payload = {
        dispatchDate: dispatchData.dispatchDate,
        vehicleNumber: dispatchData.vehicleNumber || undefined,
        driverName: dispatchData.driverName || undefined,
        items: dispatchData.items.map((item) => ({
          productId: item.productId,
          quantity: parseInt(item.quantity),
        })),
      };

      await salesOrderAPI.dispatch(orderId, payload);
      setSuccess('Order dispatched successfully!');
      setShowDispatchForm(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch order');
    }
  };

  const updateDispatchItem = (index, field, value) => {
    setDispatchData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const statusClass = (status) => {
    const map = {
      PENDING: 'status-new',
      CONFIRMED: 'status-won',
      DISPATCHED: 'status-sent',
      CANCELLED: 'status-lost',
    };
    return map[status] || '';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  const getInventoryForProduct = (productId) => {
    return inventory.find((inv) => inv.productId === productId);
  };

  if (loading) return <div className="loading">Loading sales orders...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sales Orders</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Inventory Overview */}
      <div className="card">
        <h2>📊 Inventory Overview</h2>
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Product</th>
              <th>Code</th>
              <th>Physical</th>
              <th>Reserved</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.product?.productName}</td>
                <td className="mono">{inv.product?.productCode}</td>
                <td>{inv.physicalQty}</td>
                <td>{inv.reservedQty}</td>
                <td className={inv.availableQty <= 0 ? 'text-danger' : inv.availableQty < 20 ? 'text-warning' : 'text-success'}>
                  <strong>{inv.availableQty}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Orders Table */}
      <div className="card">
        <h2>📦 Orders</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Quotation</th>
              <th>Customer</th>
              <th>Items & Stock</th>
              <th>Total</th>
              <th>Status</th>
              <th>Dispatches</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="8" className="empty">No sales orders found</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="mono">{order.orderNumber}</td>
                  <td className="mono">{order.quotation?.quotationNumber}</td>
                  <td>{order.customer?.companyName}</td>
                  <td>
                    {order.items?.map((item) => {
                      const inv = getInventoryForProduct(item.productId);
                      return (
                        <div key={item.id} className="item-line">
                          {item.product?.productName} × {item.quantity}
                          {inv && (
                            <span className="stock-info">
                              (avail: <span className={inv.availableQty >= item.quantity ? 'text-success' : 'text-danger'}>
                                {inv.availableQty}
                              </span>)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </td>
                  <td className="mono">{formatCurrency(Number(order.totalAmount))}</td>
                  <td><span className={`status-badge ${statusClass(order.status)}`}>{order.status}</span></td>
                  <td>
                    {order.dispatches?.length > 0 ? (
                      order.dispatches.map((d) => (
                        <div key={d.id} className="mono">{d.dispatchNumber}</div>
                      ))
                    ) : '—'}
                  </td>
                  <td className="actions">
                    {user.role === 'ADMIN' && (
                      <>
                        {order.status === 'PENDING' && (
                          <button className="btn btn-small btn-success" onClick={() => handleConfirm(order.id)}>
                            ✓ Confirm
                          </button>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <button className="btn btn-small btn-primary" onClick={() => openDispatchForm(order)}>
                            🚚 Dispatch
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dispatch Form Modal */}
      {showDispatchForm && (
        <div className="modal-overlay" onClick={() => setShowDispatchForm(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <h2>🚚 Process Dispatch</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Dispatch Date *</label>
                <input
                  type="date"
                  value={dispatchData.dispatchDate}
                  onChange={(e) => setDispatchData((prev) => ({ ...prev, dispatchDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Vehicle Number</label>
                <input
                  value={dispatchData.vehicleNumber}
                  onChange={(e) => setDispatchData((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                  placeholder="e.g. MH-12-AB-1234"
                />
              </div>
              <div className="form-group">
                <label>Driver Name</label>
                <input
                  value={dispatchData.driverName}
                  onChange={(e) => setDispatchData((prev) => ({ ...prev, driverName: e.target.value }))}
                  placeholder="Driver name"
                />
              </div>
            </div>

            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Order Qty</th>
                  <th>Dispatch Qty</th>
                </tr>
              </thead>
              <tbody>
                {dispatchData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.productName}</td>
                    <td>{item.maxQty}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max={item.maxQty}
                        value={item.quantity}
                        onChange={(e) => updateDispatchItem(idx, 'quantity', e.target.value)}
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="form-actions">
              <button className="btn btn-primary" onClick={() => handleDispatch(showDispatchForm)}>
                Confirm Dispatch
              </button>
              <button className="btn btn-secondary" onClick={() => setShowDispatchForm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
