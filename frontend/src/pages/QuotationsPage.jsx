import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  Plus,
  Send,
  Check,
  Ban,
  ArrowRight,
  X,
  Info,
  ScrollText,
  Timer,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { quotationAPI, enquiryAPI, productAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Field, Alert } from '../components/ui/Field';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { TableWrapper, Td } from '../components/ui/Table';
import { PageHeader, StatCard } from '../components/ui/Card';
import { statusTone, formatCurrency } from '../lib/status';

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
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnquirySelect = (enquiryId) => {
    const enq = enquiries.find((e) => e.id === parseInt(enquiryId));
    if (enq) {
      setFormData({
        enquiryId,
        validUntil: formData.validUntil,
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

  const updateItem = (index, field, value) =>
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));

  const calcLineAmount = (item) => {
    const base = (item.quantity || 0) * (parseFloat(item.unitPrice) || 0);
    const afterDiscount = base * (1 - (parseFloat(item.discountPct) || 0) / 100);
    return afterDiscount * (1 + (parseFloat(item.gstPct) || 0) / 100);
  };

  const calcTotal = () => formData.items.reduce((sum, item) => sum + calcLineAmount(item), 0);

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
      setSuccess('Quotation created successfully.');
      setShowForm(false);
      setFormData({ enquiryId: '', validUntil: '', items: [] });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create quotation.');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      setError('');
      await quotationAPI.updateStatus(id, status);
      setSuccess(`Quotation moved to ${status}.`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleConvert = async (id) => {
    try {
      setError('');
      await quotationAPI.convert(id);
      setSuccess('Sales order created from quotation.');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create sales order.');
    }
  };

  const counts = {
    total: quotations.length,
    draft: quotations.filter((q) => q.status === 'DRAFT').length,
    sent: quotations.filter((q) => q.status === 'SENT').length,
    accepted: quotations.filter((q) => q.status === 'ACCEPTED').length,
    rejected: quotations.filter((q) => q.status === 'REJECTED').length,
  };

  return (
    <div className="pb-12">
      <PageHeader
        title="Quotations"
        description="Price requirements and manage the funnel to acceptance."
        actions={
          user.role === 'SALES' && (
            <Button
              icon={showForm ? X : Plus}
              variant={showForm ? 'secondary' : 'primary'}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Close form' : 'New quotation'}
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
          <div className="mt-4 card-surface overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <p className="text-sm font-semibold text-zinc-900">All quotations</p>
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
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total quotations" value={counts.total} icon={FileText} accent="indigo" />
            <StatCard label="Draft" value={counts.draft} icon={ScrollText} accent="zinc" sub="Not yet sent" />
            <StatCard label="Sent" value={counts.sent} icon={Timer} accent="amber" sub="Awaiting decision" />
            <StatCard label="Accepted" value={counts.accepted} icon={CheckCircle2} accent="emerald" sub={`${counts.rejected} rejected`} />
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
                      <FileText size={17} />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-900">Create quotation</h2>
                      <p className="text-xs text-zinc-500">Prices are computed and validated server-side.</p>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="Enquiry reference" required>
                        <select
                          className="field"
                          value={formData.enquiryId}
                          onChange={(e) => handleEnquirySelect(e.target.value)}
                          required
                        >
                          <option value="">Select enquiry</option>
                          {enquiries
                            .filter((e) => e.status === 'NEW' || e.status === 'QUOTED')
                            .map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.enquiryNumber} - {e.customer?.companyName}
                              </option>
                            ))}
                        </select>
                      </Field>
                      <Field label="Valid until" hint="Leave empty for no expiry">
                        <input
                          type="date"
                          className="field"
                          value={formData.validUntil}
                          onChange={(e) => setFormData((prev) => ({ ...prev, validUntil: e.target.value }))}
                        />
                      </Field>
                    </div>

                    {formData.items.length > 0 && (
                      <div className="mt-6">
                        <h3 className="mb-3 text-sm font-semibold text-zinc-800">Quotation items</h3>
                        <div className="overflow-x-auto rounded-xl border border-zinc-200">
                          <table className="w-full min-w-[720px] text-left text-sm">
                            <thead>
                              <tr className="bg-zinc-50/60">
                                {['Product', 'Qty', 'Unit price', 'Discount %', 'GST %', 'Line amount'].map((h) => (
                                  <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                              {formData.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-4 py-2.5 text-zinc-700">
                                    {item.productName || `Product #${item.productId}`}
                                  </td>
                                  <td className="w-20 px-2 py-2.5">
                                    <input
                                      type="number"
                                      min="1"
                                      className="field-muted w-16"
                                      value={item.quantity}
                                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                      required
                                    />
                                  </td>
                                  <td className="w-28 px-2 py-2.5">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="field-muted w-24"
                                      value={item.unitPrice}
                                      onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                      required
                                      placeholder="0.00"
                                    />
                                  </td>
                                  <td className="w-20 px-2 py-2.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="field-muted w-16"
                                      value={item.discountPct}
                                      onChange={(e) => updateItem(idx, 'discountPct', e.target.value)}
                                    />
                                  </td>
                                  <td className="w-20 px-2 py-2.5">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      className="field-muted w-16"
                                      value={item.gstPct}
                                      onChange={(e) => updateItem(idx, 'gstPct', e.target.value)}
                                    />
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-[13px] font-medium text-zinc-800">
                                    {formatCurrency(calcLineAmount(item))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-zinc-200 bg-zinc-50/50">
                                <td colSpan={5} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                  Grand total
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-base font-semibold text-zinc-900">
                                  {formatCurrency(calcTotal())}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                          <Info size={13} className="text-zinc-300" />
                          Final amounts are calculated and validated by the server.
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 pt-5">
                      <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" icon={Plus} disabled={formData.items.length === 0}>
                        Create quotation
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
                { key: 'ref', label: 'Quotation' },
                { key: 'enquiry', label: 'Enquiry' },
                { key: 'customer', label: 'Customer' },
                { key: 'items', label: 'Items' },
                { key: 'total', label: 'Grand total' },
                { key: 'status', label: 'Status' },
                { key: 'so', label: 'Sales order' },
                { key: 'actions', label: 'Actions' },
              ]}
              header={
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <FileText size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">All quotations</h2>
                    <p className="text-xs text-zinc-500">{quotations.length} records</p>
                  </div>
                </div>
              }
            >
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-2">
                    <EmptyState
                      icon={FileText}
                      title="No quotations yet"
                      message="Create a quotation from an enquiry to start pricing."
                    />
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <motion.tr
                    key={q.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="transition-colors hover:bg-zinc-50/70"
                  >
                    <Td className="whitespace-nowrap font-mono text-[13px] font-medium text-zinc-800">
                      {q.quotationNumber}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[13px] text-zinc-500">
                      {q.enquiry?.enquiryNumber}
                    </Td>
                    <Td>
                      <p className="font-medium text-zinc-800">{q.customer?.companyName}</p>
                    </Td>
                    <Td>
                      <div className="space-y-1">
                        {q.items?.map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center gap-1.5 text-[13px] text-zinc-600">
                            <span className="size-1 rounded-full bg-zinc-300" />
                            {item.product?.productName}
                            <span className="font-mono text-xs text-zinc-400">
                              &times;{item.quantity} @ {formatCurrency(item.unitPrice)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[13px] font-semibold text-zinc-900">
                      {formatCurrency(q.grandTotal)}
                    </Td>
                    <Td>
                      <Badge tone={statusTone.quotation(q.status)}>{q.status}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[13px] text-zinc-500">
                      {q.salesOrder?.orderNumber || <span className="text-zinc-300">-</span>}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {user.role === 'SALES' && (
                          <>
                            {q.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="subtle"
                                icon={Send}
                                onClick={() => handleStatusUpdate(q.id, 'SENT')}
                              >
                                Send
                              </Button>
                            )}
                            {q.status === 'SENT' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="success"
                                  icon={Check}
                                  onClick={() => handleStatusUpdate(q.id, 'ACCEPTED')}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  icon={Ban}
                                  className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => handleStatusUpdate(q.id, 'REJECTED')}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {q.status === 'ACCEPTED' && !q.salesOrder && (
                              <Button
                                size="sm"
                                icon={ArrowRight}
                                onClick={() => handleConvert(q.id)}
                              >
                                Sales order
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </Td>
                  </motion.tr>
                ))
              )}
            </TableWrapper>
          </div>
        </>
      )}
    </div>
  );
}