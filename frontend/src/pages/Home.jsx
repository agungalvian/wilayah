import React, { useState, useEffect } from 'react';
import { Database, LayoutGrid, MapPin, Search } from 'lucide-react';
import ApiPlayground from '../components/ApiPlayground';

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3032/api/v1' : `${window.location.protocol}//${window.location.hostname}:3032/api/v1`);

const Home = () => {
  const [stats, setStats] = useState({ provinsi: 0, kabupaten: 0, kecamatan: 0, desa: 0 });
  const [provinces, setProvinces] = useState([]);
  const [regencies, setRegencies] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [selectedProv, setSelectedProv] = useState('');
  const [selectedReg, setSelectedReg] = useState('');
  const [selectedDist, setSelectedDist] = useState('');

  const [highlightData, setHighlightData] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Error fetching stats:", err));

    fetch(`${API_BASE}/provinsi`)
      .then(res => res.json())
      .then(data => setProvinces(data))
      .catch(err => console.error("Error fetching provinces:", err));
  }, []);

  useEffect(() => {
    if (selectedProv) {
      fetch(`${API_BASE}/kabupaten?provinsi_id=${selectedProv}`)
        .then(res => res.json())
        .then(data => {
          setRegencies(data);
          setSelectedReg('');
          setSelectedDist('');
          setDistricts([]);
          fetchHighlight('provinsi', selectedProv);
        });
    } else {
      setRegencies([]);
      setSelectedReg('');
      setHighlightData(null);
    }
  }, [selectedProv]);

  useEffect(() => {
    if (selectedReg) {
      fetch(`${API_BASE}/kecamatan?kabupaten_id=${selectedReg}`)
        .then(res => res.json())
        .then(data => {
          setDistricts(data);
          setSelectedDist('');
          fetchHighlight('kabupaten', selectedReg);
        });
    } else {
      setDistricts([]);
      setSelectedDist('');
      if (selectedProv) fetchHighlight('provinsi', selectedProv);
    }
  }, [selectedReg]);

  useEffect(() => {
    if (selectedDist) {
      fetchHighlight('kecamatan', selectedDist);
    } else if (selectedReg) {
      fetchHighlight('kabupaten', selectedReg);
    }
  }, [selectedDist]);

  const fetchHighlight = (level, kode) => {
    fetch(`${API_BASE}/wilayah/detail?level=${level}&kode=${kode}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setHighlightData(data);
        else setHighlightData(null);
      })
      .catch(err => console.error("Error fetching highlight:", err));
  };

  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1>API Kode Wilayah Indonesia</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Data wilayah komprehensif, diperbarui untuk tahun 2026.
        </p>
      </header>

      {/* Metrics Section */}
      <section className="metrics-grid">
        <div className="glass-card metric-card">
          <LayoutGrid size={32} color="#e70000" style={{ margin: '0 auto' }} />
          <div className="metric-value">{stats.provinsi.toLocaleString('id-ID')}</div>
          <div className="metric-label">Provinsi</div>
        </div>
        <div className="glass-card metric-card">
          <Database size={32} color="#10b981" style={{ margin: '0 auto' }} />
          <div className="metric-value">{stats.kabupaten.toLocaleString('id-ID')}</div>
          <div className="metric-label">Kabupaten / Kota</div>
        </div>
        <div className="glass-card metric-card">
          <MapPin size={32} color="#8b5cf6" style={{ margin: '0 auto' }} />
          <div className="metric-value">{stats.kecamatan.toLocaleString('id-ID')}</div>
          <div className="metric-label">Kecamatan</div>
        </div>
        <div className="glass-card metric-card">
          <Search size={32} color="#f59e0b" style={{ margin: '0 auto' }} />
          <div className="metric-value">{stats.desa.toLocaleString('id-ID')}</div>
          <div className="metric-label">Desa</div>
        </div>
      </section>

      {/* Cascading Dropdowns Section */}
      <section className="glass-card" style={{ marginBottom: '3rem' }}>
        <h2>Data Wilayah</h2>

        <div className="highlight-panel glass-card">
          <div className="highlight-code">
            <div>
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'block' }}>KODE BPS</span>
              <span style={{ color: '#e70000' }}>{highlightData ? highlightData.kode_bps : '-'}</span>
            </div>
            <div style={{ width: '1px', background: 'var(--card-border)' }}></div>
            <div>
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', display: 'block' }}>KODE KEMENDAGRI</span>
              <span style={{ color: '#10b981' }}>{highlightData ? (highlightData.kode_dagri || '-') : '-'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Pilih Provinsi</label>
            <select className="form-select" value={selectedProv} onChange={e => setSelectedProv(e.target.value)}>
              <option value="">-- Pilih Provinsi --</option>
              {provinces.map(p => (
                <option key={p.kode_provinsi} value={p.kode_provinsi}>
                  [{p.kode_provinsi}] {p.nama_provinsi}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pilih Kabupaten/Kota</label>
            <select className="form-select" disabled={!selectedProv} value={selectedReg} onChange={e => setSelectedReg(e.target.value)}>
              <option value="">-- Pilih Kabupaten --</option>
              {regencies.map(r => (
                <option key={r.kode_kabupaten} value={r.kode_kabupaten}>
                  [{r.kode_kabupaten}] {r.nama_kabupaten}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pilih Kecamatan</label>
            <select className="form-select" disabled={!selectedReg} value={selectedDist} onChange={e => setSelectedDist(e.target.value)}>
              <option value="">-- Pilih Kecamatan --</option>
              {districts.map(d => (
                <option key={d.kode_kecamatan} value={d.kode_kecamatan}>
                  [{d.kode_kecamatan}] {d.nama_kecamatan}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <ApiPlayground />
    </div>
  );
};

export default Home;
