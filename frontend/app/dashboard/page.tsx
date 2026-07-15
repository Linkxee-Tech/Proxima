import ProximaDashboard from '../../components/ProximaDashboard';
import AuthGate from '../../components/AuthGate';
export default function DashboardPage() { return <AuthGate><ProximaDashboard /></AuthGate>; }
