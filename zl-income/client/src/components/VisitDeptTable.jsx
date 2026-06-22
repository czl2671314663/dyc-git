import { useEffect, useState } from 'react';
import { Table, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { fetchVisitDeptDetail } from '../api';

const fmt = (v) => (v != null ? Number(v).toLocaleString() : '-');

const COLUMNS = [
  { title: '排名', key: 'rank', width: 45, render: (_, __, idx) => idx + 1, align: 'center' },
  { title: '科室编码', dataIndex: 'DEPT_CODE', key: 'DEPT_CODE', width: 110 },
  { title: '科室名称', dataIndex: 'DEPT_NAME', key: 'DEPT_NAME', width: 140, fixed: 'left' },
  { title: '总人次', dataIndex: 'total_visits', key: 'total_visits', width: 90,
    render: v => <span style={{ fontWeight: 600, color: '#2c5ea8' }}>{fmt(v)}</span>,
    sorter: (a, b) => a.total_visits - b.total_visits },
  { title: '门诊', dataIndex: 'outpatient', key: 'outpatient', width: 80, render: v => fmt(v) },
  { title: '急诊', dataIndex: 'emergency', key: 'emergency', width: 80, render: v => fmt(v) },
  { title: '医保人次', dataIndex: 'yb_visits', key: 'yb_visits', width: 90, render: v => fmt(v) },
  { title: '自费人次', dataIndex: 'self_pay_visits', key: 'self_pay_visits', width: 90, render: v => fmt(v) },
  { title: '住院人次', dataIndex: 'inpatient_visits', key: 'inpatient_visits', width: 90, render: v => fmt(v) },
];

export default function VisitDeptTable({ filters }) {
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const filterKey = JSON.stringify(filters);

  const loadData = (page, pageSize) => {
    setLoading(true);
    fetchVisitDeptDetail({ ...filters, page, pageSize })
      .then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(1, pagination.pageSize); setPagination(p => ({ ...p, current: 1 })); }, [filterKey]);

  const handleTableChange = (pag) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize });
    loadData(pag.current, pag.pageSize);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await fetchVisitDeptDetail({ ...filters, page: 1, pageSize: 99999 });
      const rows = result.rows || [];
      const sheetData = rows.map((r, i) => [
        i + 1, r.DEPT_CODE, r.DEPT_NAME,
        Number(r.total_visits || 0), Number(r.outpatient || 0), Number(r.emergency || 0),
        Number(r.yb_visits || 0), Number(r.self_pay_visits || 0), Number(r.inpatient_visits || 0),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([['排名','科室编码','科室名称','总人次','门诊','急诊','医保人次','自费人次','住院人次'], ...sheetData]);
      ws['!cols'] = [6,12,18,10,10,10,10,10,10,10];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '科室人次明细');
      XLSX.writeFile(wb, `科室人次明细_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) { console.error('导出失败:', err); }
    finally { setExporting(false); }
  };

  return (
    <div className="card animate-in stagger-3">
      <div className="card-header">
        <span className="card-title">📋 科室人次明细</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>共 {data.total} 个科室</span>
          <Button type="primary" size="small" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>导出 Excel</Button>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <Table columns={COLUMNS} dataSource={data.rows} rowKey="DEPT_CODE" loading={loading} onChange={handleTableChange}
          pagination={{ ...pagination, total: data.total, showSizeChanger: true, showQuickJumper: true, pageSizeOptions: ['10', '20', '50', '100'], showTotal: total => `共 ${total} 个科室` }}
          scroll={{ x: 800 }} size="small" sticky />
      </div>
    </div>
  );
}
