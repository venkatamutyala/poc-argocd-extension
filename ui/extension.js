import React, { useState, useEffect } from 'react';

// Helper function to calculate time ago
function getTimeAgo(isoString) {
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// Main GlueOps Extension Component
function GlueOpsExtension({ application, tree }) {
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchGlueOpsMetadata();
  }, [application]);

  async function fetchGlueOpsMetadata() {
    try {
      setLoading(true);
      setError(null);

      // Call the proxy endpoint that ArgoCD will route to our backend
      const response = await fetch('/extensions/glueops/api/glueops-metadata');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setMetadata(result.data);
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Error fetching GlueOps metadata:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleRefresh() {
    fetchGlueOpsMetadata();
  }

  function toggleExpanded() {
    setIsExpanded(!isExpanded);
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>GlueOps</span>
          <span style={styles.loading}>Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <span style={styles.title}>GlueOps</span>
          <button onClick={handleRefresh} style={styles.refreshButton}>
            Retry
          </button>
        </div>
        <div style={styles.error}>
          Error: {error}
        </div>
      </div>
    );
  }

  if (!metadata) {
    return null;
  }

  const timeAgo = getTimeAgo(metadata.lastUpdated);

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={toggleExpanded}>
        <div style={styles.headerLeft}>
          <span style={styles.title}>GlueOps</span>
          <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
        </div>
        <div style={styles.headerRight}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }} 
            style={styles.refreshButton}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {isExpanded && (
        <div style={styles.content}>
          <div style={styles.linksContainer}>
            <LinkItem 
              label={metadata.metrics.label} 
              url={metadata.metrics.url} 
              icon="📊"
            />
            <LinkItem 
              label={metadata.logs.label} 
              url={metadata.logs.url} 
              icon="📝"
            />
            <LinkItem 
              label={metadata.traces.label} 
              url={metadata.traces.url} 
              icon="🔍"
            />
            <LinkItem 
              label={metadata.secrets.label} 
              url={metadata.secrets.url} 
              icon="🔐"
            />
            <LinkItem 
              label={metadata.infrastructure.label} 
              url={metadata.infrastructure.url} 
              icon="🏗️"
            />
          </div>

          <div style={styles.footer}>
            <span style={styles.timestamp}>
              Last Updated: {timeAgo}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Component for individual link items
function LinkItem({ label, url, icon }) {
  return (
    <div style={styles.linkItem}>
      <span style={styles.linkIcon}>{icon}</span>
      <span style={styles.linkLabel}>{label}:</span>
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        style={styles.link}
      >
        {url}
      </a>
    </div>
  );
}

// Styles
const styles = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e1e4e8',
    borderRadius: '6px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: '#f6f8fa',
    borderBottom: '1px solid #e1e4e8',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#24292e',
  },
  expandIcon: {
    fontSize: '10px',
    color: '#586069',
  },
  loading: {
    fontSize: '12px',
    color: '#586069',
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: '#0366d6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  error: {
    padding: '12px 16px',
    color: '#d73a49',
    fontSize: '12px',
    backgroundColor: '#ffeef0',
  },
  content: {
    padding: '16px',
  },
  linksContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  linkItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#f6f8fa',
    borderRadius: '4px',
    fontSize: '13px',
  },
  linkIcon: {
    fontSize: '16px',
  },
  linkLabel: {
    fontWeight: '600',
    color: '#24292e',
    minWidth: '80px',
  },
  link: {
    color: '#0366d6',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  footer: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #e1e4e8',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: '11px',
    color: '#586069',
    fontStyle: 'italic',
  },
};

// Register the extension with ArgoCD
export const extension = {
  component: GlueOpsExtension,
};

export default extension;

// Register the extension with ArgoCD's extension API
// This makes the extension appear in the application details page
if (window.extensionsAPI) {
  window.extensionsAPI.registerResourceExtension(
    GlueOpsExtension,
    '*',           // Group - all groups
    'Application', // Kind - Application resources
    'GlueOps',     // Tab name
    { icon: 'fa fa-puzzle-piece' } // Icon
  );
}
