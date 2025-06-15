#!/bin/bash

# Local build script for testing the Docker workflow
# This script mimics the GitHub Actions build process

set -e

# Configuration
REGISTRY="repo.gauravkakkar.au"
IMAGE_NAME="australian-payment-api"
CURRENT_VERSION=$(grep '"version"' package.json | cut -d'"' -f4)

echo "=== Australian Payment API Local Build ==="
echo "Current version: $CURRENT_VERSION"

# Generate new tag (same logic as GitHub Actions)
MAJOR=$(echo $CURRENT_VERSION | cut -d'.' -f1)
MINOR=$(echo $CURRENT_VERSION | cut -d'.' -f2)

if [ "$CURRENT_VERSION" = "1.1.0" ] || [ "$CURRENT_VERSION" = "1.1" ]; then
  NEW_TAG="1.11"
else
  NEW_MINOR=$((MINOR + 1))
  NEW_TAG="${MAJOR}.${MINOR}${NEW_MINOR}"
fi

FULL_IMAGE="${REGISTRY}/${IMAGE_NAME}:${NEW_TAG}"

echo "New tag: $NEW_TAG"
echo "Full image: $FULL_IMAGE"

# Build Docker image
echo ""
echo "=== Building Docker Image ==="
docker build -t $FULL_IMAGE .
docker tag $FULL_IMAGE ${REGISTRY}/${IMAGE_NAME}:latest

echo ""
echo "=== Testing Docker Image ==="
# Start container in background for testing
docker run -d --name test-api -p 3233:3232 $FULL_IMAGE

# Wait for container to start
echo "Waiting for container to start..."
sleep 10

# Basic health check
echo "Running health check..."
if curl -f http://localhost:3233/health; then
  echo "✅ Health check passed"
else
  echo "❌ Health check failed"
  docker logs test-api
  docker stop test-api
  docker rm test-api
  exit 1
fi

# Clean up test container
docker stop test-api
docker rm test-api

echo ""
echo "=== Build Summary ==="
echo "✅ Image built successfully: $FULL_IMAGE"
echo "✅ Health check passed"
echo ""
echo "To push to registry manually:"
echo "  docker login $REGISTRY"
echo "  docker push $FULL_IMAGE"
echo "  docker push ${REGISTRY}/${IMAGE_NAME}:latest"
echo ""
echo "To run locally:"
echo "  docker run -d --name ${IMAGE_NAME}-${NEW_TAG} -p 3232:3232 $FULL_IMAGE"