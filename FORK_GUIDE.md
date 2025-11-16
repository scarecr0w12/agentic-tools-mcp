# Fork Guide: Creating Agentic Tools Cloud

This guide explains how to properly fork this repository to create the new `agentic-tools-cloud` SaaS platform.

## Step 1: Fork on GitHub

### Option A: GitHub Web Interface (Recommended)

1. **Go to the original repository**: https://github.com/scarecr0w12/agentic-tools-mcp
2. **Click "Fork"** button in the top-right corner
3. **Configure the fork**:
   - **Repository name**: `agentic-tools-cloud`
   - **Description**: "Multi-tenant SaaS platform for AI-powered task and memory management with team collaboration"
   - **Uncheck** "Copy the main branch only" (to preserve history)
4. **Click "Create fork"**

### Option B: GitHub CLI

```bash
# Install GitHub CLI if needed: https://cli.github.com/

# Fork the repository
gh repo fork scarecr0w12/agentic-tools-mcp \
  --clone=false \
  --fork-name agentic-tools-cloud

# Clone your fork
gh repo clone scarecr0w12/agentic-tools-cloud
cd agentic-tools-cloud
```

### Option C: Manual Git Fork

```bash
# Clone the original repository (bare clone)
git clone --bare https://github.com/scarecr0w12/agentic-tools-mcp.git
cd agentic-tools-mcp.git

# Create new repository on GitHub first, then push
git push --mirror https://github.com/scarecr0w12/agentic-tools-cloud.git

# Clean up
cd ..
rm -rf agentic-tools-mcp.git

# Clone your new repository
git clone https://github.com/scarecr0w12/agentic-tools-cloud.git
cd agentic-tools-cloud
```

## Step 2: Update Repository After Fork

Once you have the forked repository, apply the changes we've already prepared:

```bash
cd agentic-tools-cloud

# The following files have already been updated/created:
# - package.json (name, version, license, dependencies)
# - README.cloud.md (SaaS documentation)
# - ARCHITECTURE.md (technical documentation)
# - .env.example (configuration template)
# - .gitignore (updated for SaaS)
# - src/db/ (complete database infrastructure)

# Rename README
mv README.md README.original.md
mv README.cloud.md README.md

# Install dependencies
npm install

# Build the project
npm run build

# Run initial migration
npm run db:migrate

# Commit the changes
git add .
git commit -m "feat: Initialize Agentic Tools Cloud (SaaS fork)

- Rename project to agentic-tools-cloud v0.1.0
- Change license to AGPL-3.0
- Add SaaS dependencies (Fastify, SQLite, Redis, Stripe, etc.)
- Implement multi-tenant database schema
- Add comprehensive documentation (README, ARCHITECTURE)
- Set up database migrations infrastructure

This is a fork of agentic-tools-mcp focused on multi-tenant SaaS deployment."

# Push to your fork
git push origin main
```

## Step 3: Configure Repository Settings

On GitHub, update your fork's settings:

1. **About** (right sidebar):
   - Description: "Multi-tenant SaaS platform for AI-powered task and memory management"
   - Website: https://agentic-tools.cloud (when ready)
   - Topics: `saas`, `multi-tenant`, `task-management`, `fastify`, `sqlite`, `websocket`, `real-time`, `mcp`

2. **General Settings**:
   - Default branch: `main`
   - Enable issues
   - Enable discussions (optional)
   - Enable wiki (optional)

3. **Branches**:
   - Protect `main` branch:
     - Require pull request reviews
     - Require status checks to pass
     - Require branches to be up to date

4. **Secrets** (for CI/CD):
   ```
   DATABASE_URL
   JWT_SECRET
   STRIPE_SECRET_KEY
   REDIS_URL
   ```

## Step 4: Set Up CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build
      run: npm run build
    
    - name: Run tests
      run: npm test
    
    - name: Run migrations (test)
      run: npm run db:migrate
      env:
        DATABASE_URL: sqlite:///tmp/test.db
```

## Step 5: Update Links and References

Update any remaining references to the original repository:

```bash
# Search for old repository references
grep -r "agentic-tools-mcp" . --exclude-dir=node_modules --exclude-dir=.git

# Update as needed:
# - CONTRIBUTING.md (if exists)
# - Issue templates
# - Documentation links
# - Package.json homepage/bugs URLs
```

## Step 6: Add Link to Original

In your new README.md, add a section acknowledging the original:

```markdown
## 🔗 Related Projects

This project is a fork of [agentic-tools-mcp](https://github.com/scarecr0w12/agentic-tools-mcp), 
focused on multi-tenant SaaS deployment. For local, single-user MCP tools, see the original project.

- **Original Project**: Local STDIO-based MCP tools
- **This Fork**: Multi-tenant SaaS platform with HTTP APIs
```

## Step 7: Optional - Update Original README

In the **original** repository (`agentic-tools-mcp`), add a note about the SaaS version:

```markdown
## 🌐 Looking for a Hosted Solution?

Check out [Agentic Tools Cloud](https://github.com/scarecr0w12/agentic-tools-cloud) - 
a multi-tenant SaaS platform based on this project, with team collaboration, 
real-time updates, and managed hosting.
```

## Verification Checklist

After forking, verify:

- ✅ New repository name is `agentic-tools-cloud`
- ✅ Fork relationship is visible on GitHub
- ✅ All commits and history are preserved
- ✅ `package.json` name is `@scarecr0w12/agentic-tools-cloud`
- ✅ License is AGPL-3.0
- ✅ Dependencies installed successfully
- ✅ Build completes without errors
- ✅ Database migration runs successfully
- ✅ README clearly explains SaaS nature
- ✅ ARCHITECTURE.md exists and is comprehensive
- ✅ `.env.example` has all SaaS configuration

## Next Steps After Fork

Once the fork is complete and verified:

1. **Phase 1**: Add integration tests and refactor tools
2. **Phase 2**: Implement HTTP transport layer
3. **Phase 3**: Build authentication and user management
4. **Phase 4**: Migrate dashboard to HTTP client
5. **Phase 5**: Optimize for multi-tenant performance
6. **Phase 6**: Production hardening
7. **Phase 7**: Add SaaS features (billing, collaboration)

## Maintaining Fork Relationship

To pull improvements from the original project:

```bash
# Add original as upstream remote
git remote add upstream https://github.com/scarecr0w12/agentic-tools-mcp.git

# Fetch upstream changes
git fetch upstream

# Cherry-pick specific tool improvements
git cherry-pick <commit-hash>

# Or merge specific changes
git merge upstream/main --no-commit
# Review and commit only desired changes
```

## Questions?

If you encounter issues during the fork process:
1. Check GitHub's [fork documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks)
2. Verify all dependencies are compatible
3. Ensure Node.js version >= 18.0.0
4. Review build errors carefully

---

**Ready to fork?** Follow Step 1 above to create your `agentic-tools-cloud` repository!
