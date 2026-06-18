import { useEffect, useState } from 'react';
import { Select, Button, Space } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { fetchFilterOptions, fetchDeptTree } from '../api';

export default function FilterBar({ filters, onChange, onSearch }) {
  const [options, setOptions] = useState({
    years: [],
    catgroys: [],
    quarters: ['1', '2', '3', '4'],
    months: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
  });
  const [deptList, setDeptList] = useState([]);

  useEffect(() => {
    fetchFilterOptions()
      .then(setOptions)
      .catch(console.error);
    // 新 API 返回扁平的科室列表 [{DEPT_CODE, DEPT_NAME}, ...]
    fetchDeptTree()
      .then(data => {
        if (Array.isArray(data)) {
          setDeptList(data.map(d => ({
            value: d.DEPT_CODE || d.code,
            label: d.DEPT_NAME || d.name,
          })));
        }
      })
      .catch(console.error);
  }, []);

  const updateFilter = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({
      year: undefined,
      month: undefined,
      dept_code: undefined,
      catgroy: undefined,
    });
  };

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

      <Select
        allowClear
        showSearch
        placeholder="选择科室"
        value={filters.dept_code}
        onChange={(v) => updateFilter('dept_code', v)}
        options={deptList}
        style={{ minWidth: 220 }}
        maxTagCount={1}
        filterOption={(input, option) =>
          (option?.label || '').toLowerCase().includes(input.toLowerCase())
        }
        popupMatchSelectWidth={300}
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
