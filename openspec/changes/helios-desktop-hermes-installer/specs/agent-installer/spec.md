## ADDED Requirements

### Requirement: Automatic installation
The system SHALL automatically install the Hermes agent after successful download, including extraction and configuration.

#### Scenario: Installation to application data directory
- **WHEN** download completes and verification succeeds
- **THEN** the system SHALL extract the binary to the platform-specific application data directory

#### Scenario: Windows installation path
- **WHEN** installing on Windows
- **THEN** the agent SHALL be installed to `%APPDATA%\Helios\HermesAgent\`

#### Scenario: macOS installation path
- **WHEN** installing on macOS
- **THEN** the agent SHALL be installed to `~/Library/Application Support/Helios/HermesAgent/`

#### Scenario: Linux installation path
- **WHEN** installing on Linux
- **THEN** the agent SHALL be installed to `~/.local/share/helios/hermes-agent/`

### Requirement: Service registration
The system SHALL register the Hermes agent as a system service/daemon for automatic startup and lifecycle management.

#### Scenario: Register as Windows service
- **WHEN** installing on Windows
- **THEN** the system SHALL register the agent as a Windows service using node-windows

#### Scenario: Register as macOS launch agent
- **WHEN** installing on macOS
- **THEN** the system SHALL register the agent as a launch agent using node-mac

#### Scenario: Register as Linux systemd user service
- **WHEN** installing on Linux
- **THEN** the system SHALL register the agent as a user-level systemd service using node-linux

### Requirement: Installation cleanup
The system SHALL clean up temporary files after successful installation.

#### Scenario: Remove downloaded archive
- **WHEN** installation completes successfully
- **THEN** the downloaded archive file (zip/tar.gz) SHALL be deleted

#### Scenario: Clean up on failure
- **WHEN** installation fails
- **THEN** the system SHALL remove any partial installation files

### Requirement: Installation status reporting
The system SHALL report installation progress and completion status.

#### Scenario: Progress stages displayed
- **WHEN** installation is in progress
- **THEN** the UI SHALL display current stage: "Downloading...", "Verifying...", "Installing...", "Configuring..."

#### Scenario: Installation completion notification
- **WHEN** installation completes successfully
- **THEN** the UI SHALL display "Installation Complete" and transition to the agent management view

### Requirement: Re-installation handling
The system SHALL handle re-installation of an already installed agent gracefully.

#### Scenario: Detect existing installation
- **WHEN** user clicks "Install" when agent is already installed
- **THEN** the system SHALL prompt user with options: "Reinstall" or "Cancel"

#### Scenario: Reinstall overwrites existing
- **WHEN** user confirms "Reinstall"
- **THEN** the system SHALL stop the running agent, remove existing files, and perform fresh installation
