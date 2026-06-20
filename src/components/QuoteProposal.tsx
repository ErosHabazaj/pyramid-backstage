import { useState } from 'react';
import { Check, Copy, FileText, Printer } from 'lucide-react';
import type { Quote } from '@/domain/pricing';
import { Button, Card, SectionLabel } from '@/components/ui/primitives';
import { formatEuro } from '@/lib/utils';

interface QuoteProposalProps {
  quote: Quote;
  proposalText: string;
  onConfirm?: () => void;
  confirmLabel?: string;
}

export function QuoteProposal({ quote, proposalText, onConfirm, confirmLabel = 'Confirm & reserve' }: QuoteProposalProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(proposalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
          <FileText size={16} /> Proposal
        </div>
        <div className="whitespace-pre-line text-sm leading-7 text-ink">{proposalText}</div>
        <div className="mt-4 flex gap-2">
          <Button onClick={copy}>
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy proposal'}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionLabel>Quotation</SectionLabel>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Unit</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quote.lines.map((l, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="py-2">
                  <div>{l.label}</div>
                  {l.detail && <div className="text-xs text-faint">{l.detail}</div>}
                </td>
                <td className="py-2 text-right tabular-nums">{l.qty}</td>
                <td className="py-2 text-right tabular-nums text-muted">{formatEuro(l.unitPrice)}</td>
                <td className="py-2 text-right tabular-nums">{formatEuro(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-sm">
              <td colSpan={3} className="py-1 text-right text-muted">Subtotal</td>
              <td className="py-1 text-right tabular-nums">{formatEuro(quote.subtotal)}</td>
            </tr>
            <tr className="text-sm">
              <td colSpan={3} className="py-1 text-right text-muted">
                VAT ({Math.round(quote.vatRate * 100)}%)
              </td>
              <td className="py-1 text-right tabular-nums">{formatEuro(quote.vat)}</td>
            </tr>
            <tr className="text-base font-medium">
              <td colSpan={3} className="border-t border-line pt-2 text-right">Total</td>
              <td className="border-t border-line pt-2 text-right tabular-nums">{formatEuro(quote.total)}</td>
            </tr>
          </tfoot>
        </table>

        {onConfirm && (
          <Button variant="primary" className="mt-4 w-full justify-center" onClick={onConfirm}>
            <Check size={15} /> {confirmLabel}
          </Button>
        )}
      </Card>
    </div>
  );
}
