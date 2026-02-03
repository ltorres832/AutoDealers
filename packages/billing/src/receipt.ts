// Generación de recibos con desglose de tax

export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Receipt {
  receiptNumber: string;
  date: Date;
  customerName: string;
  customerEmail: string;
  items: ReceiptItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  transactionId: string;
  currency: string;
}

const TAX_RATE = 0.115; // 11.5%

/**
 * Calcula el tax del 11.5% sobre un monto
 */
export function calculateTax(amount: number): number {
  return Math.round(amount * TAX_RATE * 100) / 100;
}

/**
 * Calcula el total con tax
 */
export function calculateTotalWithTax(amount: number): number {
  return amount + calculateTax(amount);
}

/**
 * Genera un recibo a partir de una factura de Stripe
 */
export function generateReceiptFromInvoice(
  invoice: any,
  customerName: string,
  customerEmail: string
): Receipt {
  const subtotal = invoice.subtotal / 100; // Stripe usa centavos
  const taxAmount = invoice.tax || calculateTax(subtotal);
  const total = invoice.total / 100;

  const items: ReceiptItem[] = invoice.lines.data.map((line: any) => ({
    description: line.description || 'Membresía',
    quantity: line.quantity || 1,
    unitPrice: (line.price?.unit_amount || 0) / 100,
    subtotal: (line.amount || 0) / 100,
  }));

  return {
    receiptNumber: invoice.number || invoice.id,
    date: new Date(invoice.created * 1000),
    customerName,
    customerEmail,
    items,
    subtotal,
    taxRate: TAX_RATE * 100, // 11.5%
    taxAmount: taxAmount / 100,
    total,
    paymentMethod: invoice.payment_method_types?.[0] || 'card',
    transactionId: invoice.payment_intent || invoice.id,
    currency: invoice.currency?.toUpperCase() || 'USD',
  };
}

/**
 * Genera HTML del recibo para email
 */
export function generateReceiptHTML(receipt: Receipt): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { color: #2563eb; margin: 0; }
    .receipt-info { background: #f3f4f6; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .receipt-info p { margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #2563eb; color: white; }
    .text-right { text-align: right; }
    .total-section { margin-top: 20px; padding-top: 20px; border-top: 2px solid #2563eb; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; }
    .total-row.final { font-size: 1.2em; font-weight: bold; color: #2563eb; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Recibo de Pago</h1>
    </div>
    
    <div class="receipt-info">
      <p><strong>Número de Recibo:</strong> ${receipt.receiptNumber}</p>
      <p><strong>Fecha:</strong> ${receipt.date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
      <p><strong>Cliente:</strong> ${receipt.customerName}</p>
      <p><strong>Email:</strong> ${receipt.customerEmail}</p>
      <p><strong>Método de Pago:</strong> ${receipt.paymentMethod === 'card' ? 'Tarjeta' : 'Cuenta Bancaria'}</p>
      <p><strong>ID de Transacción:</strong> ${receipt.transactionId}</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Descripción</th>
          <th class="text-right">Cantidad</th>
          <th class="text-right">Precio Unitario</th>
          <th class="text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${receipt.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">$${item.unitPrice.toFixed(2)} ${receipt.currency}</td>
            <td class="text-right">$${item.subtotal.toFixed(2)} ${receipt.currency}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${receipt.subtotal.toFixed(2)} ${receipt.currency}</span>
      </div>
      <div class="total-row">
        <span>Tax (${receipt.taxRate.toFixed(1)}%):</span>
        <span>$${receipt.taxAmount.toFixed(2)} ${receipt.currency}</span>
      </div>
      <div class="total-row final">
        <span>Total:</span>
        <span>$${receipt.total.toFixed(2)} ${receipt.currency}</span>
      </div>
    </div>

    <div class="footer">
      <p>Gracias por su pago.</p>
      <p>Este es un recibo automático generado por AutoDealers.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Genera texto plano del recibo para email
 */
export function generateReceiptText(receipt: Receipt): string {
  return `
RECIBO DE PAGO
==============

Número de Recibo: ${receipt.receiptNumber}
Fecha: ${receipt.date.toLocaleDateString('es-ES')}
Cliente: ${receipt.customerName}
Email: ${receipt.customerEmail}
Método de Pago: ${receipt.paymentMethod === 'card' ? 'Tarjeta' : 'Cuenta Bancaria'}
ID de Transacción: ${receipt.transactionId}

ITEMS:
------
${receipt.items.map(item => 
  `${item.description} - Cantidad: ${item.quantity} x $${item.unitPrice.toFixed(2)} = $${item.subtotal.toFixed(2)}`
).join('\n')}

DESGLOSE:
---------
Subtotal: $${receipt.subtotal.toFixed(2)} ${receipt.currency}
Tax (${receipt.taxRate.toFixed(1)}%): $${receipt.taxAmount.toFixed(2)} ${receipt.currency}
TOTAL: $${receipt.total.toFixed(2)} ${receipt.currency}

Gracias por su pago.
Este es un recibo automático generado por AutoDealers.
  `;
}


