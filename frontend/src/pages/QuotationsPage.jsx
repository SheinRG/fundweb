import { useState, useEffect } from 'react';
import { quotationAPI, enquiryAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function QuotationsPage() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    enquiryId: '',
    validUntil: '',
    items: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qtnRes, enqRes, prodRes] = await Promise.all([
        quotationAPI.list(),
        enquiryAPI.list(),
        productAPI.list(),
      ]);
      setQuotations(qtnRes.data);
      setEnquiries(enqRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // When enquiry is selected, pre-populate items from enquiry
  const handleEnquirySelect = (enquiryId) => {
    const enq = enquiries.find((e) => e.id === parseInt(enquiryId));
    if (enq) {
      setFormData({
        ...formData,
        enquiryId,
        items: enq.items.map((item) => ({
          productId: item.productId,
          productName: item.product?.productName || '',
          quantity: item.quantity,
          unitPrice: '',
          discountPct: 0,
          gstPct: 18,
        })),
      });
    }
  };

  const updateItem = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  // Calculate line amount (display only — backend recomputes)
  const calcLineAmount = (item) => {
    const base = (item.quantity || 0) * (parseFloat(item.unitPrice) || 0);
    const afterDiscount = base * (1 - (parseFloat(item.discountPct) || 0) / 100);
    return afterDiscount * (1 + (parseFloat(item.gstPct) || 0) / 100);
  };

  const calcTotal = () => {
    return formData.items.reduce((sum, item) => sum + calcLineAmount(item), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        enquiryId: parseInt(formData.enquiryId),
        validUntil: formData.validUntil || undefined,
        items: formData.items.map((item) => ({
          productId: parseInt(item.productId),
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          discountPct: parseFloat(item.discountPct) || 0,
          gstPct: parseFloat(item.gstPct) || 0,
        })),
      };

      await quotationAPI.create(payload);
      setSuccess('Quotation created successfully!');
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quotation');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      setError('');
      await quotationAPI.updateStatus(id, status);
      setSuccess(`Quotation status updated to ${status}`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleConvert = async (id) => {
    try {
      setError('');
      await quotationAPI.convert(id);
      setSuccess('Sales Order created successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to convert quotation');
    }
  };

  const statusClass = (status) => {
    const map = { DRAFT: 'status-draft', SENT: 'status-sent', ACCEPTED: 'status-won', REJECTED: 'status-lost' };
    return map[status] || '';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  if (loading) return <div className="loading">Loading quotations...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Quotations</h1>
        {user.role === 'SALES' && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Quotation'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card form-card">
          <h2>Create Quotation</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Enquiry Reference *</label>
                <select
                  value={formData.enquiryId}
                  onChange={(e) => handleEnquirySelect(e.target.value)}
                  required
                >
                  <option value="">Select Enquiry</option>
                  {enquiries
                    .filter((e) => e.status === 'NEW' || e.status === 'QUOTED')
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.enquiryNumber} — {e.customer?.companyName}
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label>Valid Until</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value }))}
                />
              </div>
            </div>

            {formData.items.length > 0 && (
              <div className="items-section">
                <h3>Quotation Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price (₹)</th>
                      <th>Discount %</th>
                      <th>GST %</th>
                      <th>Line Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.productName || `Product #${item.productId}`}</td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                            required
                            placeholder="0.00"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPct}
                            onChange={(e) => updateItem(idx, 'discountPct', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.gstPct}
                            onChange={(e) => updateItem(idx, 'gstPct', e.target.value)}
                          />
                        </td>
                        <td className="mono">{formatCurrency(calcLineAmount(item))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="text-right"><strong>Grand Total (estimated):</strong></td>
                      <td className="mono"><strong>{formatCurrency(calcTotal())}</strong></td>
                    </tr>
                  </tfoot>
                </table>
                <p className="note">* Final amounts are calculated and validated by the server.</p>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={formData.items.length === 0}>
                Create Quotation
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Quotations Table */}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quotation #</th>
              <th>Enquiry</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th>Sales Order</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotations.length === 0 ? (
              <tr><td colSpan="8" className="empty">No quotations found</td></tr>
            ) : (
              quotations.map((q) => (
                <tr key={q.id}>
                  <td className="mono">{q.quotationNumber}</td>
                  <td className="mono">{q.enquiry?.enquiryNumber}</td>
                  <td>{q.customer?.companyName}</td>
                  <td>
                    {q.items?.map((item) => (
                      <div key={item.id} className="item-line">
                        {item.product?.productName} × {item.quantity} @ {formatCurrency(Number(item.unitPrice))}
                      </div>
                    ))}
                  </td>
                  <td className="mono">{formatCurrency(Number(q.grandTotal))}</td>
                  <td><span className={`status-badge ${statusClass(q.status)}`}>{q.status}</span></td>
                  <td className="mono">{q.salesOrder?.orderNumber || '—'}</td>
                  <td className="actions">
                    {user.role === 'SALES' && (
                      <>
                        {q.status === 'DRAFT' && (
                          <button className="btn btn-small btn-primary" onClick={() => handleStatusUpdate(q.id, 'SENT')}>
                            Send
                          </button>
                        )}
                        {q.status === 'SENT' && (
                          <>
                            <button className="btn btn-small btn-success" onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}>
                              Accept
                            </button>
                            <button className="btn btn-small btn-danger" onClick={() => handleStatusUpdate(q.id, 'REJECTED')}>
                              Reject
                            </button>
                          </>
                        )}
                        {q.status === 'ACCEPTED' && !q.salesOrder && (
                          <button className="btn btn-small btn-primary" onClick={() => handleConvert(q.id)}>
                            → Sales Order
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
    </div>
  );
}
