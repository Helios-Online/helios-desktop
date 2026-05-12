## Why

Currently, deploying the Hermes agent to a local environment requires manual steps: downloading the agent, configuring permissions, and running installation commands. Users need a streamlined, one-click experience to get the Hermes agent up and running on their local machine without dealing with complex setup procedures.

## What Changes

- Create a Helios Desktop application with a user-friendly UI
- Add an "Install Hermes Agent" button that triggers automatic download
- Implement background installation process with progress feedback
- Add local deployment functionality through the desktop UI
- Display agent status (installed, running, stopped) in the interface

## Capabilities

### New Capabilities

- `desktop-app`: Core Helios desktop application shell with window management, navigation, and system integration
- `agent-downloader`: Automatic download module that fetches the Hermes agent binary from release sources with integrity verification
- `agent-installer`: Installation engine that extracts, configures, and registers the Hermes agent as a system service
- `agent-deployer`: Local deployment manager that starts/stops the agent and monitors its health status

### Modified Capabilities

<!-- No existing capabilities are being modified -->

## Impact

- New desktop application target for Helios
- Integration with Hermes agent release distribution
- May require platform-specific installers (Windows MSI, macOS DMG, Linux AppImage/deb)
- Affects user onboarding and local development experience
