// src/components/Admin/Documentation.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { FaBook, FaDownload, FaFileAlt } from 'react-icons/fa';
import API from '../../api/api';
import './Admin.css';

const Documentation = () => {
  const { token, showNotification } = useContext(AppContext);
  const [docsList, setDocsList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocsList = async () => {
      try {
        const res = await API.get('/admin/documentation');
        if (res.data.success) {
          setDocsList(res.data.data);
          if (res.data.data.length > 0) {
            handleSelectDoc(res.data.data[0]);
          }
        }
      } catch (err) {
        showNotification('Failed to fetch documentation list', 'error');
      }
    };
    fetchDocsList();
  }, []);

  const handleSelectDoc = async (doc) => {
    setSelectedDoc(doc);
    setLoading(true);
    try {
      const res = await API.get(`/admin/documentation/${doc.name}`);
      if (res.data.success) {
        setContent(res.data.content);
      }
    } catch (err) {
      showNotification('Failed to load documentation content', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Simple Markdown-to-HTML parser for rendering docs beautifully
  const renderMarkdown = (md) => {
    if (!md) return '';
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block">$1</pre>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Headers
    html = html.replace(/^# (.*$)/gim, '<h1 class="md-h1">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="md-h2">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="md-h3">$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4 class="md-h4">$1</h4>');
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italics
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Bullet points
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="md-li">$1</li>');
    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return { __html: html };
  };

  return (
    <div className="docs-panel" style={{ display: 'flex', gap: '20px', minHeight: 'calc(100vh - 120px)', padding: '20px' }}>
      {/* Sidebar List */}
      <div className="docs-sidebar-nav" style={{ width: '300px', flexShrink: 0, background: 'var(--noir-card, #131926)', borderRadius: '8px', padding: '15px', border: '1px solid var(--noir-border, #1E293B)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', borderBottom: '1px solid #1E293B', paddingBottom: '10px', color: 'var(--accent-warm, #D4AF37)' }}>
          <FaBook /> Documentation
        </h3>
        {docsList.map((doc) => (
          <button
            key={doc.name}
            onClick={() => handleSelectDoc(doc)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: '6px',
              border: 'none',
              background: selectedDoc?.name === doc.name ? 'rgba(212, 175, 55, 0.15)' : 'transparent',
              color: selectedDoc?.name === doc.name ? 'var(--accent-warm, #D4AF37)' : 'var(--text-2, #94A3B8)',
              fontWeight: selectedDoc?.name === doc.name ? 'bold' : 'normal',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <FaFileAlt /> {doc.label}
          </button>
        ))}
      </div>

      {/* Content Viewer */}
      <div className="docs-viewer-body" style={{ flex: 1, background: 'var(--noir-card, #131926)', borderRadius: '8px', padding: '30px', border: '1px solid var(--noir-border, #1E293B)', position: 'relative' }}>
        {selectedDoc && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #1E293B', paddingBottom: '15px' }}>
            <h2 style={{ margin: 0 }}>{selectedDoc.label}</h2>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--accent-warm, #D4AF37)',
                color: '#000',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <FaDownload /> Print / PDF
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <div className="adl-spinner" />
          </div>
        ) : (
          <div
            className="markdown-content"
            style={{
              lineHeight: '1.7',
              fontSize: '15px',
              color: 'var(--text-1, #E2E8F0)',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 280px)',
              paddingRight: '10px'
            }}
            dangerouslySetInnerHTML={renderMarkdown(content)}
          />
        )}
      </div>

      {/* Global CSS style overrides for printing documents */}
      <style>{`
        .markdown-content .code-block {
          background: #0B0F19;
          padding: 15px;
          border-radius: 6px;
          border: 1px solid #1E293B;
          font-family: monospace;
          white-space: pre-wrap;
          margin: 15px 0;
          color: #10B981;
        }
        .markdown-content code {
          background: rgba(255, 255, 255, 0.08);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          color: #D4AF37;
        }
        .markdown-content .md-h1 { border-bottom: 2px solid #D4AF37; padding-bottom: 8px; margin-top: 30px; margin-bottom: 20px; font-size: 24px; color: #fff; }
        .markdown-content .md-h2 { margin-top: 25px; margin-bottom: 15px; font-size: 20px; color: #fff; }
        .markdown-content .md-h3 { margin-top: 20px; margin-bottom: 10px; font-size: 18px; color: #fff; }
        .markdown-content .md-li { margin-left: 20px; list-style-type: square; }
        
        @media print {
          body * {
            visibility: hidden;
          }
          .docs-viewer-body, .docs-viewer-body * {
            visibility: visible;
          }
          .docs-viewer-body {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            background: #fff !important;
            color: #000 !important;
            padding: 0 !important;
          }
          .docs-viewer-body button {
            display: none !important;
          }
          .markdown-content {
            max-height: none !important;
            color: #000 !important;
          }
          .markdown-content .md-h1,
          .markdown-content .md-h2,
          .markdown-content .md-h3 {
            color: #000 !important;
          }
          .markdown-content .code-block {
            background: #f5f5f5 !important;
            color: #000 !important;
            border: 1px solid #ddd !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Documentation;
