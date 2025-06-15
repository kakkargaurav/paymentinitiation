# Deployment Guide - Australian Payment API

This document provides comprehensive information about the CI/CD pipeline and deployment process for the Australian Payment API.

## Overview

The project uses GitHub Actions for automated building, testing, publishing, and deployment. The workflow follows a three-stage process with built-in security and approval mechanisms.

## Workflow Stages

### 🔨 Stage 1: Build
**Trigger**: Push to main/master branch or pull requests
**Duration**: ~3-5 minutes

- Builds Docker image using multi-stage Dockerfile
- Increments version tag automatically (current: 1.1 → next: 1.11)
- Runs health checks on the built image
- Stores image as artifact for subsequent stages

**Key Features**:
- Version auto-increment based on package.json
- Docker layer caching for faster builds
- Automated testing with health endpoints
- Artifact storage for downstream jobs

### 📦 Stage 2: Publish to Registry
**Trigger**: Successful build on main/master branch push
**Duration**: ~2-3 minutes

- Authenticates with Docker registry (`repo.gauravkakkar.au`)
- Pushes versioned image and `latest` tag
- Secure credential handling via GitHub secrets
- Automatic logout for security

**Security Features**:
- Encrypted credential storage
- Temporary authentication sessions
- Registry-specific access tokens

### 🚀 Stage 3: Deploy to Production
**Trigger**: Successful publish + manual approval
**Duration**: ~2-3 minutes + approval time

- **Requires manual approval** (Production environment protection)
- Stops existing containers gracefully
- Deploys new version with tag-based naming
- Runs on the same port (3232)
- Includes post-deployment health verification

**Production Safety**:
- Manual approval gate
- Graceful container replacement
- Health check verification
- Rollback capability

## Version Management

### Current Versioning Strategy
- **Current Tag**: `repo.gauravkakkar.au/australian-payment-api:1.1`
- **Next Tag**: `repo.gauravkakkar.au/australian-payment-api:1.11`
- **Pattern**: Increment minor version number by 1

### Version Generation Logic
```bash
# From package.json version 1.1.0 → Docker tag 1.11
# From package.json version 1.2.0 → Docker tag 1.21
# From package.json version 2.1.0 → Docker tag 2.11
```

## Container Management

### Container Naming Convention
- **Production Container**: `australian-payment-api-{version}`
- **Example**: `australian-payment-api-1.11`

### Port Configuration
- **Host Port**: 3232
- **Container Port**: 3232
- **Health Check**: `http://localhost:3232/health`

## Required GitHub Secrets

Set these in your repository settings (Settings → Secrets and variables → Actions):

```
REGISTRY_USERNAME=your-registry-username
REGISTRY_PASSWORD=your-registry-password
PRODUCTION_HOST=your-server-ip
PRODUCTION_USER=your-ssh-username
PRODUCTION_SSH_KEY=your-private-ssh-key
PRODUCTION_PORT=22
```

## Environment Protection Setup

1. **Navigate to Repository Settings**
   - Go to Settings → Environments
   - Create environment named `production`

2. **Configure Protection Rules**
   - Enable "Required reviewers"
   - Add team members as reviewers
   - Set deployment branches to `main` only

3. **Approval Process**
   - Designated reviewers receive notifications
   - Manual approval required before deployment
   - Deployment logs are auditable

## Local Testing

### Using npm scripts:
```bash
# For Unix/Linux/macOS
npm run docker:build-ci

# For Windows
npm run docker:build-ci-win
```

### Manual Docker commands:
```bash
# Build with version tag
docker build -t repo.gauravkakkar.au/australian-payment-api:1.11 .

# Test locally
docker run -d --name test-api -p 3233:3232 repo.gauravkakkar.au/australian-payment-api:1.11

# Health check
curl http://localhost:3233/health

# Cleanup
docker stop test-api && docker rm test-api
```

## Monitoring and Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Verify Dockerfile syntax
3. Ensure all dependencies are available
4. Review test failures

### Registry Issues
1. Verify registry credentials in secrets
2. Check registry connectivity
3. Ensure proper permissions
4. Review registry logs

### Deployment Issues
1. Check SSH connectivity to production server
2. Verify Docker daemon is running
3. Ensure port 3232 is available
4. Review container logs

### Health Check Failures
1. Verify application starts correctly
2. Check if health endpoint exists
3. Review application logs
4. Ensure proper environment variables

## Rollback Procedure

### Quick Rollback
```bash
# Stop current container
docker stop australian-payment-api-1.11

# Start previous version
docker start australian-payment-api-1.1

# Or pull and run previous version
docker run -d --name australian-payment-api-1.1 \
  -p 3232:3232 \
  repo.gauravkakkar.au/australian-payment-api:1.1
```

### Through GitHub Actions
1. Navigate to previous successful deployment
2. Click "Re-run jobs"
3. Approve deployment when prompted

## Security Considerations

### Secrets Management
- All sensitive data stored as GitHub secrets
- Automatic logout from registries
- Encrypted communication channels

### Access Control
- Manual approval for production deployments
- Audit trail for all deployments
- Role-based access to environments

### Container Security
- Non-root user in containers
- Security scanning during build
- Regular base image updates

## Performance Optimizations

### Build Optimization
- Multi-stage Docker builds
- Layer caching
- Parallel job execution
- Artifact reuse

### Deployment Optimization
- Rolling updates
- Health check verification
- Graceful shutdowns
- Resource cleanup

## Maintenance

### Regular Tasks
1. Update base images monthly
2. Review and rotate secrets quarterly
3. Monitor build performance
4. Update GitHub Actions versions

### Monitoring
- Set up alerts for build failures
- Monitor deployment success rates
- Track container resource usage
- Review security scan results

## Support

For issues with the deployment pipeline:
1. Check GitHub Actions logs
2. Review this documentation
3. Contact the DevOps team
4. Create an issue in the repository

---

**Last Updated**: June 2025
**Version**: 1.0
**Maintained by**: Development Team