// ArgoCD Server-Side Extension Backend
// This file handles the server-side API proxy calls within the ArgoCD server

// This function will be called by ArgoCD's extension backend framework
async function handleRequest(req, res) {
  try {
    console.log('GlueOps Extension: Fetching metadata from postman-echo...');
    
    // Make a server-side call to postman-echo (simulating your real API)
    // This demonstrates that the call is happening server-side in the ArgoCD pod
    const response = await fetch('https://postman-echo.com/get?source=glueops-argocd-extension&app=' + (req.query?.appName || 'unknown'));
    
    if (!response.ok) {
      throw new Error(`Postman Echo API returned ${response.status}`);
    }
    
    const echoData = await response.json();
    console.log('GlueOps Extension: Successfully fetched data from postman-echo');
    
    // Transform the response into the expected format
    // In production, your real API would return this structure directly
    const metadata = {
      metrics: {
        url: 'https://grafana.example.com',
        label: 'Metrics'
      },
      logs: {
        url: 'https://logs.example.com',
        label: 'Logs'
      },
      traces: {
        url: 'https://traces.example.com',
        label: 'Traces'
      },
      secrets: {
        url: 'https://vault.example.com',
        label: 'Secrets'
      },
      infrastructure: {
        url: 'https://github.com/example/deployment-configurations',
        label: 'IaaC'
      },
      lastUpdated: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
    };

    res.json({
      success: true,
      data: metadata,
      timestamp: new Date().toISOString(),
      // Include proof of server-side call
      debug: {
        postmanEcho: echoData
      }
    });
  } catch (error) {
    console.error('GlueOps Extension Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch GlueOps metadata',
      message: error.message
    });
  }
}

module.exports = { handleRequest };
