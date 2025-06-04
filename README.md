# OpenAI Shortcuts GNOME Extension

A GNOME Shell extension that provides keyboard shortcuts and quick access to OpenAI's ChatGPT directly from your desktop.

![OpenAI Shortcuts Extension](https://github.com/Venatum/gnome-shell-extension-openai-shortcuts/raw/main/screenshots/menu.png)

## Features

- 🚀 Quick access to OpenAI's ChatGPT from your GNOME desktop
- ⌨️ Customizable keyboard shortcuts for common OpenAI tasks
- 📋 Send clipboard content directly to OpenAI with a single click
- 🔧 Configurable API settings for using your own OpenAI API key
- 🌐 Supports multiple OpenAI models including GPT-4.1
- 🔔 Customizable notifications for OpenAI operations
- ♿ Full accessibility support for screen readers and keyboard navigation

## Accessibility

This extension is designed to be accessible to all users, including those with disabilities. I do my best to ensure accessibility:

- 🔊 **Screen Reader Support**: All UI elements have proper accessibility labels and descriptions
- ⌨️ **Keyboard Navigation**: Full keyboard navigation support throughout the extension
- 🔔 **Accessible Notifications**: Notifications are properly announced by screen readers with appropriate urgency levels
- 🖥️ **High Contrast Support**: UI elements are designed to be visible in high contrast mode
- 🌐 **Internationalization**: Text is properly marked for translation

## Installation

### From GNOME Extensions Website (Recommended)

1. Visit the [GNOME Extensions website](https://extensions.gnome.org/) and search for "OpenAI Shortcuts"
2. Click "Install" to add the extension to your GNOME Shell

### Manual Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Venatum/gnome-shell-extension-openai-shortcuts.git
   ```

2. Install the extension:
   ```bash
   cd gnome-shell-extension-openai-shortcuts
   make install
   ```

3. Restart GNOME Shell:
   - On X11: Press `Alt+F2`, type `r`, and press Enter
   - On Wayland: Log out and log back in

4. Enable the extension:
   ```bash
   gnome-extensions enable openai-shortcuts@venatum.com
   ```

## Usage

### Menu Options

- **Open ChatGPT**: Opens the ChatGPT website in your default browser
- **Send Clipboard to OpenAI**: Sends the current clipboard content to OpenAI and displays the response
- **Custom Shortcuts**: Predefined shortcuts for common tasks (Translate, Improve, etc.)
- **Settings**: Opens the extension settings dialog
- **Exit**: Disables the extension

### Default Keyboard Shortcuts

- `Super+T`: Translate the clipboard content
- `Super+I`: Improve the clipboard content

### Adding Custom Shortcuts

1. Open the extension settings
2. Go to the "Shortcuts" tab
3. Click "Add" to create a new shortcut
4. Enter a name, prefix, and keyboard shortcut
5. Click "Save"

## Configuration

### General Settings

- **ChatGPT URL**: The URL to open when clicking on the ChatGPT menu item (default: https://chat.openai.com)

### API Settings

- **OpenAI API URL**: Base URL for OpenAI API requests (default: https://api.openai.com/v1/)
- **OpenAI API Token**: Your personal API token for accessing OpenAI services
- **OpenAI Model**: The model to use for API requests (default: gpt-4.1)

### Notification Settings

- **Enable Notifications**: Toggle to show/hide notifications for OpenAI operations
- **Notification Title**: The title to use for notifications

### Logging Settings

- **Enable API Error Logging**: Toggle to enable/disable logging of API errors
- **API Error Log Level**: The level of detail for API error logs (error, info, debug)

## Development

### Prerequisites

- GNOME Shell development tools
- Git

### Setup Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/Venatum/gnome-shell-extension-openai-shortcuts.git
   cd gnome-shell-extension-openai-shortcuts
   ```

2. Install the extension in development mode:
   ```bash
   make install
   ```

3. For live reloading during development, use the watch script:
   ```bash
   ./watch.sh
   ```

### Debugging

To view logs from the extension:

```bash
make debug
```

## Release Process

### Automated Release (Using GitHub Actions)

1. Update the code with your changes
2. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. Create a new tag with the version number:
   ```bash
   git tag v1.0.0  # Replace with your version number
   ```

4. Push the tag to GitHub:
   ```bash
   git push origin v1.0.0
   ```

5. The GitHub Action will automatically:
   - Build the extension
   - Update the version in metadata.json
   - Create a GitHub release with the packaged extension

### Manual Release

#### Using the Release Script (Recommended)

1. Run the release script with the new version number:
   ```bash
   ./release.sh 2  # Replace with your version number
   ```

2. Follow the instructions provided by the script for committing, tagging, and pushing your changes.

3. The packaged extension will be available as `openai-shortcuts@venatum.com.zip`

#### Manual Steps

If you prefer to do it manually:

1. Update the version in `metadata.json`:
   ```json
   {
     "version": 2  // Increment this number
   }
   ```

2. Compile the schemas:
   ```bash
   make compile-schemas
   ```

3. Create the package:
   ```bash
   make package
   ```

4. The packaged extension will be available as `openai-shortcuts@venatum.com.zip`

### Submitting to GNOME Extensions Website

1. Visit [extensions.gnome.org](https://extensions.gnome.org/)
2. Log in with your GNOME account
3. Go to your user page and click "Upload Extension"
4. Upload the ZIP file created in the previous step
5. Fill in the required information and submit

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgements

- [GNOME Shell](https://gitlab.gnome.org/GNOME/gnome-shell)
- [OpenAI](https://openai.com/) for their amazing API
