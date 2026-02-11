import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Users, Plus, X, Download, Upload, Calendar, BarChart3, List, Loader2, Cloud, CloudOff, Target, Instagram, Facebook, Linkedin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import { getMetricas, addMetrica, updateMetrica, deleteMetrica, getLeads, addLead, deleteLead } from './firebase';

// Configuración
const EMPRESAS = [
  { key: 'educa', label: 'EDUCA', color: '#F97316' },
  { key: 'gmc', label: 'GMC360', color: '#8B5CF6' },
  { key: 'maribel', label: 'Maribel', color: '#10B981' },
];

const REDES = [
  { key: 'instagram', label: 'Instagram', color: '#E1306C', icon: Instagram },
  { key: 'facebook', label: 'Facebook', color: '#1877F2', icon: Facebook },
  { key: 'tiktok', label: 'TikTok', color: '#000000' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0077B5', icon: Linkedin },
];

const METRICAS = [
  { key: 'seg', label: 'Seguidores', icon: Users },
];

const ORIGENES = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'Web', 'Referido', 'Otro'];

const SERVICIOS = {
  gmc: ['Auditoría', 'Servicios AV', 'Riesgos', 'Procesos', 'Otros'],
  educa: ['CNBV', 'UIF', 'Risk', 'Anuales', 'Otros'],
};

// Solo EDUCA y GMC360 manejan leads
const EMPRESAS_LEADS = EMPRESAS.filter(e => e.key !== 'maribel');

const COLORES_PIE = ['#8B5CF6', '#F97316', '#10B981', '#EC4899', '#3B82F6', '#F59E0B', '#6B7280'];

// TikTok icon personalizado
const TikTokIcon = ({ size = 24, className = '' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
  </svg>
);

// Componentes UI
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border p-4 ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = 'primary', disabled, className = '' }) => {
  const base = 'px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 disabled:opacity-50';
  const styles = {
    primary: 'bg-[#8B5CF6] text-white hover:bg-[#7C3AED]',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const Trend = ({ current, previous }) => {
  if (!previous) return <span className="text-gray-400 text-xs">—</span>;
  const diff = current - previous;
  const pct = previous > 0 ? ((diff / previous) * 100).toFixed(1) : 0;
  if (diff > 0) return <span className="text-green-600 text-xs flex items-center gap-1"><TrendingUp size={12} />+{pct}%</span>;
  if (diff < 0) return <span className="text-red-500 text-xs flex items-center gap-1"><TrendingDown size={12} />{pct}%</span>;
  return <span className="text-gray-400 text-xs flex items-center gap-1"><Minus size={12} />0%</span>;
};

// Modal para métricas
const MetricasModal = ({ isOpen, onClose, onSave, editData, existingDates, loading }) => {
  const [form, setForm] = useState({});
  
  useEffect(() => {
    if (editData) {
      setForm(editData);
    } else {
      const empty = { fecha: new Date().toISOString().split('T')[0] };
      EMPRESAS.forEach(e => REDES.forEach(r => METRICAS.forEach(m => {
        empty[`${e.key}_${r.key}_${m.key}`] = 0;
      })));
      setForm(empty);
    }
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!form.fecha) return alert('Selecciona una fecha');
    if (!editData && existingDates.includes(form.fecha)) return alert('Ya existe un registro para esta fecha');
    onSave(form);
  };

  const getIcon = (red) => {
    if (red.key === 'tiktok') return <TikTokIcon size={16} />;
    if (red.icon) return <red.icon size={16} />;
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold">{editData ? 'Editar' : 'Nuevo'} Registro de Métricas</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha</label>
            <input
              type="date"
              value={form.fecha || ''}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
              disabled={!!editData}
              className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-100"
            />
          </div>
          
          {EMPRESAS.map(empresa => (
            <div key={empresa.key} className="border rounded-lg p-4" style={{ borderLeftColor: empresa.color, borderLeftWidth: '4px' }}>
              <h3 className="font-bold mb-3" style={{ color: empresa.color }}>{empresa.label}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {REDES.map(red => (
                  <div key={red.key} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2 text-sm font-medium" style={{ color: red.color }}>
                      {getIcon(red)}
                      {red.label}
                    </div>
                    <div className="space-y-2">
                      {METRICAS.map(m => (
                        <div key={m.key}>
                          <label className="block text-xs text-gray-500">{m.label}</label>
                          <input
                            type="number"
                            min="0"
                            value={form[`${empresa.key}_${red.key}_${m.key}`] || 0}
                            onChange={e => setForm({ ...form, [`${empresa.key}_${red.key}_${m.key}`]: parseInt(e.target.value) || 0 })}
                            className="w-full border rounded px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : (editData ? 'Guardar' : 'Agregar')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Modal para leads
const LeadModal = ({ isOpen, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    origen: '',
    empresa: '',
    servicio: '',
    notas: ''
  });

  useEffect(() => {
    if (isOpen) {
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        origen: '',
        empresa: '',
        servicio: '',
        notas: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!form.fecha || !form.origen || !form.empresa || !form.servicio) {
      return alert('Completa todos los campos requeridos');
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold">Nuevo Lead</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha *</label>
            <input
              type="date"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Origen *</label>
            <select
              value={form.origen}
              onChange={e => setForm({ ...form, origen: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Selecciona...</option>
              {ORIGENES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Empresa *</label>
            <select
              value={form.empresa}
              onChange={e => setForm({ ...form, empresa: e.target.value, servicio: '' })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Selecciona...</option>
              {EMPRESAS_LEADS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
            </select>
          </div>
          {form.empresa && (
            <div>
              <label className="block text-sm font-medium mb-1">Servicio *</label>
              <select
                value={form.servicio}
                onChange={e => setForm({ ...form, servicio: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Selecciona...</option>
                {SERVICIOS[form.empresa]?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Notas</label>
            <textarea
              value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
              placeholder="Opcional..."
            />
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Guardando...</> : 'Agregar Lead'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Exportar Excel
const exportMetricas = (data) => {
  const wb = XLSX.utils.book_new();
  const headers = ['FECHA'];
  EMPRESAS.forEach(e => REDES.forEach(r => METRICAS.forEach(m => {
    headers.push(`${e.label}_${r.label}_${m.label}`);
  })));
  
  const rows = data.map(row => {
    const r = [row.fecha];
    EMPRESAS.forEach(e => REDES.forEach(red => METRICAS.forEach(m => {
      r.push(row[`${e.key}_${red.key}_${m.key}`] || 0);
    })));
    return r;
  });
  
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Metricas');
  XLSX.writeFile(wb, `Metricas_Redes_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const exportLeads = (data) => {
  const wb = XLSX.utils.book_new();
  const headers = ['FECHA', 'ORIGEN', 'EMPRESA', 'SERVICIO', 'NOTAS'];
  const rows = data.map(l => [l.fecha, l.origen, EMPRESAS.find(e => e.key === l.empresa)?.label || l.empresa, l.servicio, l.notas || '']);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  XLSX.writeFile(wb, `Leads_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// App principal
export default function App() {
  const [metricas, setMetricas] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(true);
  const [view, setView] = useState('dashboard');
  const [metricasModal, setMetricasModal] = useState({ open: false, edit: null });
  const [leadModal, setLeadModal] = useState(false);
  const [selectedMetrica, setSelectedMetrica] = useState('seg');
  const [selectedEmpresa, setSelectedEmpresa] = useState('educa');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, l] = await Promise.all([getMetricas(), getLeads()]);
      setMetricas(m);
      setLeads(l);
      setOnline(true);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setOnline(false);
      notify('❌ Error al conectar');
    }
    setLoading(false);
  };

  const notify = msg => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const sortedMetricas = useMemo(() => [...metricas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha)), [metricas]);
  const latest = sortedMetricas[sortedMetricas.length - 1];
  const prev = sortedMetricas[sortedMetricas.length - 2];

  const chartData = useMemo(() => sortedMetricas.map(r => ({
    fecha: new Date(r.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
    ...r
  })), [sortedMetricas]);

  // Estadísticas de leads
  const leadStats = useMemo(() => {
    const porOrigen = {};
    const porEmpresa = { gmc: 0, educa: 0 };
    const porServicio = {};
    
    // Para gráfica por semana
    const porSemana = {};
    // Para gráfica origen x semana
    const origenSemana = {};

    leads.forEach(l => {
      porOrigen[l.origen] = (porOrigen[l.origen] || 0) + 1;
      porEmpresa[l.empresa] = (porEmpresa[l.empresa] || 0) + 1;
      const key = `${l.empresa}_${l.servicio}`;
      porServicio[key] = (porServicio[key] || 0) + 1;

      // Agrupar por semana
      if (l.fecha) {
        const d = new Date(l.fecha + 'T12:00:00');
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay() + 1); // Lunes
        const weekLabel = startOfWeek.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        const weekKey = startOfWeek.toISOString().split('T')[0];

        if (!porSemana[weekKey]) porSemana[weekKey] = { semana: weekLabel, weekKey, total: 0, gmc: 0, educa: 0 };
        porSemana[weekKey].total += 1;
        porSemana[weekKey][l.empresa] = (porSemana[weekKey][l.empresa] || 0) + 1;

        // Origen x semana
        if (!origenSemana[weekKey]) origenSemana[weekKey] = { semana: weekLabel, weekKey };
        origenSemana[weekKey][l.origen] = (origenSemana[weekKey][l.origen] || 0) + 1;
      }
    });

    // Datos para gráfica de servicio
    const porServicioData = Object.entries(porServicio).map(([key, value]) => {
      const [empresa, servicio] = key.split('_');
      return { name: `${servicio} (${EMPRESAS.find(e => e.key === empresa)?.label?.substring(0, 3) || empresa})`, value, empresa };
    }).sort((a, b) => b.value - a.value);

    // Ordenar semanas cronológicamente
    const semanasOrdenadas = Object.values(porSemana).sort((a, b) => a.weekKey.localeCompare(b.weekKey));
    const origenSemanaOrdenado = Object.values(origenSemana).sort((a, b) => a.weekKey.localeCompare(b.weekKey));

    // Obtener todos los orígenes únicos para la gráfica apilada
    const origenesUnicos = [...new Set(leads.map(l => l.origen).filter(Boolean))];

    return {
      total: leads.length,
      porOrigen: Object.entries(porOrigen).map(([name, value]) => ({ name, value })),
      porEmpresa,
      porServicio,
      porServicioData,
      semanasOrdenadas,
      origenSemanaOrdenado,
      origenesUnicos
    };
  }, [leads]);

  const handleSaveMetrica = async (data) => {
    setSaving(true);
    try {
      const exists = metricas.find(m => m.fecha === data.fecha);
      if (exists) {
        await updateMetrica(data.fecha, data);
        setMetricas(prev => prev.map(m => m.fecha === data.fecha ? { ...data, id: data.fecha } : m));
        notify('✅ Actualizado');
      } else {
        await addMetrica(data);
        setMetricas(prev => [...prev, { ...data, id: data.fecha }]);
        notify('✅ Guardado');
      }
      setMetricasModal({ open: false, edit: null });
    } catch (error) {
      console.error(error);
      notify('❌ Error al guardar');
    }
    setSaving(false);
  };

  const handleDeleteMetrica = async (fecha) => {
    if (!confirm('¿Eliminar registro?')) return;
    try {
      await deleteMetrica(fecha);
      setMetricas(prev => prev.filter(m => m.fecha !== fecha));
      notify('🗑️ Eliminado');
    } catch (error) {
      notify('❌ Error');
    }
  };

  const handleSaveLead = async (data) => {
    setSaving(true);
    try {
      const newLead = await addLead(data);
      setLeads(prev => [newLead, ...prev]);
      setLeadModal(false);
      notify('✅ Lead agregado');
    } catch (error) {
      notify('❌ Error');
    }
    setSaving(false);
  };

  const handleDeleteLead = async (id) => {
    if (!confirm('¿Eliminar lead?')) return;
    try {
      await deleteLead(id);
      setLeads(prev => prev.filter(l => l.id !== id));
      notify('🗑️ Eliminado');
    } catch (error) {
      notify('❌ Error');
    }
  };

  const handleImportLeads = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setSaving(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws);
      
      const empresaMap = { 'gmc360': 'gmc', 'gmc': 'gmc', 'educa': 'educa', '360educa': 'educa' };
      let imported = 0;
      
      for (const row of rows) {
        const fecha = row['FECHA'] || row['Fecha'] || row['fecha'] || '';
        const origen = row['ORIGEN'] || row['Origen'] || row['origen'] || '';
        const empresaRaw = (row['EMPRESA'] || row['Empresa'] || row['empresa'] || '').toString().toLowerCase().trim();
        const empresa = empresaMap[empresaRaw] || empresaRaw;
        const servicio = row['SERVICIO'] || row['Servicio'] || row['servicio'] || '';
        const notas = row['NOTAS'] || row['Notas'] || row['notas'] || '';
        
        if (!fecha || !origen || !empresa || !servicio) continue;
        
        // Formatear fecha si viene como número de Excel
        let fechaStr = fecha;
        if (typeof fecha === 'number') {
          const d = new Date((fecha - 25569) * 86400 * 1000);
          fechaStr = d.toISOString().split('T')[0];
        }
        
        const leadData = { fecha: fechaStr, origen, empresa, servicio, notas: notas || '' };
        const newLead = await addLead(leadData);
        setLeads(prev => [newLead, ...prev]);
        imported++;
      }
      
      notify(`✅ ${imported} leads importados`);
    } catch (error) {
      console.error('Error importando:', error);
      notify('❌ Error al importar');
    }
    setSaving(false);
    e.target.value = '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-[#8B5CF6] mx-auto mb-4" />
          <p className="text-gray-600">Conectando...</p>
        </div>
      </div>
    );
  }

  const getIcon = (red) => {
    if (red.key === 'tiktok') return <TikTokIcon size={14} />;
    if (red.icon) return <red.icon size={14} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}

      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#8B5CF6] to-[#F97316] rounded-lg flex items-center justify-center">
              <BarChart3 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="font-bold text-gray-800">Social Analytics</h1>
              <p className="text-xs text-gray-500">EDUCA + GMC360 + Maribel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${online ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {online ? <Cloud size={14} /> : <CloudOff size={14} />}
              {online ? 'Conectado' : 'Sin conexión'}
            </div>
            <Button variant="secondary" onClick={loadData}>
              <Loader2 size={16} /> Actualizar
            </Button>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'trends', icon: TrendingUp, label: 'Tendencias' },
            { id: 'history', icon: List, label: 'Historial' },
            { id: 'leads', icon: Target, label: 'Leads' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all whitespace-nowrap ${
                view === tab.id ? 'bg-[#8B5CF6] text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Dashboard Semanal</h2>
              <Button onClick={() => setMetricasModal({ open: true, edit: null })}>
                <Plus size={16} /> Agregar Métricas
              </Button>
            </div>

            {metricas.length === 0 ? (
              <Card className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">No hay datos todavía</p>
              </Card>
            ) : (
              <>
                {/* Gráficas de Seguidores - Separadas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {EMPRESAS.map(empresa => (
                    <Card key={empresa.key}>
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Users size={20} style={{ color: empresa.color }} />
                        Seguidores {empresa.label}
                      </h3>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={REDES.map(red => ({
                          red: red.label,
                          Seguidores: latest?.[`${empresa.key}_${red.key}_seg`] || 0,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="red" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip formatter={(value) => value.toLocaleString()} />
                          <Bar dataKey="Seguidores" radius={[4, 4, 0, 0]}>
                            {REDES.map((red, i) => (
                              <Cell key={i} fill={red.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-2 text-center">
                        <span className="text-sm text-gray-500">Total: </span>
                        <span className="font-bold" style={{ color: empresa.color }}>
                          {REDES.reduce((sum, red) => sum + (latest?.[`${empresa.key}_${red.key}_seg`] || 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Gráfica de Leads por Origen */}
                <Card>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Target size={20} className="text-[#10B981]" />
                      Leads por Origen
                    </h3>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-[#8B5CF6]">{leadStats.total}</p>
                      <p className="text-xs text-gray-500">Total leads</p>
                    </div>
                  </div>
                  
                  {leadStats.porOrigen.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={leadStats.porOrigen} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} />
                        <Tooltip />
                        <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                          {leadStats.porOrigen.map((_, i) => (
                            <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target size={32} className="mx-auto mb-2 opacity-30" />
                      <p>No hay leads registrados aún</p>
                    </div>
                  )}

                  {/* Mini resumen por empresa */}
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    {EMPRESAS_LEADS.map(e => (
                      <div key={e.key} className="text-center p-3 rounded-lg" style={{ backgroundColor: `${e.color}10` }}>
                        <p className="text-2xl font-bold" style={{ color: e.color }}>{leadStats.porEmpresa[e.key] || 0}</p>
                        <p className="text-xs text-gray-600">{e.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        {/* TENDENCIAS */}
        {view === 'trends' && (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                  {EMPRESAS.map(e => (
                    <button
                      key={e.key}
                      onClick={() => setSelectedEmpresa(e.key)}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                        selectedEmpresa === e.key ? 'bg-white shadow' : 'text-gray-600'
                      }`}
                      style={{ color: selectedEmpresa === e.key ? e.color : undefined }}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b">
                {REDES.map(red => (
                  <div key={red.key} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: red.color }}></div>
                    <span className="text-sm">{red.label}</span>
                  </div>
                ))}
              </div>

              {chartData.length > 1 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {REDES.map(red => (
                      <Line
                        key={red.key}
                        type="monotone"
                        dataKey={`${selectedEmpresa}_${red.key}_${selectedMetrica}`}
                        name={red.label}
                        stroke={red.color}
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Necesitas al menos 2 registros para ver tendencias
                </div>
              )}
            </Card>
          </div>
        )}

        {/* HISTORIAL */}
        {view === 'history' && (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold">Historial de Métricas</h2>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => exportMetricas(sortedMetricas)}>
                  <Download size={16} /> Excel
                </Button>
                <Button onClick={() => setMetricasModal({ open: true, edit: null })}>
                  <Plus size={16} /> Agregar
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-1">Fecha</th>
                    {EMPRESAS.map(e => (
                      <th key={e.key} colSpan={8} className="text-center py-2 px-1" style={{ backgroundColor: `${e.color}15`, color: e.color }}>
                        {e.label}
                      </th>
                    ))}
                    <th className="text-center py-2 px-1">Acc</th>
                  </tr>
                  <tr className="border-b text-gray-500">
                    <th></th>
                    {EMPRESAS.map(e => (
                      REDES.map(r => (
                        <th key={`${e.key}-${r.key}`} colSpan={2} className="py-1 px-1" style={{ color: r.color }}>
                          {r.label.substring(0, 2)}
                        </th>
                      ))
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...sortedMetricas].reverse().map(row => (
                    <tr key={row.fecha} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-1 font-medium">{row.fecha}</td>
                      {EMPRESAS.map(e => (
                        REDES.map(r => (
                          METRICAS.map(m => (
                            <td key={`${e.key}-${r.key}-${m.key}`} className="py-1 px-1 text-center">
                              {(row[`${e.key}_${r.key}_${m.key}`] || 0).toLocaleString()}
                            </td>
                          ))
                        ))
                      ))}
                      <td className="py-2 px-1 text-center">
                        <button onClick={() => setMetricasModal({ open: true, edit: row })} className="text-blue-600 hover:underline mr-1">E</button>
                        <button onClick={() => handleDeleteMetrica(row.fecha)} className="text-red-500 hover:underline">X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* LEADS */}
        {view === 'leads' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Gestión de Leads</h2>
              <div className="flex gap-2">
                <label className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                  <Upload size={16} /> Importar Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportLeads}
                    className="hidden"
                    disabled={saving}
                  />
                </label>
                <Button onClick={() => setLeadModal(true)}>
                  <Plus size={16} /> Nuevo Lead
                </Button>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <h3 className="font-semibold mb-3">Total de Leads</h3>
                <p className="text-4xl font-bold text-[#8B5CF6]">{leadStats.total}</p>
              </Card>
              
              <Card>
                <h3 className="font-semibold mb-3">Por Empresa</h3>
                <div className="space-y-2">
                  {EMPRESAS_LEADS.map(e => (
                    <div key={e.key} className="flex justify-between">
                      <span style={{ color: e.color }}>{e.label}</span>
                      <span className="font-bold">{leadStats.porEmpresa[e.key] || 0}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="font-semibold mb-3">Por Origen</h3>
                {leadStats.porOrigen.length > 0 ? (
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={leadStats.porOrigen}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {leadStats.porOrigen.map((_, i) => (
                          <Cell key={i} fill={COLORES_PIE[i % COLORES_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-sm">Sin datos</p>
                )}
              </Card>
            </div>

            {/* Gráfica: Leads por Semana */}
            {leadStats.semanasOrdenadas.length > 1 && (
              <Card>
                <h3 className="font-semibold mb-4">📈 Leads por Semana</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={leadStats.semanasOrdenadas}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke="#6B7280" strokeWidth={2} name="Total" dot={{ r: 4 }} />
                    {EMPRESAS_LEADS.map(e => (
                      <Line key={e.key} type="monotone" dataKey={e.key} stroke={e.color} strokeWidth={1.5} strokeDasharray="5 5" name={e.label} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Gráfica: Leads por Servicio */}
              {leadStats.porServicioData.length > 0 && (
                <Card>
                  <h3 className="font-semibold mb-4">🎯 Leads por Servicio</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={leadStats.porServicioData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
                        {leadStats.porServicioData.map((entry, i) => (
                          <Cell key={i} fill={EMPRESAS.find(e => e.key === entry.empresa)?.color || '#6B7280'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* Gráfica: Origen x Semana (apilada) */}
              {leadStats.origenSemanaOrdenado.length > 1 && (
                <Card>
                  <h3 className="font-semibold mb-4">🔀 Origen por Semana</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={leadStats.origenSemanaOrdenado}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      {leadStats.origenesUnicos.map((origen, i) => (
                        <Bar key={origen} dataKey={origen} stackId="a" fill={COLORES_PIE[i % COLORES_PIE.length]} name={origen} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>

            {/* Tabla de leads */}
            <Card>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Listado de Leads</h3>
                <Button variant="secondary" onClick={() => exportLeads(leads)}>
                  <Download size={16} /> Excel
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Origen</th>
                      <th className="text-left py-2 px-2">Empresa</th>
                      <th className="text-left py-2 px-2">Servicio</th>
                      <th className="text-left py-2 px-2">Notas</th>
                      <th className="text-center py-2 px-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{lead.fecha}</td>
                        <td className="py-2 px-2">{lead.origen}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: EMPRESAS.find(e => e.key === lead.empresa)?.color || '#6B7280' }}>
                            {EMPRESAS.find(e => e.key === lead.empresa)?.label || lead.empresa}
                          </span>
                        </td>
                        <td className="py-2 px-2">{lead.servicio}</td>
                        <td className="py-2 px-2 text-gray-500 text-xs">{lead.notas || '-'}</td>
                        <td className="py-2 px-2 text-center">
                          <button onClick={() => handleDeleteLead(lead.id)} className="text-red-500 hover:underline">
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500">
                          No hay leads registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </main>

      <MetricasModal
        isOpen={metricasModal.open}
        onClose={() => setMetricasModal({ open: false, edit: null })}
        onSave={handleSaveMetrica}
        editData={metricasModal.edit}
        existingDates={metricas.map(m => m.fecha)}
        loading={saving}
      />

      <LeadModal
        isOpen={leadModal}
        onClose={() => setLeadModal(false)}
        onSave={handleSaveLead}
        loading={saving}
      />

      <footer className="border-t bg-white mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-[#8B5CF6]" />
            <span className="font-semibold">Social Analytics</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Firebase</span>
          </div>
          <p className="text-xs text-gray-400">© 2026 - EDUCA + GMC360 + Maribel</p>
        </div>
      </footer>
    </div>
  );
}
