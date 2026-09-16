import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Inbox,
  Plus,
  UserPlus,
  X,
  Trash2,
  Users,
  FileText,
  Trophy,
  TrendingUp,
  Search,
  Phone,
  Package,
} from 'lucide-react';
import { enquiryAPI, customerAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Field, Alert } from '../components/ui/Field';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { TableWrapper, Td } from '../components/ui/Table';
import { PageHeader, StatCard, CardHeader } from '../components/ui/Card';
import { statusTone } from '../lib/status';

export default function EnquiriesPage() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    customerId: '',
    enquiryDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    notes: '',
    items: [{ productId: '', quantity: '' }],
  });

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    city: '',
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
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () =>
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '' }],
    }));

  const removeItem = (index) =>
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const updateItem = (index, field, value) =>
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));

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
      setSuccess('Enquiry created successfully.');
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
      setError(err.response?.data?.error || 'Failed to create enquiry.');
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
      setError(err.response?.data?.error || 'Failed to create customer.');
    }
  };

  const counts = {
    total: enquiries.length,
    new: enquiries.filter((e) => e.status === 'NEW').length,
    quoted: enquiries.filter((e) => e.status === 'QUOTED').length,
    won: enquiries.filter((e) => e.status === 'WON').length,
  };

  return (
    <div className="pb-12">
      <PageHeader
        title="Enquiries"
        description="Track incoming customer requirements from intake to award."
        actions={
          user.role === 'SALES' && (
            <Button
              icon={showForm ? X : Plus}
              variant={showForm ? 'secondary' : 'primary'}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Close form' : 'New enquiry'}
            </Button>
          )
        }
      />

      <AnimatePresence>
        {error && (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4">
            <Alert tone="error" onDismiss={() => setError('')}>{error}</Alert>
          </motion.div>
        )}
        {success && (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-4">
            <Alert tone="success" onDismiss={() => setSuccess('')}>{success}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <>
          <CardSkeleton count={4} />
          <div className="mt-4 card-surface overflow-hidden p-0">
            <div className="border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-semibold text-zinc-900">All enquiries</p>
            </div>
            <div className="animate-pulse space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 rounded-xl bg-zinc-100" />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <motion.div
            layout
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <StatCard label="Total enquiries" value={counts.total} icon={Inbox} accent="indigo" sub="All time" />
            <StatCard label="New" value={counts.new} icon={FileText} accent="sky" sub="Awaiting quotation" />
            <StatCard label="Quoted" value={counts.quoted} icon={TrendingUp} accent="amber" sub="In negotiation" />
            <StatCard label="Won" value={counts.won} icon={Trophy} accent="emerald" sub="Converted to orders" />
          </motion.div>

          <AnimatePresence>
            {showForm && (
              <motion.div
                layout
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="mt-4"
              >
                <div className="card-surface border-t-2 border-t-indigo-500 p-6">
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Inbox size={17} />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">Create new enquiry</h2>
                      <p className="text-xs text-zinc-500">Capture the customer requirement and line items.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field label="Customer" required className="md:col-span-1">
                        <div className="flex gap-2">
                          <select
                            className="field"
                            value={formData.customerId}
                            onChange={(e) => setFormData((prev) => ({ ...prev, customerId: e.target.value }))}
                            required
                          >
                            <option value="">Select customer</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>{c.companyName}</option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => setShowCustomerForm(true)}
                            title="New customer"
                            icon={UserPlus}
                          />
                        </div>
                      </Field>
                      <Field label="Enquiry date" required>
                        <input
                          type="date"
                          className="field"
                          value={formData.enquiryDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, enquiryDate: e.target.value }))}
                          required
                        />
                      </Field>
                      <Field label="Required by" hint="Optional target date">
                        <input
                          type="date"
                          className="field"
                          value={formData.requiredDate}
                          onChange={(e) => setFormData((prev) => ({ ...prev, requiredDate: e.target.value }))}
                        />
                      </Field>
                    </div>

                    <Field label="Notes" className="mt-4">
                      <textarea
                        className="field min-h-[72px] resize-none"
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add context, delivery expectations or special instructions..."
                      />
                    </Field>

                    <div className="mt-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
                            <Package size={15} strokeWidth={2} />
                          </span>
                          <h3 className="text-sm font-semibold text-zinc-800">Products requested</h3>
                        </div>
                        <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={addItem}>
                          Add product
                        </Button>
                      </div>

                      <div className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200">
                        <div className="hidden grid-cols-[1fr_9rem_2.5rem] gap-3 bg-zinc-50/60 px-4 py-2.5 sm:grid">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Product</span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">Quantity</span>
                          <span />
                        </div>
                        {formData.items.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_9rem_2.5rem] sm:items-center">
                            <select
                              className="field"
                              value={item.productId}
                              onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                              required
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.productCode} - {p.productName} ({p.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              min="1"
                              className="field"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                              required
                              placeholder="Qty"
                            />
                            <button
                              type="button"
                              disabled={formData.items.length === 1}
                              onClick={() => removeItem(idx)}
                              className="inline-flex size-8 items-center justify-center justify-self-start rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30 disabled:hover:bg-transparent sm:justify-self-end"
                              title="Remove line"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
                      <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" icon={Plus}>
                        Create enquiry
                      </Button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-4">
            <TableWrapper
              columns={[
                { key: 'ref', label: 'Enquiry' },
                { key: 'customer', label: 'Customer' },
                { key: 'date', label: 'Date' },
                { key: 'products', label: 'Products' },
                { key: 'status', label: 'Status' },
                { key: 'owner', label: 'Recorded by' },
              ]}
              header={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                      <Search size={16} />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">All enquiries</h2>
                      <p className="text-xs text-zinc-500">{enquiries.length} records</p>
                    </div>
                  </div>
                </div>
              }
            >
              {enquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-2">
                    <EmptyState
                      icon={Inbox}
                      title="No enquiries yet"
                      message="New customer requirements will appear here as they are recorded."
                    />
                  </td>
                </tr>
              ) : (
                enquiries.map((enq) => (
                  <motion.tr
                    key={enq.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="transition-colors hover:bg-zinc-50/70"
                  >
                    <Td className="whitespace-nowrap font-mono text-[13px] font-medium text-zinc-800">
                      {enq.enquiryNumber}
                    </Td>
                    <Td>
                      <p className="font-medium text-zinc-800">{enq.customer?.companyName}</p>
                      {enq.customer?.city && (
                        <p className="mt-0.5 text-xs text-zinc-400">{enq.customer.city}</p>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-zinc-600">
                      {new Date(enq.enquiryDate).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Td>
                    <Td>
                      <div className="space-y-1">
                        {enq.items?.map((item) => (
                          <div key={item.id} className="flex items-center gap-1.5 text-[13px] text-zinc-600">
                            <span className="size-1 rounded-full bg-zinc-300" />
                            {item.product?.productName}
                            <span className="font-mono text-xs text-zinc-400">&times;{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={statusTone.enquiry(enq.status)}>{enq.status}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap text-zinc-600">
                      <span className="flex items-center gap-2">
                        <span className="flex size-6 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-semibold text-zinc-500">
                          {(enq.createdBy?.name || '?').slice(0, 1)}
                        </span>
                        {enq.createdBy?.name}
                      </span>
                    </Td>
                  </motion.tr>
                ))
              )}
            </TableWrapper>
          </div>
        </>
      )}

      <Modal
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        title="New customer"
        description="Add a customer to use in this enquiry."
        icon={Users}
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <Field label="Company name" required>
            <input
              className="field"
              value={newCustomer.companyName}
              onChange={(e) => setNewCustomer((p) => ({ ...p, companyName: e.target.value }))}
              required
              placeholder="Acme Industries Ltd."
            />
          </Field>
          <Field label="Contact person" required>
            <input
              className="field"
              value={newCustomer.contactPerson}
              onChange={(e) => setNewCustomer((p) => ({ ...p, contactPerson: e.target.value }))}
              required
              placeholder="Full name"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mobile" required>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  className="field pl-9"
                  value={newCustomer.mobile}
                  onChange={(e) => setNewCustomer((p) => ({ ...p, mobile: e.target.value }))}
                  required
                  placeholder="98XXXXXXXX"
                />
              </div>
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                className="field"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer((p) => ({ ...p, email: e.target.value }))}
                required
                placeholder="contact@acme.com"
              />
            </Field>
          </div>
          <Field label="City" required>
            <input
              className="field"
              value={newCustomer.city}
              onChange={(e) => setNewCustomer((p) => ({ ...p, city: e.target.value }))}
              required
              placeholder="Mumbai"
            />
          </Field>
          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCustomerForm(false)}>
              Cancel
            </Button>
            <Button type="submit" icon={UserPlus}>
              Create customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}