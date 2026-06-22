const express = require('express');
const cors = require('cors');
const { query } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ====== 工具函数 ======

/** 构建 WHERE 条件，传入 { BIZ_YEAR?, BIZ_QUARTER?, BIZ_MONTH?, DEPT_CODE?, CATGROY? }
 *  DEPT_CODE 支持逗号分隔多选，自动展开为叶子科室 */
function buildWhere(filters) {
  let clause = '';
  const params = [];
  const fields = [
    ['BIZ_YEAR', filters.BIZ_YEAR],
    ['BIZ_QUARTER', filters.BIZ_QUARTER],
    ['BIZ_MONTH', filters.BIZ_MONTH],
    ['CATGROY', filters.CATGROY],
  ];
  for (const [name, val] of fields) {
    if (val !== undefined && val !== null && val !== '') {
      clause += ` AND ${name} = ?`;
      params.push(val);
    }
  }
  // 科室多选支持
  if (filters.DEPT_CODE) {
    const codes = filters.DEPT_CODE.split(',').filter(Boolean);
    const leaves = expandDeptCodes(codes);
    if (leaves.length) {
      const ph = leaves.map(() => '?').join(',');
      clause += ` AND DEPT_CODE IN (${ph})`;
      params.push(...leaves);
    } else {
      clause += ' AND DEPT_CODE = ?';
      params.push(filters.DEPT_CODE);
    }
  }
  return { clause, params };
}

// ==================== 收入看板 ====================

/** KPI 汇总卡片（含同比） */
app.get('/api/income/summary', async (req, res) => {
  try {
    const { year, quarter, month, dept_code, catgroy } = req.query;
    const { clause, params } = buildWhere({ BIZ_YEAR: year, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code, CATGROY: catgroy });
    const baseWhere = "WHERE TIME_TYPE='1' AND DEPT_TYPE='1'" + clause;

    const [rows] = query(`
      SELECT
        COALESCE(SUM(INCOME_DEPT), 0)       AS total_income,
        COALESCE(SUM(INCOME_VALID), 0)      AS valid_income,
        COALESCE(SUM(INCOME_DRUG), 0)       AS drug_income,
        COALESCE(SUM(INCOME_MATERIAL), 0)   AS material_income,
        COALESCE(SUM(INCOME_EXAM_TEST), 0)  AS exam_test_income,
        COALESCE(SUM(INCOME_SERVICE), 0)    AS service_income,
        COALESCE(SUM(INCOME_REG), 0)        AS reg_income,
        COALESCE(SUM(INCOME_OTHER), 0)      AS other_income,
        COALESCE(SUM(INCOME_BED), 0)        AS bed_income,
        COALESCE(SUM(INCOME_NURSE), 0)      AS nurse_income,
        COALESCE(SUM(NUM_DEPT), 0)          AS visit_count,
        COALESCE(SUM(NUM_OPS), 0)           AS ops_count,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='10' THEN INCOME_DEPT ELSE 0 END), 0) AS outpatient_income,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='20' THEN INCOME_DEPT ELSE 0 END), 0) AS emergency_income,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='40' THEN INCOME_DEPT ELSE 0 END), 0) AS inpatient_income
      FROM ads_dept_income ${baseWhere}
    `, params);

    const data = rows[0];

    // 同比
    let previous = null;
    if (year) {
      const prevYear = String(parseInt(year) - 1);
      const prev = buildWhere({ BIZ_YEAR: prevYear, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code, CATGROY: catgroy });
      const prevWhere = "WHERE TIME_TYPE='1' AND DEPT_TYPE='1'" + prev.clause;
      const [prevRows] = query(`
        SELECT
          COALESCE(SUM(INCOME_DEPT), 0)       AS total_income,
          COALESCE(SUM(INCOME_VALID), 0)      AS valid_income,
          COALESCE(SUM(INCOME_DRUG), 0)       AS drug_income,
          COALESCE(SUM(INCOME_MATERIAL), 0)   AS material_income,
          COALESCE(SUM(INCOME_EXAM_TEST), 0)  AS exam_test_income,
          COALESCE(SUM(INCOME_SERVICE), 0)    AS service_income,
          COALESCE(SUM(INCOME_REG), 0)        AS reg_income,
          COALESCE(SUM(INCOME_OTHER), 0)      AS other_income,
          COALESCE(SUM(INCOME_BED), 0)        AS bed_income,
          COALESCE(SUM(INCOME_NURSE), 0)      AS nurse_income,
          COALESCE(SUM(NUM_DEPT), 0)          AS visit_count,
          COALESCE(SUM(NUM_OPS), 0)           AS ops_count,
          COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='10' THEN INCOME_DEPT ELSE 0 END), 0) AS outpatient_income,
          COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='20' THEN INCOME_DEPT ELSE 0 END), 0) AS emergency_income,
          COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='40' THEN INCOME_DEPT ELSE 0 END), 0) AS inpatient_income
        FROM ads_dept_income ${prevWhere}
      `, prev.params);
      previous = prevRows[0];
    }

    res.json({ success: true, data, previous });
  } catch (err) {
    console.error('income/summary:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 月度收入趋势（含同比） */
app.get('/api/income/trend', async (req, res) => {
  try {
    const { year, dept_code, catgroy } = req.query;
    const incomeField = req.query.field || 'INCOME_DEPT'; // 支持切换收入类别

    if (!year) {
      const { clause, params } = buildWhere({ DEPT_CODE: dept_code, CATGROY: catgroy });
      const [rows] = query(`
        SELECT BIZ_YEAR, BIZ_MONTH, COALESCE(SUM(${incomeField}), 0) AS income
        FROM ads_dept_income
        WHERE TIME_TYPE='1' AND DEPT_TYPE='1'${clause}
        GROUP BY BIZ_YEAR, BIZ_MONTH
        ORDER BY BIZ_YEAR, BIZ_MONTH
      `, params);
      return res.json({ success: true, data: rows });
    }

    const prevYear = String(parseInt(year) - 1);

    const cur = buildWhere({ BIZ_YEAR: year, DEPT_CODE: dept_code, CATGROY: catgroy });
    const [curRows] = query(`
      SELECT BIZ_MONTH, COALESCE(SUM(${incomeField}), 0) AS income
      FROM ads_dept_income WHERE TIME_TYPE='1' AND DEPT_TYPE='1'${cur.clause}
      GROUP BY BIZ_MONTH ORDER BY BIZ_MONTH
    `, cur.params);

    const prev = buildWhere({ BIZ_YEAR: prevYear, DEPT_CODE: dept_code, CATGROY: catgroy });
    const [prevRows] = query(`
      SELECT BIZ_MONTH, COALESCE(SUM(${incomeField}), 0) AS income
      FROM ads_dept_income WHERE TIME_TYPE='1' AND DEPT_TYPE='1'${prev.clause}
      GROUP BY BIZ_MONTH ORDER BY BIZ_MONTH
    `, prev.params);

    const prevMap = {};
    prevRows.forEach(r => { prevMap[r.BIZ_MONTH] = Number(r.income); });

    const merged = curRows.map(r => {
      const curVal = Number(r.income);
      const prevVal = prevMap[r.BIZ_MONTH] || 0;
      return {
        month: r.BIZ_MONTH,
        current: curVal,
        previous: prevVal,
        yoy: prevVal > 0 ? Number((((curVal - prevVal) / prevVal) * 100).toFixed(2)) : null,
      };
    });

    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('income/trend:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 收入构成（饼图） */
app.get('/api/income/composition', async (req, res) => {
  try {
    const { year, quarter, month, dept_code, catgroy } = req.query;
    const { clause, params } = buildWhere({ BIZ_YEAR: year, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code, CATGROY: catgroy });
    const where = "WHERE TIME_TYPE='1' AND DEPT_TYPE='1'" + clause;

    const cats = [
      ['药品收入', 'INCOME_DRUG'],
      ['检查检验收入', 'INCOME_EXAM_TEST'],
      ['材料收入', 'INCOME_MATERIAL'],
      ['服务收入', 'INCOME_SERVICE'],
      ['挂号收入', 'INCOME_REG'],
      ['床位收入', 'INCOME_BED'],
      ['护理收入', 'INCOME_NURSE'],
      ['其他收入', 'INCOME_OTHER'],
    ];

    const unions = cats.map(([label, field]) =>
      `SELECT '${label}' AS category, COALESCE(SUM(${field}), 0) AS amount FROM ads_dept_income ${where}`
    ).join(' UNION ALL ');

    const [rows] = query(unions, Array(cats.length).fill(params).flat());
    const [totalRows] = query(`SELECT COALESCE(SUM(INCOME_DEPT),0) AS total FROM ads_dept_income ${where}`, params);

    res.json({ success: true, data: rows.filter(r => Number(r.amount) > 0), total: totalRows[0].total });
  } catch (err) {
    console.error('income/composition:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 门诊/急诊/住院 环形图 */
app.get('/api/income/oei', async (req, res) => {
  try {
    const { year, quarter, month, dept_code } = req.query;
    const { clause, params } = buildWhere({ BIZ_YEAR: year, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code });
    const where = "WHERE TIME_TYPE='1' AND DEPT_TYPE='1'" + clause;

    const [rows] = query(`
      SELECT CASE WHEN OUTP_IN_TYPE='10' THEN '门诊'
                  WHEN OUTP_IN_TYPE='20' THEN '急诊'
                  WHEN OUTP_IN_TYPE='40' THEN '住院' ELSE '其他' END AS type,
             COALESCE(SUM(INCOME_DEPT), 0) AS total_income,
             COALESCE(SUM(NUM_DEPT), 0) AS visit_count
      FROM ads_dept_income ${where}
      GROUP BY OUTP_IN_TYPE ORDER BY total_income DESC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('income/oei:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 科室收入排名 */
app.get('/api/income/dept-ranking', async (req, res) => {
  try {
    const { year, quarter, month, dept_code, catgroy, limit = 20 } = req.query;
    const { clause, params } = buildWhere({ BIZ_YEAR: year, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code, CATGROY: catgroy });
    params.push(parseInt(limit));

    const [rows] = query(`
      SELECT DEPT_CODE, DEPT_NAME,
        COALESCE(SUM(INCOME_DEPT), 0)    AS total_income,
        COALESCE(SUM(INCOME_VALID), 0)   AS valid_income,
        COALESCE(SUM(INCOME_DRUG), 0)    AS drug_income,
        COALESCE(SUM(INCOME_MATERIAL), 0) AS material_income,
        COALESCE(SUM(INCOME_EXAM_TEST), 0) AS exam_test_income,
        COALESCE(SUM(INCOME_SERVICE), 0) AS service_income,
        COALESCE(SUM(NUM_DEPT), 0)       AS visit_count,
        COALESCE(SUM(NUM_OPS), 0)        AS ops_count
      FROM ads_dept_income
      WHERE TIME_TYPE='1' AND DEPT_TYPE='1'${clause}
      GROUP BY DEPT_CODE, DEPT_NAME
      ORDER BY total_income DESC LIMIT ?
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('income/dept-ranking:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 科室收入明细（分页） */
app.get('/api/income/dept-detail', async (req, res) => {
  try {
    const { year, quarter, month, dept_code, catgroy, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const { clause, params } = buildWhere({ BIZ_YEAR: year, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code, CATGROY: catgroy });
    const where = "WHERE TIME_TYPE='1' AND DEPT_TYPE='1'" + clause;

    const [cnt] = query(`SELECT COUNT(DISTINCT DEPT_CODE) AS total FROM ads_dept_income ${where}`, params);
    params.push(parseInt(pageSize), offset);
    const [rows] = query(`
      SELECT DEPT_CODE, DEPT_NAME,
        COALESCE(SUM(INCOME_DEPT),0)    AS total_income,
        COALESCE(SUM(INCOME_VALID),0)   AS valid_income,
        COALESCE(SUM(INCOME_DRUG),0)    AS drug_income,
        COALESCE(SUM(INCOME_MATERIAL),0) AS material_income,
        COALESCE(SUM(INCOME_EXAM_TEST),0) AS exam_test_income,
        COALESCE(SUM(INCOME_SERVICE),0) AS service_income,
        COALESCE(SUM(INCOME_REG),0)     AS reg_income,
        COALESCE(SUM(INCOME_OTHER),0)   AS other_income,
        COALESCE(SUM(INCOME_BED),0)     AS bed_income,
        COALESCE(SUM(INCOME_NURSE),0)   AS nurse_income,
        COALESCE(SUM(NUM_DEPT),0)       AS visit_count,
        COALESCE(SUM(NUM_OPS),0)        AS ops_count
      FROM ads_dept_income ${where}
      GROUP BY DEPT_CODE, DEPT_NAME
      ORDER BY total_income DESC LIMIT ? OFFSET ?
    `, params);

    res.json({ success: true, data: { rows, total: cnt[0].total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('income/dept-detail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 人次看板（全部从 ads_dept_income 取数） ====================

// 人次 WHERE：TIME_TYPE='1' AND DEPT_TYPE='1'，catgroy 默认不过滤（全部门诊+住院）
function buildVisitWhere(query) {
  const { year, quarter, month, dept_code, catgroy } = query || {};
  let clause = "WHERE TIME_TYPE='1' AND DEPT_TYPE='1'";
  const params = [];
  if (year) { clause += ' AND BIZ_YEAR = ?'; params.push(year); }
  if (quarter) { clause += ' AND BIZ_QUARTER = ?'; params.push(quarter); }
  if (month) { clause += ' AND BIZ_MONTH = ?'; params.push(month); }
  if (catgroy) { clause += ' AND CATGROY = ?'; params.push(catgroy); }
  // 科室多选支持
  if (dept_code) {
    const codes = dept_code.split(',').filter(Boolean);
    const leaves = expandDeptCodes(codes);
    if (leaves.length) {
      const ph = leaves.map(() => '?').join(',');
      clause += ` AND DEPT_CODE IN (${ph})`;
      params.push(...leaves);
    } else {
      clause += ' AND DEPT_CODE = ?';
      params.push(dept_code);
    }
  }
  return { clause, params };
}

/** 人次 KPI 汇总 */
app.get('/api/visit/summary', async (req, res) => {
  try {
    const { clause, params } = buildVisitWhere(req.query);
    const [rows] = query(`
      SELECT COALESCE(SUM(NUM_DEPT), 0) AS total,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='10' THEN NUM_DEPT ELSE 0 END), 0) AS outpatient,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='20' THEN NUM_DEPT ELSE 0 END), 0) AS emergency,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='40' THEN NUM_DEPT ELSE 0 END), 0) AS inpatient
      FROM ads_dept_income ${clause}
    `, params);
    const data = rows[0];

    // 手术例数从 ads_inx_operation 取数
    let opsWhere = 'WHERE 1=1';
    const opsParams = [];
    if (req.query.year) { opsWhere += ' AND BIZ_YEAR = ?'; opsParams.push(req.query.year); }
    if (req.query.quarter) { opsWhere += ' AND BIZ_QUARTER = ?'; opsParams.push(req.query.quarter); }
    if (req.query.month) { opsWhere += ' AND BIZ_MONTH = ?'; opsParams.push(req.query.month); }
    if (req.query.dept_code) { opsWhere += ' AND DEPT_ID = ?'; opsParams.push(req.query.dept_code); }
    const [opsRows] = query(`SELECT COALESCE(SUM(NUM_OPST), 0) AS ops FROM ads_inx_operation ${opsWhere}`, opsParams);
    data.ops = opsRows[0].ops;

    // 住院人次明细指标 (ads_inpatient_work_detail)
    let ipWhere = 'WHERE 1=1';
    const ipParams = [];
    if (req.query.year) { ipWhere += ' AND BIZ_YEAR = ?'; ipParams.push(req.query.year); }
    if (req.query.quarter) { ipWhere += ' AND BIZ_QUARTER = ?'; ipParams.push(req.query.quarter); }
    if (req.query.month) { ipWhere += ' AND BIZ_MONTH = ?'; ipParams.push(req.query.month); }
    if (req.query.dept_code) { ipWhere += ' AND DEPT_CODE = ?'; ipParams.push(req.query.dept_code); }

    const [ipRows] = query(`SELECT
      COUNT(DISTINCT FPRN) AS discharges,
      COALESCE(ROUND(AVG(FDAYS), 1), 0) AS avg_stay_days,
      COALESCE(SUM(CASE WHEN FZYSSLV IN ('3','4') THEN 1 ELSE 0 END), 0) AS level34_ops,
      COALESCE(SUM(CASE WHEN EVENT_WEEK IN ('周六','周日') THEN 1 ELSE 0 END), 0) AS weekend_inpatient,
      COALESCE(SUM(CASE WHEN FRYTJ='2' THEN 1 ELSE 0 END), 0) AS em_admission
    FROM ads_inpatient_work_detail ${ipWhere}`, ipParams);
    Object.assign(data, ipRows[0]);

    // 同比
    let prev = null;
    if (req.query.year) {
      const py = String(parseInt(req.query.year) - 1);
      const pv = buildVisitWhere({ ...req.query, year: py });

      // 主表(含门诊/急诊/住院人次)
      const [pr] = query(`SELECT COALESCE(SUM(NUM_DEPT),0) AS total,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='10' THEN NUM_DEPT ELSE 0 END),0) AS outpatient,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='20' THEN NUM_DEPT ELSE 0 END),0) AS emergency,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='40' THEN NUM_DEPT ELSE 0 END),0) AS inpatient
      FROM ads_dept_income ${pv.clause}`, pv.params);

      // 手术(带完整筛选)
      let prevOpsWhere = 'WHERE BIZ_YEAR = ?';
      const prevOpsParams = [py];
      if (req.query.quarter) { prevOpsWhere += ' AND BIZ_QUARTER = ?'; prevOpsParams.push(req.query.quarter); }
      if (req.query.month) { prevOpsWhere += ' AND BIZ_MONTH = ?'; prevOpsParams.push(req.query.month); }
      if (req.query.dept_code) { prevOpsWhere += ' AND DEPT_ID = ?'; prevOpsParams.push(req.query.dept_code); }
      const [prevOps] = query(`SELECT COALESCE(SUM(NUM_OPST),0) AS ops FROM ads_inx_operation ${prevOpsWhere}`, prevOpsParams);

      // 住院明细(带完整筛选)
      let prevIpWhere = 'WHERE BIZ_YEAR = ?';
      const prevIpParams = [py];
      if (req.query.quarter) { prevIpWhere += ' AND BIZ_QUARTER = ?'; prevIpParams.push(req.query.quarter); }
      if (req.query.month) { prevIpWhere += ' AND BIZ_MONTH = ?'; prevIpParams.push(req.query.month); }
      if (req.query.dept_code) { prevIpWhere += ' AND DEPT_CODE = ?'; prevIpParams.push(req.query.dept_code); }
      const [prevIp] = query(`SELECT
        COUNT(DISTINCT FPRN) AS discharges,
        COALESCE(ROUND(AVG(FDAYS),1), 0) AS avg_stay_days,
        COALESCE(SUM(CASE WHEN FZYSSLV IN ('3','4') THEN 1 ELSE 0 END), 0) AS level34_ops,
        COALESCE(SUM(CASE WHEN EVENT_WEEK IN ('周六','周日') THEN 1 ELSE 0 END), 0) AS weekend_inpatient,
        COALESCE(SUM(CASE WHEN FRYTJ='2' THEN 1 ELSE 0 END), 0) AS em_admission
      FROM ads_inpatient_work_detail ${prevIpWhere}`, prevIpParams);

      prev = { ...pr[0], ops: prevOps[0].ops, ...prevIp[0] };
    }
    res.json({ success: true, data, previous: prev });
  } catch (err) {
    console.error('visit/summary:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 人次月度趋势 */
app.get('/api/visit/trend', async (req, res) => {
  try {
    const { year, dept_code } = req.query;
    const { clause, params } = buildVisitWhere({ DEPT_CODE: dept_code });

    if (!year) {
      const [rows] = query(`
        SELECT BIZ_YEAR, BIZ_MONTH, COALESCE(SUM(NUM_DEPT),0) AS visits
        FROM ads_dept_income ${clause}
        GROUP BY BIZ_YEAR, BIZ_MONTH ORDER BY BIZ_YEAR, BIZ_MONTH
      `, params);
      return res.json({ success: true, data: rows });
    }

    const prevYear = String(parseInt(year) - 1);
    const [cr] = query(`SELECT BIZ_MONTH, COALESCE(SUM(NUM_DEPT),0) AS visits FROM ads_dept_income ${clause} AND BIZ_YEAR=? GROUP BY BIZ_MONTH ORDER BY BIZ_MONTH`, [...params, year]);
    const [pr] = query(`SELECT BIZ_MONTH, COALESCE(SUM(NUM_DEPT),0) AS visits FROM ads_dept_income ${clause} AND BIZ_YEAR=? GROUP BY BIZ_MONTH ORDER BY BIZ_MONTH`, [...params, prevYear]);

    const pm = {}; pr.forEach(r => { pm[r.BIZ_MONTH] = Number(r.visits); });
    const merged = cr.map(r => {
      const cv = Number(r.visits), pv = pm[r.BIZ_MONTH] || 0;
      return { month: r.BIZ_MONTH, current: cv, previous: pv, yoy: pv > 0 ? Number((((cv - pv) / pv) * 100).toFixed(2)) : null };
    });
    res.json({ success: true, data: merged });
  } catch (err) {
    console.error('visit/trend:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 门诊/急诊/住院 分布 */
app.get('/api/visit/oei', async (req, res) => {
  try {
    const { clause, params } = buildVisitWhere(req.query);
    const [rows] = query(`
      SELECT CASE WHEN OUTP_IN_TYPE='10' THEN '门诊'
                  WHEN OUTP_IN_TYPE='20' THEN '急诊'
                  WHEN OUTP_IN_TYPE='40' THEN '住院' ELSE '其他' END AS type,
             COALESCE(SUM(NUM_DEPT), 0) AS visits
      FROM ads_dept_income ${clause}
      GROUP BY OUTP_IN_TYPE ORDER BY visits DESC
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('visit/oei:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 科室人次排名 */
app.get('/api/visit/dept-ranking', async (req, res) => {
  try {
    const { limit = 15 } = req.query;
    const { clause, params } = buildVisitWhere(req.query);
    params.push(parseInt(limit));

    const [rows] = query(`
      SELECT DEPT_CODE, DEPT_NAME, COALESCE(SUM(NUM_DEPT),0) AS total_visits
      FROM ads_dept_income ${clause}
      GROUP BY DEPT_CODE, DEPT_NAME ORDER BY total_visits DESC LIMIT ?
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('visit/dept-ranking:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 科室人次明细（分页） */
app.get('/api/visit/dept-detail', async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const { clause, params } = buildVisitWhere(req.query);
    const countParams = [...params];

    const [cnt] = query(`SELECT COUNT(DISTINCT DEPT_CODE) AS total FROM ads_dept_income ${clause}`, countParams);

    const listParams = [...params, parseInt(pageSize), offset];
    const [rows] = query(`
      SELECT DEPT_CODE, DEPT_NAME,
        COALESCE(SUM(NUM_DEPT), 0) AS total_visits,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='10' THEN NUM_DEPT ELSE 0 END), 0) AS outpatient,
        COALESCE(SUM(CASE WHEN OUTP_IN_TYPE='20' THEN NUM_DEPT ELSE 0 END), 0) AS emergency,
        COALESCE(SUM(NUM_OPS), 0) AS ops
      FROM ads_dept_income ${clause}
      GROUP BY DEPT_CODE, DEPT_NAME
      ORDER BY total_visits DESC LIMIT ? OFFSET ?
    `, listParams);

    res.json({ success: true, data: { rows, total: cnt[0].total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (err) {
    console.error('visit/dept-detail:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 住院天数分布（来自 ads_dept_income_zy_dim） */
app.get('/api/visit/zy-stay', async (req, res) => {
  try {
    const { year, quarter, month, dept_code } = req.query;
    const { clause, params } = buildWhere({ BIZ_YEAR: year, BIZ_QUARTER: quarter, BIZ_MONTH: month, DEPT_CODE: dept_code });
    const [rows] = query(`
      SELECT CASE WHEN CAST(DIM_VALUE AS INTEGER) < 7 THEN '小于7天'
                  WHEN CAST(DIM_VALUE AS INTEGER) >= 7 AND CAST(DIM_VALUE AS INTEGER) < 15 THEN '7-15天'
                  WHEN CAST(DIM_VALUE AS INTEGER) >= 15 AND CAST(DIM_VALUE AS INTEGER) < 30 THEN '15-30天'
                  WHEN CAST(DIM_VALUE AS INTEGER) >= 30 THEN '大于30天' ELSE '其他' END AS name,
             SUM(NUM_DEPT) AS visits
      FROM ads_dept_income_zy_dim WHERE DIM_TYPE='住院天数'${clause}
      GROUP BY name ORDER BY MIN(CAST(DIM_VALUE AS INTEGER))
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('visit/zy-stay:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 手术等级分布（来自 ads_inx_operation） */
app.get('/api/visit/ops-level', async (req, res) => {
  try {
    const { year, quarter, month, dept_code } = req.query;
    const params = [];
    let clause = '';
    if (year) { clause += ' AND BIZ_YEAR = ?'; params.push(year); }
    if (quarter) { clause += ' AND BIZ_QUARTER = ?'; params.push(quarter); }
    if (month) { clause += ' AND BIZ_MONTH = ?'; params.push(month); }
    if (dept_code) { clause += ' AND DEPT_ID = ?'; params.push(dept_code); }

    const [rows] = query(`
      SELECT CASE OPERATION_LEVEL WHEN '1' THEN '一级手术' WHEN '2' THEN '二级手术'
             WHEN '3' THEN '三级手术' WHEN '4' THEN '四级手术' ELSE '其他' END AS name,
             ROUND(SUM(NUM_OPST), 0) AS visits
      FROM ads_inx_operation WHERE OPERATION_LEVEL IS NOT NULL${clause}
      GROUP BY OPERATION_LEVEL ORDER BY CAST(OPERATION_LEVEL AS INTEGER)
    `, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('visit/ops-level:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 共享接口 ====================

/** 筛选器选项 */
app.get('/api/filter-options', async (req, res) => {
  try {
    const [years] = query(`SELECT DISTINCT BIZ_YEAR FROM ads_dept_income WHERE TIME_TYPE='1' AND DEPT_TYPE='1' ORDER BY BIZ_YEAR DESC`);
    const [depts] = query(`SELECT DISTINCT DEPT_CODE, DEPT_NAME FROM ads_dept_income WHERE TIME_TYPE='1' AND DEPT_TYPE='1' ORDER BY DEPT_NAME`);

    res.json({
      success: true,
      data: {
        years: years.map(r => r.BIZ_YEAR),
        departments: depts.map(r => ({ code: r.DEPT_CODE, name: r.DEPT_NAME })),
        catgroys: [{ code: 'MZ', name: '门诊' }, { code: 'ZY', name: '住院' }],
        quarters: ['1', '2', '3', '4'],
        months: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
      },
    });
  } catch (err) {
    console.error('filter-options:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 最新数据日期 */
app.get('/api/latest-date', async (req, res) => {
  try {
    const [rows] = query(`
      SELECT BIZ_YEAR, BIZ_QUARTER, BIZ_MONTH FROM ads_dept_income_mjz_dim
      WHERE DIM_CODE='门急诊' AND NUM_DEPT > 0
      ORDER BY BIZ_YEAR DESC, BIZ_MONTH DESC LIMIT 1
    `);
    if (rows.length) {
      res.json({ success: true, data: { year: rows[0].BIZ_YEAR, quarter: rows[0].BIZ_QUARTER, month: rows[0].BIZ_MONTH } });
    } else {
      const [r2] = query(`SELECT BIZ_YEAR, BIZ_QUARTER, BIZ_MONTH FROM ads_dept_income WHERE TIME_TYPE='1' AND DEPT_TYPE='1' ORDER BY BIZ_YEAR DESC, BIZ_MONTH DESC LIMIT 1`);
      res.json({ success: true, data: r2.length ? { year: r2[0].BIZ_YEAR, quarter: r2[0].BIZ_QUARTER, month: r2[0].BIZ_MONTH } : null });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/** 科室树（供下拉树） */
app.get('/api/dept-tree', async (req, res) => {
  try {
    const [rows] = query(`
      SELECT DEPT_CODE, DEPT_NAME, DEPT_LEVEL, PCODE, SORTED
      FROM standard_dept WHERE STOPPED='N'
        AND DEPT_CODE NOT LIKE '301%'
        AND DEPT_CODE NOT LIKE '401%'
        AND DEPT_CODE NOT LIKE '501%'
        AND DEPT_CODE NOT LIKE '502%'
        AND DEPT_CODE NOT LIKE '601%'
      ORDER BY DEPT_LEVEL, SORTED
    `);
    // 构建树：先按PCODE分组
    const childrenMap = {};
    rows.forEach(r => {
      const p = r.PCODE || '0';
      if (!childrenMap[p]) childrenMap[p] = [];
      childrenMap[p].push(r);
    });
    function buildTree(pcode) {
      const list = childrenMap[pcode] || [];
      return list.map(r => ({
        value: r.DEPT_CODE,
        title: r.DEPT_NAME,
        children: buildTree(r.DEPT_CODE) || undefined,
      })).map(n => (n.children && n.children.length ? n : { value: n.value, title: n.title }));
    }
    const tree = buildTree('0');
    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 将选中的科室代码展开为叶子科室列表（支持父子节点混合）
function expandDeptCodes(codes) {
  if (!codes || !codes.length) return [];
  const clauses = codes.map(() => '(DEPT_CODE = ? OR DEPT_CODE LIKE ?)').join(' OR ');
  const params = [];
  codes.forEach(c => { params.push(c, c + '%'); });
  const [rows] = query(`
    SELECT DISTINCT DEPT_CODE FROM standard_dept
    WHERE STOPPED='N' AND DEPT_LEVEL >= '3' AND (${clauses})
  `, params);
  return rows.map(r => r.DEPT_CODE);
}

/** 科室列表（扁平，供下拉框） */
app.get('/api/dept-list', async (req, res) => {
  try {
    const [rows] = query(`
      SELECT DISTINCT DEPT_CODE, DEPT_NAME
      FROM ads_dept_income WHERE TIME_TYPE='1' AND DEPT_TYPE='1'
      ORDER BY DEPT_NAME
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ====== 启动 ======
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ 收入/人次看板 API 已启动: http://localhost:${PORT}`);
  console.log(`   数据源: xi_ads_monthly.db`);
});
