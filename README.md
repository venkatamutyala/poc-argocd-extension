# ArgoCD GlueOps Extension

An ArgoCD UI extension that displays GlueOps platform integration links (Metrics, Logs, Traces, Secrets, and IaaC) directly in the Application details page.

## Features

- 📊 **Metrics** - Link to Grafana dashboards
- 📝 **Logs** - Link to log aggregation system
- 🔍 **Traces** - Link to distributed tracing
- 🔐 **Secrets** - Link to secrets management (Vault)
- 🏗️ **IaaC** - Link to infrastructure as code repository
- ⏱️ **Last Updated** - Timestamp showing when metadata was last refreshed
- 🔄 **Server-side API calls** - Uses ArgoCD's proxy extension to make secure backend calls

## Installation

### Prerequisites

- ArgoCD 2.6+ (with UI extensions support)
- Kubernetes cluster with ArgoCD installed

### Deploy the Extension

#### Option 1: Using Init Container (Recommended)

Add the extension configuration to your ArgoCD server deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
spec:
  template:
    spec:
      initContainers:
        - name: glueops-extension
          image: ghcr.io/appropriate/curl:latest
          command:
            - sh
            - -c
            - |
              # Download the extension
              curl -L https://github.com/development-captains/nonprod.jupiter.onglueops.rocks/releases/latest/download/extension.tar.gz -o /tmp/extension.tar.gz
              # Extract to the extensions directory
              mkdir -p /tmp/extensions/glueops
              tar -xzf /tmp/extension.tar.gz -C /tmp/extensions/glueops
          volumeMounts:
            - name: extensions
              mountPath: /tmp/extensions
      containers:
        - name: argocd-server
          volumeMounts:
            - name: extensions
              mountPath: /tmp/extensions
      volumes:
        - name: extensions
          emptyDir: {}
```

#### Option 2: Using ConfigMap

1. Build the extension:
```bash
cd poc-argocd-extension
npm install
npm run build
```

2. Create a ConfigMap with the extension files:
```bash
kubectl create configmap argocd-extension-glueops \
  --from-file=extension.js=dist/extension.js \
  --from-file=server.js=backend/server.js \
  -n argocd
```

3. Mount the ConfigMap in the ArgoCD server:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          volumeMounts:
            - name: glueops-extension
              mountPath: /tmp/extensions/glueops
      volumes:
        - name: glueops-extension
          configMap:
            name: argocd-extension-glueops
```

### Configure ArgoCD to Load the Extension

Add the extension configuration to your `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable server-side extensions
  extension.config: |
    extensions:
      - name: glueops
        backend:
          services:
            - url: http://localhost:8080
              cluster:
                server: https://kubernetes.default.svc
        ui:
          location: application.details.summary
          sources:
            - resource: /tmp/extensions/glueops/dist/extension.js
```

Alternatively, you can set it via the ArgoCD server args:

```yaml
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          command:
            - argocd-server
          args:
            - --extension-config
            - |
              extensions:
                - name: glueops
                  backend:
                    services:
                      - url: http://localhost:8080
                  ui:
                    location: application.details.summary
                    sources:
                      - resource: /tmp/extensions/glueops/dist/extension.js
```

### Register the Backend Proxy

Create the extension configuration file for the backend:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-extension-config
  namespace: argocd
data:
  glueops.yaml: |
    name: glueops
    backend:
      services:
        - url: /extensions/glueops
          handler:
            module: /tmp/extensions/glueops/backend/server.js
            function: handleRequest
```

## Development

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/development-captains/nonprod.jupiter.onglueops.rocks.git
cd nonprod.jupiter.onglueops.rocks/poc-argocd-extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Watch for changes during development:
```bash
npm run watch
```

### Project Structure

```
poc-argocd-extension/
├── backend/
│   └── server.js          # Server-side proxy handler
├── ui/
│   └── extension.js       # React UI component
├── dist/                  # Built files (generated)
├── .github/
│   └── workflows/
│       └── build.yml      # CI/CD pipeline
├── package.json           # Dependencies and scripts
├── webpack.config.js      # Webpack build configuration
└── README.md             # This file
```

### Building for Production

To create a production build and package:

```bash
npm run package
```

This will:
1. Clean the dist directory
2. Build the extension in production mode
3. Create `extension.tar.gz` with both UI and backend files

## How It Works

### Architecture

This extension uses ArgoCD's **proxy extension** capability, which allows:

1. **UI Component**: A React component that renders in the Application details page
2. **Backend Proxy**: A server-side handler that makes API calls on behalf of the UI
3. **Secure Communication**: The UI calls the backend via ArgoCD's extension proxy, keeping API keys and credentials secure

### Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Browser   │────────▶│   ArgoCD     │────────▶│   Extension     │────────▶│   External   │
│   (UI)      │         │   Server     │         │   Backend       │         │   API        │
│             │◀────────│   (Proxy)    │◀────────│   (server.js)   │◀────────│ (postman-    │
│             │         │              │         │                 │         │  echo)       │
└─────────────┘         └──────────────┘         └─────────────────┘         └──────────────┘
```

1. UI component loads in the ArgoCD Application page
2. UI makes a fetch request to `/extensions/glueops/api/glueops-metadata`
3. ArgoCD server proxies the request to the backend handler
4. Backend makes a server-side call to the external API (postman-echo in this demo)
5. Backend transforms and returns the data
6. UI displays the links and metadata

## Customization

### Connecting to Your Real API

Edit `backend/server.js` and replace the postman-echo call with your actual API:

```javascript
// Replace this line:
const response = await fetch('https://postman-echo.com/get?source=glueops-argocd-extension');

// With your API:
const response = await fetch('https://your-api.example.com/metadata', {
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`
  }
});
```

### Styling

The UI component uses inline styles for simplicity. You can modify the `styles` object in `ui/extension.js` to customize the appearance.

### Adding More Links

Edit the `ui/extension.js` file and add more `LinkItem` components:

```javascript
<LinkItem 
  label="Custom Link" 
  url="https://custom.example.com" 
  icon="🔗"
/>
```

## Troubleshooting

### Extension Not Loading

1. Check ArgoCD server logs:
```bash
kubectl logs -n argocd deployment/argocd-server
```

2. Verify the extension files are mounted:
```bash
kubectl exec -n argocd deployment/argocd-server -- ls -la /tmp/extensions/glueops/
```

3. Check the extension configuration:
```bash
kubectl get cm argocd-cmd-params-cm -n argocd -o yaml
```

### API Calls Failing

1. Check the backend logs in ArgoCD server
2. Verify network connectivity from the ArgoCD server pod
3. Check if the API endpoint is accessible:
```bash
kubectl exec -n argocd deployment/argocd-server -- curl https://postman-echo.com/get
```

## References

- [ArgoCD UI Extensions Documentation](https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/)
- [ArgoCD Extension Metrics Example](https://github.com/argoproj-labs/argocd-extension-metrics)
- [ArgoCD Extensions Proposal](https://github.com/argoproj/argo-cd/blob/master/docs/proposals/ui-extensions.md)

## License

MIT
