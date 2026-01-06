# Vercel Deployment & MCP Server Guide

## 1. Vercel MCP Server Configuration

Vercel's official MCP server is a **remote HTTP-based MCP** available at `https://mcp.vercel.com`. It uses OAuth for authentication and supports managing projects, deployments, and searching documentation.

### VS Code (Copilot) Setup

Add to your existing MCP configuration at:
`~/Library/Application Support/Code/User/mcp.json`

```json
{
  "servers": {
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    }
  }
}
```

**For project-specific access** (auto-context for team/project):

```json
{
  "servers": {
    "vercel-baseline": {
      "type": "http",
      "url": "https://mcp.vercel.com/<team-slug>/baseline"
    }
  }
}
```

### Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.vercel.com"]
    }
  }
}
```

### Cursor Setup

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com"
    }
  }
}
```

### Windsurf Setup

Add to `mcp_config.json`:

```json
{
  "mcpServers": {
    "vercel": {
      "serverUrl": "https://mcp.vercel.com"
    }
  }
}
```

### Authentication

After adding the server:

1. Start the MCP server in your client
2. A login prompt will appear (or "Needs login" in Cursor)
3. Click to authorize with your Vercel account via OAuth
4. No API tokens or environment variables needed - it uses browser-based OAuth

### Available Tools

**Public (no auth required):**

- Search Vercel documentation

**Authenticated:**

- Manage projects and deployments
- Analyze deployment logs
- View build logs and errors

---

## 2. Deploying Vite/React to Vercel

### Connecting GitHub Repository

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Vercel will **auto-detect Vite** and configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (or your script)
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

### vercel.json Configuration (Required for SPA)

Since this is a React SPA with client-side routing, create `vercel.json` at the project root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures deep links work correctly (e.g., `/diagnostics` won't 404).

---

## 3. Environment Variables for Vercel

Based on the project's Supabase integration, configure these in Vercel:

| Variable                 | Environment         | Description               |
| ------------------------ | ------------------- | ------------------------- |
| `VITE_SUPABASE_URL`      | Production, Preview | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview | Supabase anon/public key  |

### Setting Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - Select environments (Production, Preview, Development)
   - Enter variable name and value
4. Redeploy for changes to take effect

### For Local Development

Use `vercel env pull` to download environment variables:

```bash
vercel env pull
# Creates .env file with development variables
```

Or continue using your existing `.env.local` file.

---

## 4. Current Project Setup

### Build Configuration (from package.json)

```json
{
  "scripts": {
    "dev": "vite --port 5173",
    "build": "tsc -b --noCheck && vite build",
    "preview": "vite preview"
  }
}
```

Vercel will automatically use `npm run build` for production builds.

### Vite Configuration

Current `vite.config.ts` is minimal and Vercel-compatible:

- Uses `@vitejs/plugin-react-swc`
- Uses Tailwind CSS v4 plugin
- Path alias `@` → `src`

No additional configuration needed for Vercel.

### No Existing Deployment Config

- No `vercel.json` exists (needs to be created for SPA routing)
- No `netlify.toml` exists
- No `.env.example` file (consider creating one)

---

## 5. Your Existing MCP Configuration

**Location:** `~/Library/Application Support/Code/User/mcp.json`

**Current servers:**

- `io.github.github/github-mcp-server` - GitHub integration
- `microsoft/playwright-mcp` - Browser automation
- `com.stripe/mcp` - Stripe integration
- `com.supabase/mcp` - Supabase database management
- `io.github.ChromeDevTools/chrome-devtools-mcp` - DevTools
- `shadcn` - Component library

### Adding Vercel MCP

Add this to the `servers` object in your existing config:

```json
"vercel": {
  "type": "http",
  "url": "https://mcp.vercel.com"
}
```

**Complete updated mcp.json:**

```json
{
  "inputs": [
    {
      "id": "Authorization",
      "type": "promptString",
      "description": "Authentication token (PAT or App token)",
      "password": true
    },
    {
      "id": "SUPABASE_ACCESS_TOKEN",
      "type": "promptString",
      "description": "Supabase Personal Access Token (starts with sbp_)",
      "password": true
    }
  ],
  "servers": {
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    },
    "io.github.github/github-mcp-server": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": {
        "Authorization": "${input:Authorization}"
      },
      "gallery": "https://api.mcp.github.com",
      "version": "0.23.0"
    },
    "microsoft/playwright-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "gallery": "https://api.mcp.github.com",
      "version": "0.0.1-seed"
    },
    "com.stripe/mcp": {
      "type": "http",
      "url": "https://mcp.stripe.com",
      "gallery": "https://api.mcp.github.com",
      "version": "0.2.4"
    },
    "com.supabase/mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${input:SUPABASE_ACCESS_TOKEN}"
      },
      "gallery": "https://api.mcp.github.com",
      "version": "0.5.9"
    },
    "io.github.ChromeDevTools/chrome-devtools-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["chrome-devtools-mcp@0.12.1"],
      "gallery": "https://api.mcp.github.com",
      "version": "0.12.1"
    },
    "shadcn": {
      "type": "stdio",
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

---

## 6. Quick Start Checklist

### Vercel Deployment

- [ ] Create `vercel.json` with SPA rewrites (see above)
- [ ] Push to GitHub
- [ ] Connect repository on vercel.com
- [ ] Add environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- [ ] Deploy!

### MCP Server Setup

- [ ] Add Vercel server to `~/Library/Application Support/Code/User/mcp.json`
- [ ] Restart VS Code
- [ ] Start MCP server via Command Palette: `MCP: List Servers` → `Vercel` → `Start`
- [ ] Complete OAuth authentication when prompted

---

## 7. Considerations & Notes

### Environment Variable Security

- Never commit `.env` files with real values
- The `VITE_SUPABASE_ANON_KEY` is safe to expose (it's a public key)
- Row Level Security (RLS) protects your data server-side

### Supabase Edge Functions

- If using Supabase Edge Functions, they're deployed separately via `supabase functions deploy`
- Vercel deployment only handles the frontend

### Preview Deployments

- Each PR gets a unique preview URL
- Preview deployments use Preview environment variables
- Good for testing before merging to main

### Build Performance

- Vercel caches `node_modules` between builds
- First build may take longer; subsequent builds are faster

### Domain Configuration

- Add custom domain in Vercel dashboard → Settings → Domains
- Update Supabase Auth redirect URLs to include your production domain
