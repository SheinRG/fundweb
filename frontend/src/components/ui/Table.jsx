export function TableWrapper({ columns, header, children, footer, className = '' }) {
  return (
    <div className={`card-surface overflow-hidden ${className}`}>
      {header && <div className="border-b border-zinc-100 px-5 py-4">{header}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-full text-left text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`whitespace-nowrap border-b border-zinc-100 bg-zinc-50/60 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400 ${
                    col.className || ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">{children}</tbody>
          {footer && <tfoot>{footer}</tfoot>}
        </table>
      </div>
    </div>
  );
}

export function Th({ children, className = '' }) {
  return <th className={`whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }) {
  return <td className={`px-5 py-3.5 align-top ${className}`}>{children}</td>;
}