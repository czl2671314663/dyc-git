import VisitKpiCards from '../components/VisitKpiCards';
import VisitChartSection from '../components/VisitChartSection';
import VisitDeptTable from '../components/VisitDeptTable';

export default function VisitDashboard({ filters }) {
  return (
    <>
      <VisitKpiCards filters={filters} />
      <VisitChartSection filters={filters} />
      <VisitDeptTable filters={filters} />
    </>
  );
}
