## Context

Helios currently provides a CLI and web interface for managing the Hermes agent, but users who want to run the agent locally must manually download, configure, and run the agent through command-line operations. This creates friction for less technical users and slows down local development velocity.

The Helios Desktop application provides a native UI that simplifies the agent lifecycle management: download, install, deploy, and monitor—all through a single interface.

## Goals / Non-Goals

**Goals:**
- Provide a one-click installation experience for the Hermes agent
- Automate the download of hermes agent binaries from release sources
- Handle platform-specific installation (Windows, macOS, Linux)
- Enable local deployment and health monitoring through the UI
- Present clear status and progress information during operations

**Non-Goals:**
- Replace the existing CLI or web interface
- Manage remote agent deployments (only local)
- Provide agent configuration customization beyond basic setup
- Implement agent-to-agent communication or clustering

## Decisions

### 1: Desktop Framework - Tari 2.0

**Decision**: Use Tari 2.0 for the desktop application shell.

**Rationale**:
- Cross-platform support (Windows, macOS, Linux) from a single codebase
- JavaScript/TypeScript ecosystem aligns with Helios web stack
- Mature tooling for auto-update, installers, and system integration
- Native Node.js integration for spawning installation processes

**Alternatives considered**:
- Tauri (Rust): Lighter weight but less mature ecosystem for our use case

### 2: Agent Distribution - GitHub Releases

**Decision**: Download Hermes agent binaries from official GitHub Releases.

**Rationale**:
- Single source of truth for stable releases
- Built-in integrity checking via SHA256 checksums
- No custom download server needed
- Version tagging and release notes available

**Alternatives considered**:
- Custom CDN: More infrastructure to maintain
- Build from source: Too complex for end users

### 3: Installation Location

**Decision**: Install agent to platform-specific application data directories.

**Rationale**:
- Windows: `%APPDATA%\Helios\agent\HermesAgent`
- macOS: `~/Library/Application Support/Helios/agent/HermesAgent`
- Linux: `~/.local/share/helios/agent/hermes-agent`

**Alternatives considered**:
- System-wide install: Requires admin/root privileges, complicates uninstall
- User's home directory only: Fine for most cases, follows XDG standards on Linux

### 4: Process Management - Agent as System Service

**Decision**: Register Hermes agent as a background service/daemon managed by the desktop app.

**Rationale**:
- Ensures agent survives terminal sessions
- Standard startup on system boot (optional)
- Clean lifecycle management (start/stop/restart)
- Platform-native service management APIs

**Alternatives considered**:
- Spawn as child process: Dies when app closes
- Manual user management: Too error-prone

## Risks / Trade-offs

- **Risk**: Electron app distribution requires signing and notarization for macOS
  - **Mitigation**: Use electron-builder with code signing; budget time for Apple Developer account setup

- **Risk**: Antivirus false positives on downloaded binaries
  - **Mitigation**: Provide clear instructions, use HTTPS only, display checksum verification

- **Risk**: Platform differences in service management APIs
  - **Mitigation**: Abstract platform-specific code behind a cross-platform interface; use node-windows, node-mac, and node-linux for service registration

- **Trade-off**: Electron's memory footprint vs. native app feel
  - **Mitigation**: Target minimum RAM of 512MB; lazy-load components where possible

## Migration Plan

1. **Alpha**: Internal testing with development builds
2. **Beta**: Limited release to early adopters via GitHub Releases
3. **GA**: Official release with signed installers for all platforms

Rollback: Users can uninstall the desktop app and fall back to CLI installation.

## Open Questions

- Should the desktop app bundle a specific agent version or always fetch the latest?
- Do we need to support multiple agent instances on the same machine?
- Should we integrate with Helios Cloud for settings sync?
