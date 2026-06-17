import { useEffect, useState } from 'react';
import { Table, Tag, Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { fetchDeptDetail } from '../api';

const toWan = (v) => {
  if (v == null) return '-';
  return `${(Number(v) / 10000).toFixed(2)} 万`;
};

const rawVal = (v) => (v != null ? Number(v) : 0);

const COLUMNS = [
  { title: '排名', key: 'rank', width: 55, render: (_, __, idx) => idx + 1, align: 'center' },
  { title: '科室编码', dataIndex: 'DEPT_CODE', key: 'DEPT_CODE', width: 110 },
  { title: '科室名称', dataIndex: 'DEPT_NAME', key: 'DEPT_NAME', width: 140, fixed: 'left' },
  { title: '科室总收入', dataIndex: 'total_income', key: 'total_income', width: 120,
    render: v => <span style={{ fontWeight: 600, color: '#2c5ea8' }}>{toWan(v)}</span>,
    sorter: (a, b) => a.total_income - b.total_income },
  { title: '有效收入', dataIndex: 'valid_income', key: 'valid_income', width: 110,
    render: v => toWan(v) },
  { title: '药品收入', dataIndex: 'drug_income', key: 'drug_income', width: 110,
    render: v => toWan(v) },
  { title: '检查检验', dataIndex: 'exam_test_income', key: 'exam_test_income', width: 110,
    render: v => toWan(v) },
  { title: '材料收入', dataIndex: 'material_income', key: 'material_income', width: 100,
    render: v => toWan(v) },
  { title: '服务收入', dataIndex: 'service_income', key: 'service_income', width: 110,
    render: v => toWan(v) },
  { title: '其他收入', dataIndex: 'other_income', key: 'other_income', width: 100,
    render: v => toWan(v) },
  { title: '门诊量', dataIndex: 'visit_count', key: 'visit_count', width: 90,
    render: v => <Tag color="blue">{v != null ? Number(v).toLocaleString() : '-'}</Tag>,
    sorter: (a, b) => a.visit_count - b.visit_count },
];

const EXCEL_HEADERS = [
  '排名', '科室编码', '科室名称', '科室总收入(万元)', '有效收入(万元)',
  '药品收入(万元)', '检查检验收入(万元)', '材料收入(万元)',
  '服务收入(万元)', '其他收入(万元)', '门诊量',
];

export default function DeptTable({ filters, searchTrigger }) {
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });

  const loadData = (page, pageSize) => {
    setLoading(true);
    fetchDeptDetail({ ...filters, page, pageSize })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    loadData(1, pagination.pageSize);
    setPagination(p => ({ ...p, current: 1 }));
  }, [filterKey]);

  const handleTableChange = (pag) => {
    setPagination({ current: pag.current, pageSize: pag.pageSize });
    loadData(pag.current, pag.pageSize);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // 获取全量数据
      const result = await fetchDeptDetail({ ...filters, page: 1, pageSize: 99999 });
      const rows = result.rows || [];

      const sheetData = rows.map((r, i) => [
        i + 1,
        r.DEPT_CODE,
        r.DEPT_NAME,
        (rawVal(r.total_income) / 10000).toFixed(2),
        (rawVal(r.valid_income) / 10000).toFixed(2),
        (rawVal(r.drug_income) / 10000).toFixed(2),
        (rawVal(r.exam_test_income) / 10000).toFixed(2),
        (rawVal(r.material_income) / 10000).toFixed(2),
        (rawVal(r.service_income) / 10000).toFixed(2),
        (rawVal(r.other_income) / 10000).toFixed(2),
        rawVal(r.visit_count),
      ]);

      const ws = XLSX.utils.aoa_to_sheet([EXCEL_HEADERS, ...sheetData]);
      ws['!cols'] = EXCEL_HEADERS.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '科室收入明细');
      XLSX.writeFile(wb, `科室收入明细_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('导出失败:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="card animate-in stagger-3">
      <div className="card-header">
        <span className="card-title">📋 科室收入明细（万元）</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>共 {data.total} 个科室</span>
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            loading={exporting}
            onClick={handleExport}
          >
            导出 Excel
          </Button>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <Table
          columns={COLUMNS}
          dataSource={data.rows}
          rowKey="DEPT_CODE"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            ...pagination,
            total: data.total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: total => `共 ${total} 个科室`,
          }}
          scroll={{ x: 1400 }}
          size="small"
          sticky
        />
      </div>
    </div>
  );
}
