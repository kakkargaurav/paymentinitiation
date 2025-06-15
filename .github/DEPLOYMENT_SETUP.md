# Deployment Setup Guide

This document explains how to configure the GitHub Actions workflow for building, publishing, and deploying the Australian Payment API.

## Required GitHub Secrets

To use this workflow, you need to configure the following secrets in your GitHub repository:

### Registry Secrets
- `REGISTRY_USERNAME`: Username for accessing the Docker registry (repo.gauravkakkar.au)
- `REGISTRY_PASSWORD`: Password or access token for the Docker registry

### Production Server Secrets (for SSH deployment)
- `PRODUCTION_HOST`: IP address or hostname of your production server
- `PRODUCTION_USER`: SSH username for the production server
- `PRODUCTION_SSH_KEY`: Private SSH key for accessing the production server
- `PRODUCTION_PORT`: SSH port (usually 22)

## How to Add Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the corresponding name and value

## Workflow Stages

### 1. Build Stage
- Builds Docker image with incremented version tag
- Current logic: 1.1 → 1.11 (as requested)
- Runs basic health checks on the built image
- Saves image as artifact for next stages

### 2. Publish Stage
- Only runs on pushes to main/master branch
- Logs into the Docker registry
- Pushes the tagged image and latest tag
- Automatically logs out from registry

### 3. Deploy Stage
- **Requires manual approval** (configured as production environment)
- Stops existing containers with the same name
- Pulls and runs the new image version
- Container name includes the tag for identification
- Runs on the same port (3232)
- Includes health check verification

## Environment Protection

The deployment stage uses GitHub's environment protection feature:
- Environment name: `production`
- Requires manual approval before deployment
- Can be configured with additional protection rules

## Setting Up Environment Protection

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name it `production`
4. Enable **Required reviewers**
5. Add team members who can approve deployments
6. Optionally set deployment branches to `main` only

## SSH Deployment Configuration

The workflow includes commented SSH deployment steps. To enable them:

1. Uncomment the SSH action step in the deploy job
2. Ensure all production server secrets are configured
3. Test SSH connectivity manually first

## Docker Registry Setup

Ensure your Docker registry (repo.gauravkakkar.au) is properly configured:
- Registry should be accessible from GitHub Actions runners
- Credentials should have push/pull permissions
- Registry should support the Docker Registry HTTP API V2

## Troubleshooting

### Build Failures
- Check Dockerfile syntax
- Verify all dependencies are available
- Review build logs for specific errors

### Registry Issues
- Verify registry credentials
- Check network connectivity
- Ensure registry supports your authentication method

### Deployment Issues
- Verify SSH connectivity
- Check Docker daemon on production server
- Ensure port 3232 is available
- Review server logs for container issues

## Version Tagging Logic

The current version increment logic:
- Reads version from package.json
- For version 1.1.x → creates tag 1.11
- For other versions → increments minor version by 1

You can modify the version generation logic in the build job if needed.