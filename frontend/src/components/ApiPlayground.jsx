import React, { useState } from 'react';

const API_BASE = 'http://localhost:3032/api/v1';

const EndpointPlayground = ({ method, path, description, paramsConfig = [], hasBody = false, defaultBody = '' }) => {
  const [params, setParams] = useState({});
  const [body, setBody] = useState(defaultBody);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParamChange = (key, value) => {
    setParams({ ...params, [key]: value });
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    try {
      let url = API_BASE + path;
      let queryParams = [];

      // Replace path variables or add query params
      paramsConfig.forEach(p => {
        if (p.in === 'path') {
          url = url.replace(`:${p.name}`, params[p.name] || '');
        } else if (p.in === 'query' && params[p.name]) {
          queryParams.push(`${p.name}=${encodeURIComponent(params[p.name])}`);
        }
      });

      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }

      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (hasBody && body) {
        options.body = body;
      }

      const startTime = Date.now();
      const res = await fetch(url, options);
      const data = await res.json();
      const duration = Date.now() - startTime;

      setResponse({
        status: res.status,
        statusText: res.statusText,
        duration,
        data
      });
    } catch (err) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        duration: 0,
        data: err.message
      });
    }
    setLoading(false);
  };

  const getMethodClass = () => {
    switch (method.toLowerCase()) {
      case 'get': return 'method-get';
      case 'post': return 'method-post';
      case 'put': return 'method-put';
      case 'delete': return 'method-delete';
      default: return '';
    }
  };

  return (
    <div className="api-endpoint glass-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <span className={`api-method ${getMethodClass()}`}>{method.toUpperCase()}</span>
        <span className="api-path">{path}</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{description}</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <div style={{ flex: '1 1 300px' }}>
          <h4 style={{ marginBottom: '1rem' }}>Parameters</h4>
          {paramsConfig.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tidak ada parameter.</p>
          ) : (
            paramsConfig.map(p => (
              <div key={p.name} className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  {p.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 'normal' }}>({p.in})</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ padding: '0.5rem' }}
                  placeholder={p.placeholder || ''} 
                  value={params[p.name] || ''} 
                  onChange={e => handleParamChange(p.name, e.target.value)} 
                />
              </div>
            ))
          )}

          {hasBody && (
            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem' }}>Request Body (JSON)</h4>
              <textarea 
                className="form-input" 
                style={{ fontFamily: 'monospace', minHeight: '150px', fontSize: '0.85rem' }}
                value={body}
                onChange={e => setBody(e.target.value)}
              ></textarea>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            style={{ marginTop: '1rem', width: '100%' }}
            onClick={handleSend}
            disabled={loading}
          >
            {loading ? 'Mengirim...' : 'Kirim Request'}
          </button>
        </div>

        <div style={{ flex: '2 1 400px' }}>
          <h4 style={{ marginBottom: '1rem' }}>Response</h4>
          <div 
            style={{ 
              background: '#1e293b', 
              color: '#f8fafc', 
              padding: '1rem', 
              borderRadius: '8px',
              fontFamily: 'monospace',
              minHeight: '200px',
              maxHeight: '400px',
              overflowY: 'auto'
            }}
          >
            {response ? (
              <>
                <div style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: response.status >= 200 && response.status < 300 ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    Status: {response.status} {response.statusText}
                  </span>
                  <span style={{ marginLeft: '1rem', color: '#94a3b8' }}>{response.duration} ms</span>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.85rem' }}>
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </>
            ) : (
              <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                Tekan "Kirim Request" untuk melihat respon
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ApiPlayground = () => {
  return (
    <section className="glass-card" style={{ marginTop: '3rem' }}>
      <h2>Dokumentasi API & Playground</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Coba langsung endpoint RESTful yang tersedia menggunakan form di bawah ini.
      </p>

      <EndpointPlayground 
        method="GET"
        path="/stats"
        description="Mengembalikan total jumlah untuk provinsi, kabupaten, kecamatan, dan desa."
      />

      <EndpointPlayground 
        method="GET"
        path="/wilayah"
        description="Mengembalikan daftar wilayah dengan paginasi."
        paramsConfig={[
          { name: 'level', in: 'query', placeholder: 'provinsi / kabupaten / kecamatan / desa' },
          { name: 'search', in: 'query', placeholder: 'contoh: bandung' },
          { name: 'page', in: 'query', placeholder: '1' },
          { name: 'limit', in: 'query', placeholder: '10' }
        ]}
      />

      <EndpointPlayground 
        method="GET"
        path="/wilayah/:kode_bps"
        description="Mengembalikan satu catatan detail wilayah berdasarkan Kode BPS-nya."
        paramsConfig={[
          { name: 'kode_bps', in: 'path', placeholder: '11' }
        ]}
      />

      <EndpointPlayground 
        method="GET"
        path="/provinsi"
        description="Mengembalikan daftar semua provinsi (kode_provinsi dan nama_provinsi) untuk dropdown pertama."
      />

      <EndpointPlayground 
        method="GET"
        path="/kabupaten"
        description="Mengembalikan daftar kabupaten/kota yang difilter berdasarkan kode_provinsi."
        paramsConfig={[
          { name: 'provinsi_id', in: 'query', placeholder: 'contoh: 11' }
        ]}
      />

      <EndpointPlayground 
        method="GET"
        path="/kecamatan"
        description="Mengembalikan daftar kecamatan yang difilter berdasarkan kode_kabupaten."
        paramsConfig={[
          { name: 'kabupaten_id', in: 'query', placeholder: 'contoh: 1101' }
        ]}
      />

      <EndpointPlayground 
        method="GET"
        path="/wilayah/detail"
        description="Mengembalikan detail lengkap wilayah yang dipilih (termasuk kode_bps dan kode_dagri)."
        paramsConfig={[
          { name: 'level', in: 'query', placeholder: 'provinsi / kabupaten / kecamatan' },
          { name: 'kode', in: 'query', placeholder: 'contoh: 11' }
        ]}
      />

      <EndpointPlayground 
        method="POST"
        path="/admin/wilayah"
        description="Membuat catatan wilayah baru. (Hanya admin)"
        hasBody={true}
        defaultBody={JSON.stringify({
          level: "provinsi",
          kode_bps: "99",
          nama_bps: "PROVINSI BARU",
          kode_dagri: "99",
          nama_dagri: "PROVINSI BARU"
        }, null, 2)}
      />

    </section>
  );
};

export default ApiPlayground;
