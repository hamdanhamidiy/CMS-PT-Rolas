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
 * Export activity logs as clean professional PDF report (Modern Clean White Background)
 */
export function exportLogsToPDF(
  logs: ExportLogItem[],
  activeFilter: string | string[] = 'Semua Tindakan',
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

  const activeFilterText = Array.isArray(activeFilter)
    ? activeFilter.length === 0
      ? 'Semua Tindakan'
      : activeFilter.join(', ')
    : activeFilter || 'Semua Tindakan';

  // Helper to draw clean header & top accent strip on each page
  const drawPageHeader = () => {
    // Top Accent Strip (Blue-600)
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 297, 2, 'F');

    // Brand Title (Dark Slate on White)
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('PT ROLAS MEDIKA — DIGITAL SIGNAGE CMS', 14, 10);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Laporan Resmi Audit Log Aktivitas & Riwayat Tindakan Sistem', 14, 15);

    // Right Header Tag
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text('AUDIT LOG SYSTEM REPORT', 283, 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Waktu Cetak: ${dateStr} WIB`, 283, 15, { align: 'right' });
  };

  // Executive Metadata Summary Card on Page 1 (Y: 19 to Y: 35)
  // Background card (slate-50) with subtle slate-200 border
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(14, 19, 269, 15, 1.5, 1.5, 'FD');

  // Blue Accent Strip on Left Side of Card
  doc.setFillColor(37, 99, 235);
  doc.rect(14, 19, 2.5, 15, 'F');

  // Summary Row 1
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFontSize(8);
  
  doc.setFont('helvetica', 'bold');
  doc.text('WAKTU CETAK:', 19, 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`${dateStr} WIB`, 43, 24);

  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL LOG:', 115, 24);
  doc.setFont('helvetica', 'normal');
  doc.text(`${logs.length} Catatan Aktivitas`, 135, 24);

  doc.setFont('helvetica', 'bold');
  doc.text('STATUS BEKAS:', 205, 24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text('TERVERIFIKASI (INTERNAL)', 230, 24);

  // Summary Row 2: Filter Info
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.text('FILTER AKTIF:', 19, 29.5);
  doc.setFont('helvetica', 'normal');

  // Truncate filter text if it exceeds card width
  const maxFilterWidth = 230;
  let formattedFilter = activeFilterText;
  if (doc.getTextWidth(formattedFilter) > maxFilterWidth) {
    while (doc.getTextWidth(formattedFilter + '...') > maxFilterWidth && formattedFilter.length > 0) {
      formattedFilter = formattedFilter.slice(0, -1);
    }
    formattedFilter += '...';
  }
  doc.text(formattedFilter, 43, 29.5);

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

  // Render Table using autoTable with Clean White Theme
  autoTable(doc, {
    head: [tableColumns],
    body: tableRows,
    startY: 37,
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42], // slate-900
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 3,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85], // slate-700
      fillColor: [255, 255, 255], // pure white
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50 subtle alternate
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // #
      1: { cellWidth: 38, fontStyle: 'bold' }, // Tindakan
      2: { cellWidth: 100 }, // Rincian Aktivitas
      3: { cellWidth: 50 }, // Operator
      4: { cellWidth: 42 }, // Perangkat / IP
      5: { cellWidth: 29, halign: 'right' }, // Waktu
    },
    margin: { top: 22, left: 14, right: 14, bottom: 16 },
    didDrawPage: (data) => {
      // Always draw clean page header & top accent strip on every page
      drawPageHeader();

      // Footer Page Counter & Disclaimer
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageHeight = doc.internal.pageSize.height || 210;

      doc.setDrawColor(226, 232, 240);
      doc.line(14, pageHeight - 10, 283, pageHeight - 10);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184); // slate-400

      doc.text(
        `Digital Signage CMS — PT Rolas Medika | Berkas Resmi Sistem`,
        14,
        pageHeight - 5
      );
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        283,
        pageHeight - 5,
        { align: 'right' }
      );
    },
  });

  const fileDateStr = new Date().toISOString().split('T')[0];
  doc.save(`${filenamePrefix}-${fileDateStr}.pdf`);
}
