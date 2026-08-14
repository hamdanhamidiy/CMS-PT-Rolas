import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDateTime } from './utils';

export interface ExportLogItem {
  id: string;
  action: string;
  actionLabel?: string;
  entity_type: string;
  entity_id?: string | null;
  details: string | null;
  created_at: string;
  ip_address?: string | null;
  location?: string | null;
  target_device?: string | null;
  user_agent?: string | null;
  status?: string | null;
  metadata?: Record<string, any> | null;
  profile?: { full_name?: string; email?: string; role?: string } | null;
}

/**
 * Export activity logs as JSON file
 */
export function exportLogsToJSON(logs: ExportLogItem[], filenamePrefix = 'Log-Aktivitas-CMS') {
  const exportPayload = {
    exported_at: new Date().toISOString(),
    system: 'Digital Signage CMS - PT Rolas Medika',
    total_logs: logs.length,
    logs: logs.map((log) => ({
      id: log.id,
      timestamp: log.created_at,
      formatted_time: formatDateTime(log.created_at),
      action: log.action,
      action_label: log.actionLabel || log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id || null,
      details: log.details || '',
      status: log.status || 'success',
      operator: {
        name: log.profile?.full_name || 'Admin User',
        email: log.profile?.email || 'admin@rolasmedika.co.id',
        role: log.profile?.role || 'Super Admin',
      },
      network: {
        target_device: log.target_device || log.location || 'Web Console Admin',
        ip_address: log.ip_address || 'Sesi Browser',
        user_agent: log.user_agent || '',
      },
      metadata: log.metadata || {},
    })),
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export activity logs as CSV file (Excel UTF-8 friendly with BOM)
 */
export function exportLogsToCSV(logs: ExportLogItem[], filenamePrefix = 'Log-Aktivitas-CMS') {
  const headers = [
    'No',
    'ID Log',
    'Waktu (WIB)',
    'Tindakan',
    'Rincian Aktivitas',
    'Operator',
    'Email Operator',
    'Perangkat / IP',
    'Status',
  ];

  const rows = logs.map((log, index) => {
    const timeFormatted = formatDateTime(log.created_at);
    const actionName = log.actionLabel || log.action;
    const operatorName = log.profile?.full_name || 'Admin User';
    const operatorEmail = log.profile?.email || 'admin@rolasmedika.co.id';
    const deviceIp = log.target_device
      ? `Target: ${log.target_device} (${log.ip_address || 'IP Sesi'})`
      : `Web Console (${log.ip_address || 'IP Sesi'})`;
    const status = (log.status || 'SUCCESS').toUpperCase();

    return [
      index + 1,
      log.id,
      timeFormatted,
      actionName,
      log.details || '-',
      operatorName,
      operatorEmail,
      deviceIp,
      status,
    ];
  });

  const escapeCSV = (field: any) => {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCSV).join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export activity logs as clean professional PDF report
 */
export function exportLogsToPDF(
  logs: ExportLogItem[],
  activeFilter = 'Semua',
  filenamePrefix = 'Laporan-Log-Aktivitas'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const dateNow = new Date();
  const dateStr = dateNow.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Top Accent Strip
  doc.setFillColor(37, 99, 235); // blue-600
  doc.rect(0, 0, 297, 3, 'F');

  // Header Banner Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 3, 297, 23, 'F');

  // Brand & Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('PT ROLAS MEDIKA — DIGITAL SIGNAGE CMS', 14, 12);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Laporan Resmi Audit Log Aktivitas & Riwayat Tindakan Sistem', 14, 18.5);

  // Metadata Executive Summary Card
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 29, 269, 13, 1.5, 1.5, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('WAKTU CETAK:', 18, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr} WIB`, 43, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL AUDIT LOG:', 115, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`${logs.length} Catatan`, 147, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('FILTER AKTIF:', 200, 35);
  doc.setFont('helvetica', 'normal');
  doc.text(`${activeFilter}`, 225, 35);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS DOKUMEN:', 18, 39.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 38, 38); // red-600
  doc.text('INTERNAL ROLAS MEDIKA (TERVERIFIKASI)', 48, 39.5);

  // Table Columns & Data Mapping
  const tableColumns = ['#', 'Tindakan', 'Rincian Aktivitas', 'Operator', 'Koneksi / Perangkat', 'Waktu (WIB)'];
  const tableRows = logs.map((log, index) => {
    const actionLabel = log.actionLabel || log.action;
    const operator = `${log.profile?.full_name || 'Admin User'}\n(${log.profile?.email || 'admin@rolasmedika.co.id'})`;
    const connection = log.target_device
      ? `Target: ${log.target_device}\n(${log.ip_address || 'Sesi Browser'})`
      : `Web Console Admin\n(${log.ip_address || 'Sesi Browser'})`;
    const formattedTime = formatDateTime(log.created_at);

    return [
      (index + 1).toString(),
      actionLabel,
      log.details || '-',
      operator,
      connection,
      formattedTime,
    ];
  });

  // Render Table using autoTable
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // #
      1: { cellWidth: 38, fontStyle: 'bold' }, // Tindakan
      2: { cellWidth: 100 }, // Rincian Aktivitas
      3: { cellWidth: 50 }, // Operator
      4: { cellWidth: 42 }, // Perangkat / IP
      5: { cellWidth: 29, halign: 'right' }, // Waktu
    },
    margin: { left: 14, right: 14, bottom: 16 },
    didDrawPage: (data) => {
      // Footer Page Counter & Disclaimer
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height || 210;

      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 12, 297 - 14, pageHeight - 12);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400

      doc.text(
        `Digital Signage CMS — PT Rolas Medika | Berkas Resmi Sistem`,
        14,
        pageHeight - 6
      );
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        297 - 14,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  const fileDateStr = new Date().toISOString().split('T')[0];
  doc.save(`${filenamePrefix}-${fileDateStr}.pdf`);
}
