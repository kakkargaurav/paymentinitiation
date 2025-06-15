@echo off
setlocal enabledelayedexpansion

REM Local build script for testing the Docker workflow
REM This script mimics the GitHub Actions build process

echo === Australian Payment API Local Build ===

REM Configuration
set REGISTRY=repo.gauravkakkar.au
set IMAGE_NAME=australian-payment-api

REM Extract current version from package.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" package.json') do (
    set VERSION_LINE=%%a
)
for /f "tokens=1 delims=," %%a in ("!VERSION_LINE!") do (
    set CURRENT_VERSION=%%a
)
set CURRENT_VERSION=!CURRENT_VERSION:"=!
set CURRENT_VERSION=!CURRENT_VERSION: =!

echo Current version: !CURRENT_VERSION!

REM Generate new tag (simplified for batch)
if "!CURRENT_VERSION!"=="1.1.0" (
    set NEW_TAG=1.11
) else if "!CURRENT_VERSION!"=="1.1" (
    set NEW_TAG=1.11
) else (
    set NEW_TAG=1.11
)

set FULL_IMAGE=!REGISTRY!/!IMAGE_NAME!:!NEW_TAG!

echo New tag: !NEW_TAG!
echo Full image: !FULL_IMAGE!

echo.
echo === Building Docker Image ===
docker build -t !FULL_IMAGE! .
if errorlevel 1 (
    echo ❌ Docker build failed
    exit /b 1
)

docker tag !FULL_IMAGE! !REGISTRY!/!IMAGE_NAME!:latest

echo.
echo === Testing Docker Image ===
REM Start container in background for testing
docker run -d --name test-api -p 3233:3232 !FULL_IMAGE!
if errorlevel 1 (
    echo ❌ Failed to start test container
    exit /b 1
)

REM Wait for container to start
echo Waiting for container to start...
timeout /t 10 /nobreak >nul

REM Basic health check
echo Running health check...
curl -f http://localhost:3233/health
if errorlevel 1 (
    echo ❌ Health check failed
    docker logs test-api
    docker stop test-api
    docker rm test-api
    exit /b 1
)

echo ✅ Health check passed

REM Clean up test container
docker stop test-api
docker rm test-api

echo.
echo === Build Summary ===
echo ✅ Image built successfully: !FULL_IMAGE!
echo ✅ Health check passed
echo.
echo To push to registry manually:
echo   docker login !REGISTRY!
echo   docker push !FULL_IMAGE!
echo   docker push !REGISTRY!/!IMAGE_NAME!:latest
echo.
echo To run locally:
echo   docker run -d --name !IMAGE_NAME!-!NEW_TAG! -p 3232:3232 !FULL_IMAGE!

endlocal