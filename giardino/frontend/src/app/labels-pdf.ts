import { Plant } from './models';

// Etichette 90×50 mm, 2 colonne × 5 righe per pagina A4 (10 per foglio).
const W = 90, H = 50, GX = 8, GY = 4, COLS = 2, ROWS = 5;
const MX = (210 - COLS * W - GX) / 2;
const MY = (297 - ROWS * H - (ROWS - 1) * GY) / 2;
const QR = 22;

export async function buildLabelsPdf(plants: Plant[], origin: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const qrMod: any = await import('qrcode');
  const toDataURL: (t: string, o: object) => Promise<string> = (qrMod.default ?? qrMod).toDataURL;

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  const fit = (text: string, width: number, maxLines: number): string[] => {
    const lines: string[] = doc.splitTextToSize(text.replace(/\s*\n\s*/g, ' · '), width);
    if (lines.length <= maxLines) return lines;
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S{0,2}$/, '') + '…';
    return cut;
  };

  for (let i = 0; i < plants.length; i++) {
    const p = plants[i];
    if (i > 0 && i % (COLS * ROWS) === 0) doc.addPage();
    const pos = i % (COLS * ROWS);
    const x = MX + (pos % COLS) * (W + GX);
    const y = MY + Math.floor(pos / COLS) * (H + GY);

    // cornice doppia, come nelle etichette originali
    doc.setFillColor(253, 249, 240);
    doc.setDrawColor(139, 125, 101);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y, W, H, 2, 2, 'FD');
    doc.setDrawColor(231, 220, 200);
    doc.setLineWidth(0.3);
    doc.roundedRect(x + 1.4, y + 1.4, W - 2.8, H - 2.8, 1.5, 1.5, 'S');

    const tx = x + 5;
    const tw = W - QR - 5 - 5 - 4;
    let ty = y + 8;

    doc.setTextColor(63, 74, 60);
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(12.5);
    const title = fit(p.botanicalName, tw, 2);
    title.forEach(l => { doc.text(l, tx, ty); ty += 5.2; });

    ty -= 3.2;
    doc.setDrawColor(139, 125, 101);
    doc.setLineWidth(0.2);
    doc.line(tx, ty, tx + tw, ty);
    ty += 4.6;

    doc.setFontSize(9);
    doc.setTextColor(75, 75, 58);
    const rows: [string, string, number][] = [
      ['Nome', p.nickname, 1],
      ['Luce', p.sheet['luce'], 2],
      ['Umidità', p.sheet['umidita'], 1],
      ['Acqua', p.sheet['acqua'], 1],
      ['Note', p.sheet['note'], 2],
    ];
    for (const [label, value, max] of rows) {
      if (!value) continue;
      doc.setFont('times', label === 'Nome' ? 'bolditalic' : 'normal');
      const lines = fit(`${label}: ${value}`, tw, max);
      lines.forEach(l => { if (ty < y + H - 3) doc.text(l, tx, ty); ty += 4; });
    }

    // QR verso la scheda
    const url = `${origin}/piante/${p.id}`;
    const png = await toDataURL(url, { margin: 0, width: 220, color: { dark: '#3f4a3c', light: '#fdf9f0' } });
    const qx = x + W - QR - 5, qy = y + (H - QR) / 2 - 2;
    doc.setDrawColor(139, 125, 101);
    doc.setLineWidth(0.3);
    doc.roundedRect(qx - 1.5, qy - 1.5, QR + 3, QR + 3, 1, 1, 'S');
    doc.addImage(png, 'PNG', qx, qy, QR, QR);
    doc.setFont('times', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(139, 125, 101);
    doc.text(`N° ${String(p.id).padStart(4, '0')}`, qx + QR / 2, qy + QR + 4.2, { align: 'center' });
  }
  return doc.output('blob');
}
