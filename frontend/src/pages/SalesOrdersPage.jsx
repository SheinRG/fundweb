import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package,
  Truck,
  CheckCircle2,
  Check,
  Download,
  Boxes,
  Archive,
  Layers,
  AlertTriangle,
  PackageCheck,
} from 'lucide-react';
import { salesOrderAPI, inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { Field, Alert } from '../components/ui/Field';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { TableWrapper, Td } from '../components/ui/Table';
import { PageHeader, StatCard } from '../components/ui/Card';
import { statusTone, availableTone, formatCurrency } from '../lib/status';

export default function SalesOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [confirming, setConfirming] = useState(false);
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
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmingOrder) return;
    setConfirming(true);
    try {
      setError('');
      await salesOrderAPI.confirm(confirmingOrder.id);
      setSuccess('Order confirmed and inventory reserved.');
      setConfirmingOrder(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm order.');
    } finally {
      setConfirming(false);
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
      setSuccess('Order dispatched successfully.');
      setShowDispatchForm(null);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to dispatch order.');
    }
  };

  const updateDispatchItem = (index, field, value) =>
    setDispatchData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));

  const getInventoryForProduct = (productId) =>
    inventory.find((inv) => inv.productId === productId);

  const availability = (qty) =>
    qty <= 0 ? 'low' : qty < 20 ? 'medium' : 'high';

  const kpis = inventory.reduce(
    (acc, inv) => ({
      skus: acc.skus + 1,
      physical: acc.physical + inv.physicalQty,
      reserved: acc.reserved + inv.reservedQty,
      available: acc.available + (inv.availableQty || 0),
    }),
    { skus: 0, physical: 0, reserved: 0, available: 0 }
  );

  return (
    <div className="pb-12">
      <PageHeader
        title="Sales Orders"
        description="Confirm orders, reserve inventory and manage dispatches."
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
              <p className="text-sm font-semibold text-zinc-900">Orders</p>
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
            <StatCard label="Products on floor" value={kpis.skus} icon={Boxes} accent="indigo" sub="SKUs tracked" />
            <StatCard label="Physical stock" value={kpis.physical} icon={Archive} accent="sky" sub="Units in warehouse" />
            <StatCard label="Reserved" value={kpis.reserved} icon={Layers} accent="amber" sub="Held against orders" />
            <StatCard label="Available" value={kpis.available} icon={PackageCheck} accent="emerald" sub="Ready to allocate" />
          </motion.div>

          <div className="mt-4">
            <TableWrapper
              columns={[
                { key: 'product', label: 'Product' },
                { key: 'code', label: 'Code' },
                { key: 'physical', label: 'Physical', className: 'text-right' },
                { key: 'reserved', label: 'Reserved', className: 'text-right' },
                { key: 'available', label: 'Available', className: 'text-right' },
                { key: 'bar', label: 'Utilisation' },
              ]}
              header={
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <Package size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">Inventory overview</h2>
                    <p className="text-xs text-zinc-500">Live stock position per product</p>
                  </div>
                </div>
              }
            >
              {inventory.map((inv) => {
                const available = inv.availableQty || 0;
                const pct = inv.physicalQty > 0 ? Math.round((available / inv.physicalQty) * 100) : 0;
                return (
                  <motion.tr
                    key={inv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="transition-colors hover:bg-zinc-50/70"
                  >
                    <Td>
                      <p className="font-medium text-zinc-800">{inv.product?.productName}</p>
                      <p className="text-xs text-zinc-400">{inv.product?.category}</p>
                    </Td>
                    <Td className="font-mono text-[13px] text-zinc-500">{inv.product?.productCode}</Td>
                    <Td className="text-right font-mono text-[13px] text-zinc-700">{inv.physicalQty}</Td>
                    <Td className="text-right font-mono text-[13px] text-zinc-700">{inv.reservedQty}</Td>
                    <Td className="text-right">
                      <Badge tone={availableTone[availability(available)]}>
                        {available} avail.
                      </Badge>
                    </Td>
                    <Td className="w-40">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${
                            availability(available) === 'low'
                              ? 'bg-rose-400'
                              : availability(available) === 'medium'
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Td>
                  </motion.tr>
                );
              })}
            </TableWrapper>
          </div>

          <div className="mt-4">
            <TableWrapper
              columns={[
                { key: 'order', label: 'Order' },
                { key: 'quotation', label: 'Quotation' },
                { key: 'customer', label: 'Customer' },
                { key: 'items', label: 'Items & stock' },
                { key: 'total', label: 'Total' },
                { key: 'status', label: 'Status' },
                { key: 'dispatches', label: 'Dispatches' },
                { key: 'actions', label: 'Actions' },
              ]}
              header={
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
                    <Package size={16} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-900">Orders</h2>
                    <p className="text-xs text-zinc-500">{orders.length} records</p>
                  </div>
                </div>
              }
            >
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-2">
                    <EmptyState
                      icon={Package}
                      title="No sales orders yet"
                      message="Accepted quotations flow in here for confirmation and dispatch."
                    />
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="transition-colors hover:bg-zinc-50/70"
                  >
                    <Td className="whitespace-nowrap font-mono text-[13px] font-medium text-zinc-800">
                      {order.orderNumber}
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[13px] text-zinc-500">
                      {order.quotation?.quotationNumber}
                    </Td>
                    <Td>
                      <p className="font-medium text-zinc-800">{order.customer?.companyName}</p>
                    </Td>
                    <Td>
                      <div className="space-y-1">
                        {order.items?.map((item) => {
                          const inv = getInventoryForProduct(item.productId);
                          return (
                            <div key={item.id} className="flex items-center gap-1.5 text-[13px] text-zinc-600">
                              <span className="size-1 rounded-full bg-zinc-300" />
                              {item.product?.productName}
                              <span className="font-mono text-xs text-zinc-400">&times;{item.quantity}</span>
                              {inv && (
                                <Badge
                                  tone={availability(inv.availableQty)}
                                  className={`px-1.5 py-0 text-[10px] ${
                                    inv.availableQty >= item.quantity
                                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                      : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                                  }`}
                                >
                                  {inv.availableQty} in stock
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap font-mono text-[13px] font-semibold text-zinc-900">
                      {formatCurrency(order.totalAmount)}
                    </Td>
                    <Td>
                      <Badge tone={statusTone.order(order.status)}>{order.status}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {order.dispatches?.length > 0 ? (
                        <div className="space-y-1">
                          {order.dispatches.map((d) => (
                            <div key={d.id} className="font-mono text-xs text-zinc-500">
                              {d.dispatchNumber}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {user.role === 'ADMIN' && (
                          <>
                            {order.status === 'PENDING' && (
                              <Button
                                size="sm"
                                variant="success"
                                icon={Check}
                                onClick={() => setConfirmingOrder(order)}
                              >
                                Confirm
                              </Button>
                            )}
                            {order.status === 'CONFIRMED' && (
                              <Button
                                size="sm"
                                variant="primary"
                                icon={Truck}
                                onClick={() => openDispatchForm(order)}
                              >
                                Dispatch
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

      <Modal
        open={!!confirmingOrder}
        onClose={() => !confirming && setConfirmingOrder(null)}
        title="Confirm sales order"
        description={confirmingOrder ? `Reserve inventory for ${confirmingOrder.orderNumber}.` : ''}
        icon={CheckCircle2}
        className="max-w-md"
      >
        {confirmingOrder && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" />
              <p>
                Confirming will reserve stock against every line item. Reserved quantity cannot be
                used for any other order.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-zinc-50 px-5 py-4">
              <div>
                <p className="text-xs text-zinc-500">Total amount</p>
                <p className="font-mono text-lg font-semibold text-zinc-900">
                  {formatCurrency(confirmingOrder.totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">Customer</p>
                <p className="text-sm font-medium text-zinc-800">
                  {confirmingOrder.customer?.companyName}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmingOrder(null)} disabled={confirming}>
                Cancel
              </Button>
              <Button variant="success" icon={Check} onClick={handleConfirm} loading={confirming} loadingText="Reserving...">
                Confirm order
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!showDispatchForm}
        onClose={() => setShowDispatchForm(null)}
        title="Process dispatch"
        description="Record shipment details and quantities leaving the warehouse."
        icon={Truck}
        className="max-w-2xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Dispatch date" required>
              <input
                type="date"
                className="field"
                value={dispatchData.dispatchDate}
                onChange={(e) => setDispatchData((prev) => ({ ...prev, dispatchDate: e.target.value }))}
                required
              />
            </Field>
            <Field label="Vehicle number">
              <input
                className="field"
                value={dispatchData.vehicleNumber}
                onChange={(e) => setDispatchData((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                placeholder="MH-12-AB-1234"
              />
            </Field>
            <Field label="Driver name">
              <input
                className="field"
                value={dispatchData.driverName}
                onChange={(e) => setDispatchData((prev) => ({ ...prev, driverName: e.target.value }))}
                placeholder="Driver name"
              />
            </Field>
          </div>

          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-zinc-50/60">
                  {['Product', 'Order qty', 'Dispatch qty'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dispatchData.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2.5 text-zinc-700">{item.productName}</td>
                    <td className="px-4 py-2.5 font-mono text-[13px] text-zinc-500">{item.maxQty}</td>
                    <td className="w-32 px-2 py-2.5">
                      <input
                        type="number"
                        min="1"
                        max={item.maxQty}
                        className="field-muted w-24"
                        value={item.quantity}
                        onChange={(e) => updateDispatchItem(idx, 'quantity', e.target.value)}
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
            <Button variant="secondary" onClick={() => setShowDispatchForm(null)}>
              Cancel
            </Button>
            <Button icon={Download} onClick={() => handleDispatch(showDispatchForm)}>
              Confirm dispatch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}