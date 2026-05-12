import Dashboard from './pages/Dashboard';
import EquipmentMaintenance from './pages/EquipmentMaintenance';
import Issues from './pages/Issues';
import MachineDetail from './pages/MachineDetail';
import Machines from './pages/Machines';
import Maintenance from './pages/Maintenance';
import ManageCasinos from './pages/ManageCasinos';
import RamClears from './pages/RamClears';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Dashboard": Dashboard,
    "EquipmentMaintenance": EquipmentMaintenance,
    "Issues": Issues,
    "MachineDetail": MachineDetail,
    "Machines": Machines,
    "Maintenance": Maintenance,
    "ManageCasinos": ManageCasinos,
    "RamClears": RamClears,
}

export const pagesConfig = {
    mainPage: "Issues",
    Pages: PAGES,
    Layout: __Layout,
};