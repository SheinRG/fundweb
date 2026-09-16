import { useState, useEffect } from 'react';
import { enquiryAPI, customerAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EnquiriesPage() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    notes: '',
    items: [{ productId: '', quantity: '' }],
  });

  // New customer form
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    companyName: '', contactPerson: '', mobile: '', email: '', city: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [enqRes, custRes, prodRes] = await Promise.all([
        enquiryAPI.list(),
        customerAPI.list(),
        productAPI.list(),
      ]);
      setEnquiries(enqRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '' }],
    }));
  };

  const removeItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        customerId: parseInt(formData.customerId),
        enquiryDate: formData.enquiryDate,
        requiredDate: formData.requiredDate || undefined,
        notes: formData.notes || undefined,
        items: formData.items.map((item) => ({
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
        })),
      };

      await enquiryAPI.create(payload);
      setSuccess('Enquiry created successfully!');
      setShowForm(false);
      setFormData({
        customerId: '',
        enquiryDate: new Date().toISOString().split('T')[0],
        requiredDate: '',
        notes: '',
        items: [{ productId: '', quantity: '' }],
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create enquiry');
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await customerAPI.create(newCustomer);
      setCustomers((prev) => [res.data, ...prev]);
      setFormData((prev) => ({ ...prev, customerId: res.data.id.toString() }));
      setShowCustomerForm(false);
      setNewCustomer({ companyName: '', contactPerson: '', mobile: '', email: '', city: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create customer');
    }
  };

  const statusClass = (status) => {
    const map = { NEW: 'status-new', QUOTED: 'status-quoted', WON: 'status-won', LOST: 'status-lost' };
    return map[status] || '';
  };

  if (loading) return <div className="loading">Loading enquiries...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Enquiries</h1>
        {user.role === 'SALES' && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Enquiry'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card form-card">
          <h2>Create New Enquiry</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Customer *</label>
                <div className="input-with-action">
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-small" onClick={() => setShowCustomerForm(true)}>
                    + New
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Enquiry Date *</label>
                <input
                  type="date"
                  value={formData.enquiryDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, enquiryDate: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Required Date</label>
                <input
                  type="date"
                  value={formData.requiredDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, requiredDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                rows="2"
              />
            </div>

            <div className="items-section">
              <div className="items-header">
                <h3>Products</h3>
                <button type="button" className="btn btn-small" onClick={addItem}>+ Add Product</button>
              </div>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.productCode} — {p.productName}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          required
                          placeholder="Qty"
                        />
                      </td>
                      <td>
                        {formData.items.length > 1 && (
                          <button type="button" className="btn btn-danger btn-small" onClick={() => removeItem(idx)}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Create Enquiry</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* New Customer Modal */}
      {showCustomerForm && (
        <div className="modal-overlay" onClick={() => setShowCustomerForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Customer</h2>
            <form onSubmit={handleCreateCustomer}>
              <div className="form-group">
                <label>Company Name *</label>
                <input value={newCustomer.companyName} onChange={(e) => setNewCustomer((p) => ({ ...p, companyName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Contact Person *</label>
                <input value={newCustomer.contactPerson} onChange={(e) => setNewCustomer((p) => ({ ...p, contactPerson: e.target.value }))} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Mobile *</label>
                  <input value={newCustomer.mobile} onChange={(e) => setNewCustomer((p) => ({ ...p, mobile: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input value={newCustomer.city} onChange={(e) => setNewCustomer((p) => ({ ...p, city: e.target.value }))} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">Create</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enquiries Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Enquiry #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Products</th>
              <th>Status</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            {enquiries.length === 0 ? (
              <tr><td colSpan="6" className="empty">No enquiries found</td></tr>
            ) : (
              enquiries.map((enq) => (
                <tr key={enq.id}>
                  <td className="mono">{enq.enquiryNumber}</td>
                  <td>{enq.customer?.companyName}</td>
                  <td>{new Date(enq.enquiryDate).toLocaleDateString()}</td>
                  <td>
                    {enq.items?.map((item) => (
                      <div key={item.id} className="item-line">
                        {item.product?.productName} × {item.quantity}
                      </div>
                    ))}
                  </td>
                  <td><span className={`status-badge ${statusClass(enq.status)}`}>{enq.status}</span></td>
                  <td>{enq.createdBy?.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
