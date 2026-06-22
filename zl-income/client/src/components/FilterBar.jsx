import { useEffect, useState } from 'react';
import { Select, TreeSelect, Button, Space } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchFilterOptions, fetchDeptTree } from '../api';

export default function FilterBar({ filters, onChange, onSearch }) {
  const [options, setOptions] = useState({
    years: [],
    catgroys: [],
    quarters: ['1', '2', '3', '4'],
    months: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
  });
  const [deptTree, setDeptTree] = useState([]);

  useEffect(() => {
    fetchFilterOptions()
      .then(setOptions)
      .catch(console.error);
    fetchDeptTree()
      .then(data => setDeptTree(data || []))
      .catch(console.error);
  }, []);

  const updateFilter = (key, value) => {
    // 科室多选: 数组转逗号分隔字符串
    const val = key === 'dept_code' && Array.isArray(value) ? value.join(',') : value;
    onChange({ ...filters, [key]: val || undefined });
  };

  const handleReset = () => {
    onChange({
      year: undefined,
      month: undefined,
      dept_code: undefined,
      catgroy: undefined,
    });
  };

  // 将逗号分隔的科室代码转为数组供TreeSelect显示
  const deptValue = filters.dept_code
    ? filters.dept_code.split(',').filter(Boolean)
    : undefined;

  return (
    <div className="filter-bar animate-in stagger-1">
      <SearchOutlined style={{ color: 'var(--text-muted)', fontSize: 15 }} />
      <span className="filter-label">筛选条件</span>

      <Select allowClear placeholder="年份" value={filters.year}
        onChange={(v) => updateFilter('year', v)}
        options={options.years.map((y) => ({ label: `${y}年`, value: y }))}
        style={{ width: 110 }} />

      <Select allowClear placeholder="月份" value={filters.month}
        onChange={(v) => updateFilter('month', v)}
        options={options.months.map((m) => ({ label: `${m}月`, value: m }))}
        style={{ width: 100 }} />

      <div className="filter-divider" />

      <TreeSelect
        allowClear
        showSearch
        multiple
        placeholder="选择科室（支持多选父节点）"
        value={deptValue}
        onChange={(v) => updateFilter('dept_code', v)}
        treeData={deptTree}
        style={{ minWidth: 260, maxWidth: 400 }}
        maxTagCount={1}
        filterTreeNode={(input, node) =>
          (node.title || '').toLowerCase().includes(input.toLowerCase())
        }
        treeCheckable
        showCheckedStrategy={TreeSelect.SHOW_PARENT}
        popupMatchSelectWidth={400}
      />

      <div className="filter-divider" />

      <Select allowClear placeholder="门诊/住院" value={filters.catgroy}
        onChange={(v) => updateFilter('catgroy', v)}
        options={options.catgroys.map((c) => ({ label: c.name, value: c.code }))}
        style={{ width: 130 }} />

      <Space>
        <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>查询</Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
      </Space>
    </div>
  );
}
