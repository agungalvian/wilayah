import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Plus, X, LogOut, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = '/api/v1';

const Admin = () => {
  const [data, setData] = useState([]);
  const [metadata, setMetadata] = useState({ page: 1, limit: 10, total_data: 0, total_page: 0 });
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(null);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwdData, setPwdData] = useState({ oldPassword: '', newPassword: '', error: '', success: '' });
  
  useEffect(() => {
    fetchData();
  }, [page, level, search]);

  const fetchData = () => {
    let url = `${API_BASE}/wilayah?page=${page}&limit=10`;
    if (search) url += `&search=${search}`;
    if (level) url += `&level=${level}`;
    
    fetch(url)
      .then(res => res.json())
      .then(resData => {
        setData(resData.data);
        setMetadata(resData.metadata);
      })
      .catch(err => console.error("Error fetching data:", err));
  };

  const handleDelete = (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      fetch(`${API_BASE}/admin/wilayah/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(() => fetchData())
        .catch(err => console.error(err));
    }
  };

  const handleOpenModal = (record = null) => {
    if (record) {
      setFormData({ ...record });
    } else {
      setFormData({
        level: 'provinsi',
        kode_bps: '',
        nama_bps: '',
        kode_dagri: '',
        nama_dagri: '',
        kode_provinsi: '',
        nama_provinsi: '',
        kode_kabupaten: '',
        nama_kabupaten: '',
        kode_kecamatan: '',
        nama_kecamatan: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const isEdit = !!formData.id;
    const url = isEdit ? `${API_BASE}/admin/wilayah/${formData.id}` : `${API_BASE}/admin/wilayah`;
    const method = isEdit ? 'PUT' : 'POST';

    fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    })
      .then(res => res.json())
      .then(() => {
        handleCloseModal();
        fetchData();
      })
      .catch(err => console.error(err));
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdData({ ...pwdData, error: '', success: '' });
    try {
      const res = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword: pwdData.oldPassword, newPassword: pwdData.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwdData({ oldPassword: '', newPassword: '', error: '', success: 'Password berhasil diubah.' });
    } catch (err) {
      setPwdData({ ...pwdData, error: err.message, success: '' });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2>Manajemen Data</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Tambah Data
          </button>
          <button className="btn" style={{ background: '#10b981', color: 'white' }} onClick={() => setShowPwdModal(true)}>
            <KeyRound size={18} style={{ marginRight: '0.5rem' }} /> Ganti Password
          </button>
          <button className="btn btn-danger" onClick={handleLogout}>
            <LogOut size={18} style={{ marginRight: '0.5rem' }} /> Logout
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Cari berdasarkan nama atau kode..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '3rem' }}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '200px' }}
            value={level}
            onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          >
            <option value="">Semua Tingkat</option>
            <option value="provinsi">Provinsi</option>
            <option value="kabupaten">Kabupaten</option>
            <option value="kecamatan">Kecamatan</option>
            <option value="desa">Desa</option>
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Level</th>
                <th>Kode BPS</th>
                <th>Nama BPS</th>
                <th>Kode Dagri</th>
                <th>Nama Dagri</th>
                <th>Kode Prov</th>
                <th>Nama Prov</th>
                <th>Kode Kab</th>
                <th>Nama Kab</th>
                <th>Kode Kec</th>
                <th>Nama Kec</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id}>
                  <td style={{ textTransform: 'capitalize' }}>{item.level}</td>
                  <td>{item.kode_bps}</td>
                  <td>{item.nama_bps}</td>
                  <td>{item.kode_dagri || '-'}</td>
                  <td>{item.nama_dagri || '-'}</td>
                  <td>{item.kode_provinsi || '-'}</td>
                  <td>{item.nama_provinsi || '-'}</td>
                  <td>{item.kode_kabupaten || '-'}</td>
                  <td>{item.nama_kabupaten || '-'}</td>
                  <td>{item.kode_kecamatan || '-'}</td>
                  <td>{item.nama_kecamatan || '-'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn" 
                      style={{ padding: '0.5rem', background: 'transparent', color: 'var(--text-primary)' }}
                      onClick={() => handleOpenModal(item)}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="btn" 
                      style={{ padding: '0.5rem', background: 'transparent', color: 'var(--danger)' }}
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {metadata.total_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', alignItems: 'center' }}>
            <button 
              className="btn" 
              style={{ background: 'rgba(255,255,255,0.1)' }}
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Sebelumnya
            </button>
            <span style={{ color: 'var(--text-secondary)' }}>
              Halaman {page} dari {metadata.total_page}
            </span>
            <button 
              className="btn" 
              style={{ background: 'rgba(255,255,255,0.1)' }}
              disabled={page === metadata.total_page}
              onClick={() => setPage(p => p + 1)}
            >
              Selanjutnya
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{formData.id ? 'Edit Data' : 'Tambah Data'}</h3>
              <button className="btn" style={{ background: 'transparent', padding: '0.5rem' }} onClick={handleCloseModal}>
                <X size={20} color="var(--text-primary)" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Level *</label>
                <select 
                  className="form-select" 
                  value={formData.level} 
                  onChange={e => setFormData({...formData, level: e.target.value})}
                  required
                >
                  <option value="provinsi">Provinsi</option>
                  <option value="kabupaten">Kabupaten</option>
                  <option value="kecamatan">Kecamatan</option>
                  <option value="desa">Desa</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Kode BPS *</label>
                  <input type="text" className="form-input" required value={formData.kode_bps} onChange={e => setFormData({...formData, kode_bps: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Nama BPS *</label>
                  <input type="text" className="form-input" required value={formData.nama_bps} onChange={e => setFormData({...formData, nama_bps: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Kode Kemendagri</label>
                  <input type="text" className="form-input" value={formData.kode_dagri || ''} onChange={e => setFormData({...formData, kode_dagri: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Nama Kemendagri</label>
                  <input type="text" className="form-input" value={formData.nama_dagri || ''} onChange={e => setFormData({...formData, nama_dagri: e.target.value})} />
                </div>
              </div>

              {formData.level !== 'provinsi' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Kode Provinsi</label>
                    <input type="text" className="form-input" value={formData.kode_provinsi || ''} onChange={e => setFormData({...formData, kode_provinsi: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nama Provinsi</label>
                    <input type="text" className="form-input" value={formData.nama_provinsi || ''} onChange={e => setFormData({...formData, nama_provinsi: e.target.value})} />
                  </div>
                </div>
              )}

              {['kecamatan', 'desa'].includes(formData.level) && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Kode Kabupaten</label>
                    <input type="text" className="form-input" value={formData.kode_kabupaten || ''} onChange={e => setFormData({...formData, kode_kabupaten: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nama Kabupaten</label>
                    <input type="text" className="form-input" value={formData.nama_kabupaten || ''} onChange={e => setFormData({...formData, nama_kabupaten: e.target.value})} />
                  </div>
                </div>
              )}

              {formData.level === 'desa' && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Kode Kecamatan</label>
                    <input type="text" className="form-input" value={formData.kode_kecamatan || ''} onChange={e => setFormData({...formData, kode_kecamatan: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Nama Kecamatan</label>
                    <input type="text" className="form-input" value={formData.nama_kecamatan || ''} onChange={e => setFormData({...formData, nama_kecamatan: e.target.value})} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={handleCloseModal}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan Perubahan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Password Modal */}
      {showPwdModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Ganti Password</h3>
              <button className="btn" style={{ background: 'transparent', padding: '0.5rem' }} onClick={() => setShowPwdModal(false)}>
                <X size={20} color="var(--text-primary)" />
              </button>
            </div>

            {pwdData.error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{pwdData.error}</div>}
            {pwdData.success && <div style={{ color: '#10b981', marginBottom: '1rem' }}>{pwdData.success}</div>}

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Password Lama</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={pwdData.oldPassword}
                  onChange={e => setPwdData({...pwdData, oldPassword: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password Baru</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={pwdData.newPassword}
                  onChange={e => setPwdData({...pwdData, newPassword: e.target.value})}
                  required
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => setShowPwdModal(false)}>Tutup</button>
                <button type="submit" className="btn btn-primary">Simpan Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
