// GlueOps ArgoCD Extension - Unified File
// This file contains both UI component and backend service handler

// ============================================================================
// BACKEND SERVICE HANDLER (for server-side API calls)
// ============================================================================

// Backend handler that ArgoCD server will call
if (typeof exports !== 'undefined') {
  // This runs in Node.js context within ArgoCD server
  exports.init = async function(app) {
    console.log('GlueOps Extension Backend: Initialized for', app?.metadata?.name);
  };

  exports.handler = async function(req, res) {
    try {
      console.log('GlueOps Extension: Fetching metadata from postman-echo...');
      
      const appName = req.query?.appName || req.params?.appName || 'unknown';
      const response = await fetch(`https://postman-echo.com/get?source=glueops-argocd-extension&app=${appName}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const echoData = await response.json();
      
      const metadata = {
        metrics: { url: `https://grafana.example.com/d/app/${appName}`, label: 'Metrics' },
        logs: { url: `https://logs.example.com/app/${appName}`, label: 'Logs' },
        traces: { url: `https://traces.example.com/app/${appName}`, label: 'Traces' },
        secrets: { url: `https://vault.example.com/ui/vault/secrets/${appName}`, label: 'Secrets' },
        infrastructure: { url: `https://github.com/example/configs/tree/main/${appName}`, label: 'IaaC' },
        lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString()
      };

      res.json({
        success: true,
        data: metadata,
        timestamp: new Date().toISOString(),
        debug: { postmanEcho: echoData }
      });
    } catch (error) {
      console.error('GlueOps Extension Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}

// ============================================================================
// UI COMPONENT (runs in browser)
// ============================================================================

(function() {
  // Only run UI code in browser context
  if (typeof window === 'undefined') return;

  const React = window.React;

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

  function GlueOpsPanel({ application }) {
    const [metadata, setMetadata] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [isExpanded, setIsExpanded] = React.useState(false);

    React.useEffect(() => {
      fetchMetadata();
    }, [application]);

    async function fetchMetadata() {
      try {
        setLoading(true);
        setError(null);

        const appName = application?.metadata?.name || 'unknown';
        
        // Try backend proxy first, fallback to direct call
        let response;
        try {
          response = await fetch(`/extensions/glueops/api/metadata?appName=${appName}`);
        } catch (e) {
          // Fallback to direct call
          response = await fetch(`https://postman-echo.com/get?source=glueops-argocd&app=${appName}`);
        }
        
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const result = await response.json();
          
          // Handle backend proxy response format
          if (result.success && result.data) {
            data = result.data;
          } else {
            // Transform postman-echo response
            data = {
              metrics: { url: `https://grafana.example.com/d/app/${appName}`, label: 'Metrics' },
              logs: { url: `https://logs.example.com/app/${appName}`, label: 'Logs' },
              traces: { url: `https://traces.example.com/app/${appName}`, label: 'Traces' },
              secrets: { url: `https://vault.example.com/ui/vault/secrets/${appName}`, label: 'Secrets' },
              infrastructure: { url: `https://github.com/example/configs/${appName}`, label: 'IaaC' },
              lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString()
            };
          }
        }
        
        setMetadata(data);
      } catch (err) {
        console.error('GlueOps Extension Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (loading) {
      return React.createElement('div', { style: styles.container },
        React.createElement('div', { style: styles.header },
          React.createElement('span', { style: styles.title }, 'GlueOps'),
          React.createElement('span', { style: styles.loading }, 'Loading...')
        )
      );
    }

    if (error) {
      return React.createElement('div', { style: styles.container },
        React.createElement('div', { style: styles.header },
          React.createElement('span', { style: styles.title }, 'GlueOps'),
          React.createElement('button', { 
            onClick: fetchMetadata, 
            style: styles.refreshButton 
          }, 'Retry')
        ),
        React.createElement('div', { style: styles.error }, `Error: ${error}`)
      );
    }

    if (!metadata) return null;

    const timeAgo = getTimeAgo(metadata.lastUpdated);

    return React.createElement('div', { style: styles.container },
      React.createElement('div', { 
        style: styles.header, 
        onClick: () => setIsExpanded(!isExpanded) 
      },
        React.createElement('div', { style: styles.headerLeft },
          React.createElement('span', { style: styles.title }, 'GlueOps'),
          React.createElement('span', { style: styles.expandIcon }, isExpanded ? '▼' : '▶')
        ),
        React.createElement('div', { style: styles.headerRight },
          React.createElement('button', {
            onClick: (e) => { e.stopPropagation(); fetchMetadata(); },
            style: styles.refreshButton
          }, '↻ Refresh')
        )
      ),
      isExpanded && React.createElement('div', { style: styles.content },
        React.createElement('div', { style: styles.linksContainer },
          Object.entries(metadata).filter(([key]) => key !== 'lastUpdated').map(([key, item]) => {
            const icons = {
              metrics: '📊',
              logs: '📝',
              traces: '🔍',
              secrets: '🔐',
              infrastructure: '🏗️'
            };
            return React.createElement('div', { key, style: styles.linkItem },
              React.createElement('span', { style: styles.linkIcon }, icons[key] || '🔗'),
              React.createElement('span', { style: styles.linkLabel }, `${item.label}:`),
              React.createElement('a', {
                href: item.url,
                target: '_blank',
                rel: 'noopener noreferrer',
                style: styles.link
              }, item.url)
            );
          })
        ),
        React.createElement('div', { style: styles.footer },
          React.createElement('span', { style: styles.timestamp }, `Last Updated: ${timeAgo}`)
        )
      )
    );
  }

  const styles = {
    container: {
      backgroundColor: '#ffffff',
      border: '1px solid #e1e4e8',
      borderRadius: '6px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 16px',
      backgroundColor: '#f6f8fa',
      borderBottom: '1px solid #e1e4e8',
      cursor: 'pointer',
      userSelect: 'none'
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
    headerRight: { display: 'flex', alignItems: 'center' },
    title: { fontWeight: 'bold', fontSize: '14px', color: '#24292e' },
    expandIcon: { fontSize: '10px', color: '#586069' },
    loading: { fontSize: '12px', color: '#586069', fontStyle: 'italic' },
    refreshButton: {
      backgroundColor: '#0366d6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '4px',
      padding: '4px 12px',
      fontSize: '12px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    error: { padding: '12px 16px', color: '#d73a49', fontSize: '12px', backgroundColor: '#ffeef0' },
    content: { padding: '16px' },
    linksContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
    linkItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      backgroundColor: '#f6f8fa',
      borderRadius: '4px',
      fontSize: '13px'
    },
    linkIcon: { fontSize: '16px' },
    linkLabel: { fontWeight: '600', color: '#24292e', minWidth: '80px' },
    link: { color: '#0366d6', textDecoration: 'none', wordBreak: 'break-all' },
    footer: {
      marginTop: '16px',
      paddingTop: '12px',
      borderTop: '1px solid #e1e4e8',
      display: 'flex',
      justifyContent: 'flex-end'
    },
    timestamp: { fontSize: '11px', color: '#586069', fontStyle: 'italic' }
  };

  // Register the extension with ArgoCD
  if (window.extensionsAPI && window.extensionsAPI.registerResourceExtension) {
    window.extensionsAPI.registerResourceExtension(
      GlueOpsPanel,
      '*',
      'Application',
      'GlueOps',
      { icon: 'fa fa-link' }
    );
  }

  // Also export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { component: GlueOpsPanel };
  }
})();
