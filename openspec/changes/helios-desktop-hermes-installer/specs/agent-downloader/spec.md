## ADDED Requirements

### Requirement: Automatic agent download
The system SHALL automatically download the Hermes agent binary from the official GitHub release source when the user initiates installation.

#### Scenario: Download from GitHub releases
- **WHEN** user clicks "Install Hermes Agent"
- **THEN** the system SHALL download the appropriate Hermes agent binary for the current platform and architecture from GitHub Releases

#### Scenario: Platform detection
- **WHEN** download is initiated
- **THEN** the system SHALL detect the current platform (Windows, macOS, Linux) and architecture (x64, arm64) to fetch the correct binary

#### Scenario: Download uses HTTPS
- **WHEN** downloading the agent binary
- **THEN** the system SHALL use HTTPS to ensure secure transfer

### Requirement: Integrity verification
The system SHALL verify the integrity of downloaded binaries before installation.

#### Scenario: SHA256 checksum verification
- **WHEN** the binary download completes
- **THEN** the system SHALL compute the SHA256 checksum and compare it against the published checksum from the release

#### Scenario: Checksum mismatch blocks installation
- **WHEN** checksum verification fails
- **THEN** the system SHALL abort installation and display an error message indicating potential file corruption

### Requirement: Progress reporting during download
The system SHALL report download progress to provide feedback to the user.

#### Scenario: Download progress percentage
- **WHEN** download is in progress
- **THEN** the system SHALL report real-time progress percentage

#### Scenario: Download speed display
- **WHEN** download is in progress
- **THEN** the system SHALL display current download speed (MB/s)

#### Scenario: Time remaining estimate
- **WHEN** download is in progress
- **THEN** the system SHALL display estimated time remaining

### Requirement: Download cancellation
The system SHALL allow the user to cancel an in-progress download.

#### Scenario: Cancel download
- **WHEN** user clicks "Cancel" during download
- **THEN** the download SHALL be aborted and partial files cleaned up

#### Scenario: UI state after cancellation
- **WHEN** download is cancelled
- **THEN** the UI SHALL return to the pre-download state with the "Install" button available
