import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import {QuickToggle, SystemIndicator} from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as ExtensionUtils from 'resource:///org/gnome/shell/misc/extensionUtils.js';

const OpenAIShortcutsIndicator = GObject.registerClass(
    class OpenAIShortcutsIndicator extends PanelMenu.Button {
        _init({extension, metadata, settings}) {
            super._init(0.0, "OpenAI Shortcuts", false);
            this.metadata = metadata;
            this.settings = settings;
            this.extension = extension;

            // Ajouter une icône
            let icon = new St.Icon({
                // icon_name: INDICATOR_ICON,
                gicon: this._getGIcon("chatgpt"),
                style_class: 'system-status-icon'
            });

            // Set accessible properties for the panel button
            // Note: St.AccessibleRole is no longer available in GNOME Shell 46
            this.accessible_name = "OpenAI Shortcuts";
            this.accessible_description = "Access OpenAI features and shortcuts";

            this.add_child(icon);
            this._buildMenu();

            // Listen for changes to the custom-shortcuts setting
            this.settingsChangedId = this.settings.connect('changed::custom-shortcuts', () => {
                this._rebuildMenu();
            });
        }

        /**
         * Create a menu item with an icon
         * @param {string} text - The text to display in the menu item
         * @param {string} iconName - The name of the icon to display
         * @param {Function} callback - The function to call when the menu item is activated
         * @returns {PopupMenu.PopupMenuItem} - The created menu item
         */
        _createMenuItem(text, iconName, callback) {
            const menuItem = new PopupMenu.PopupMenuItem(text);

            // Set accessibility properties for the menu item
            // Note: St.AccessibleRole is no longer available in GNOME Shell 46
            menuItem.accessible_name = text;

            if (iconName) {
                const icon = new St.Icon({
                    icon_name: iconName,
                    style_class: 'clipboard-menu-icon',
                    y_align: Clutter.ActorAlign.CENTER
                });

                // Set accessibility properties for the icon
                // Note: St.AccessibleRole is no longer available in GNOME Shell 46
                icon.accessible_name = iconName.replace(/-symbolic$/, '').replace(/-/g, ' ');

                menuItem.insert_child_at_index(icon, 0);
            }
            if (callback) {
                menuItem.connect('activate', callback);
            }
            return menuItem;
        }

        /**
         * Create a shortcut menu item
         * @param {Object} shortcut - The shortcut object
         * @param {string} iconName - The icon name for the menu item
         * @returns {PopupMenu.PopupMenuItem} - The created menu item
         */
        _createShortcutMenuItem(shortcut, iconName) {
            const menuItem = this._createMenuItem(
                `${shortcut.name}`,
                iconName,
                () => this._sendClipboardWithPrefix(shortcut)
            );

            // Add additional accessibility information for shortcuts
            menuItem.accessible_description = `Sends clipboard content with prefix "${shortcut.prefix}" to OpenAI`;

            // If the shortcut has a keybinding, add it to the accessible description
            if (shortcut.keybinding && shortcut.keybinding !== '') {
                menuItem.accessible_description += ` (Keyboard shortcut: ${shortcut.keybinding})`;
            }

            return menuItem;
        }

        /**
         * Get the shortcuts from settings
         * @returns {Array} - Array of shortcut objects
         */
        _getShortcuts() {
            const shortcutsStrings = this.settings.get_strv('custom-shortcuts');
            return shortcutsStrings.map(shortcutString => {
                try {
                    return JSON.parse(shortcutString);
                } catch (e) {
                    console.error(`Error parsing shortcut: ${shortcutString}`, e);
                    return null;
                }
            }).filter(shortcut => shortcut !== null);
        }

        _buildMenu() {
            // Open ChatGPT
            const chatGptMenuItem = this._createMenuItem(
                "Open ChatGPT",
                null,
                () => this._openChatGPT()
            );
            this.menu.addMenuItem(chatGptMenuItem);

            // Add clipboard to OpenAI menu item
            const clipboardMenuItem = this._createMenuItem(
                "Send Clipboard to OpenAI",
                'edit-paste-symbolic',
                () => this._sendClipboardToOpenAI()
            );
            this.menu.addMenuItem(clipboardMenuItem);
            // Add separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Add Shortcut menu items
            const shortcuts = this._getShortcuts();
            const icons = ['accessories-dictionary-symbolic', 'document-edit-symbolic', 'edit-find-symbolic', 'edit-select-all-symbolic'];

            shortcuts.forEach((shortcut, index) => {
                const iconName = icons[index % icons.length];
                const shortcutMenuItem = this._createShortcutMenuItem(shortcut, iconName);
                this.menu.addMenuItem(shortcutMenuItem);
            });

            // Add separator
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            // Add 'Settings' menu item to open settings
            this.settingsMenuItem = this._createMenuItem(
                'Settings',
                'preferences-system-symbolic',
                this._openSettings.bind(this)
            );
            this.menu.addMenuItem(this.settingsMenuItem);

            // Add 'Exit' menu item to close the menu
            this.exitMenuItem = this._createMenuItem(
                'Exit',
                'window-close-symbolic',
                this._exitMenu.bind(this)
            );
            this.menu.addMenuItem(this.exitMenuItem);
        }

        _getGIcon(name) {
            let path = `${this.metadata.path}/icons/${name}.svg`;
            let file = Gio.File.new_for_path(path);

            if (!file.query_exists(null)) {
                console.warn("No icon packaged.");
            }
            return Gio.icon_new_for_string(path);
        }

        _openChatGPT() {
            const url = this.settings.get_string('chatgpt-url');
            Gio.app_info_launch_default_for_uri(url, null);
        }

        _openSettings() {
            this.extension.openPreferences();
        }

        _exitMenu() {
            this.extension.disable();
        }

        /**
         * Rebuild the menu when shortcuts change
         */
        _rebuildMenu() {
            // Remove all menu items
            this.menu.removeAll();

            // Rebuild the menu
            this._buildMenu();
        }

        /**
         * Get the API token from settings and validate it
         * @returns {string|null} - The API token or null if not set
         */
        _getApiToken() {
            const apiToken = this.settings.get_string('openai-api-token');
            if (!apiToken) {
                this._showNotification('OpenAI API token is not set. Please set it in the extension settings.', true);
                return null;
            }
            return apiToken;
        }

        /**
         * Get clipboard content and process it with the provided callback
         * @param {Function} callback - Function to call with the clipboard text
         */
        _getClipboardContent(callback) {
            const clipboard = St.Clipboard.get_default();
            clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
                if (!text) {
                    this._showNotification('Clipboard is empty', true);
                    return;
                }
                callback(text);
            });
        }

        _sendClipboardToOpenAI() {
            this._getClipboardContent(text => {
                this._sendToOpenAI(text);
            });
        }

        /**
         * Send clipboard content with a prefix from a shortcut
         * @param {Object} shortcut - The shortcut object
         */
        _sendClipboardWithPrefix(shortcut) {
            this._getClipboardContent(text => {
                // Prefix the text and send to OpenAI
                const prefixedText = `${shortcut.prefix} ${text}`;
                this._sendToOpenAI(prefixedText);
            });
        }

        /**
         * Show a notification with proper accessibility support
         * @param {string} message - The message to display in the notification
         * @param {boolean} isError - Whether this is an error notification
         */
        _showNotification(message, isError = false) {
            // Check if notifications are enabled
            if (!this.settings.get_boolean('enable-notifications')) {
                return;
            }

            // Get notification title from settings
            const title = this.settings.get_string('notification-title');

            // Create a source for the notification
            const source = new MessageTray.Source({
                title: title,
                iconName: 'dialog-information-symbolic'
            });

            // Add the source to the message tray
            Main.messageTray.add(source);

            // Create the notification with accessibility attributes
            const notification = new MessageTray.Notification({
                source: source,
                title: title,
                body: message,
                // Use CRITICAL urgency for errors to ensure they're announced by screen readers
                urgency: isError ? MessageTray.Urgency.CRITICAL : MessageTray.Urgency.NORMAL
            });

            // Ensure the notification is accessible to screen readers
            // Note: St.AccessibleRole is no longer available in GNOME Shell 46

            // Show the notification
            source.showNotification(notification);
        }

        /**
         * Log API errors based on settings
         * @param {string} message - The error message to log
         * @param {Object} [details] - Additional details about the error
         */
        _logApiError(message, details = null) {
            // Check if API error logging is enabled
            if (!this.settings.get_boolean('enable-api-error-logging')) {
                return;
            }

            // Get log level from settings
            const logLevel = this.settings.get_string('api-error-log-level');

            // Create log entry with timestamp
            const timestamp = new Date().toISOString();
            let logEntry = `[${timestamp}] [${logLevel.toUpperCase()}] ${message}`;

            // Add details if provided
            if (details) {
                if (typeof details === 'object') {
                    try {
                        logEntry += `\nDetails: ${JSON.stringify(details, null, 2)}`;
                    } catch (e) {
                        logEntry += `\nDetails: [Object could not be stringified]`;
                    }
                } else {
                    logEntry += `\nDetails: ${details}`;
                }
            }

            // Log to console based on the log level
            switch (logLevel) {
                case 'debug':
                    console.debug(logEntry);
                    break;
                case 'info':
                    console.info(logEntry);
                    break;
                case 'error':
                default:
                    console.error(logEntry);
                    break;
            }
        }

        /**
         * Format API URL to avoid double slashes
         * @param {string} baseUrl - The base API URL
         * @param {string} endpoint - The API endpoint to append
         * @returns {string} - The properly formatted URL
         */
        _formatApiUrl(baseUrl, endpoint) {
            // Remove the trailing slash from baseUrl if it exists
            const formattedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            // Ensure the endpoint starts with a slash
            const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            return `${formattedBaseUrl}${formattedEndpoint}`;
        }

        /**
         * Format headers from Soup.MessageHeaders into a readable object
         * @param {Soup.MessageHeaders} headers - The headers object
         * @returns {Object} - Formatted headers as a key-value object
         */
        _formatHeaders(headers) {
            if (!headers) return 'No headers';

            try {
                const formattedHeaders = {};

                // Try to get all header names if the method exists
                if (typeof headers.get_header_names === 'function') {
                    const headerNames = headers.get_header_names();

                    // For each header name, get its value
                    if (headerNames && headerNames.length) {
                        for (let i = 0; i < headerNames.length; i++) {
                            const name = headerNames[i];
                            const value = headers.get_one(name);
                            formattedHeaders[name] = value;
                        }
                        return formattedHeaders;
                    }
                }

                // Alternative approach if get_header_names is not available
                // Try common headers
                const commonHeaders = [
                    'Content-Type', 'Content-Length', 'Server',
                    'Date', 'Connection', 'Cache-Control',
                    'Access-Control-Allow-Origin', 'X-Request-ID'
                ];

                let foundAny = false;
                for (const name of commonHeaders) {
                    const value = headers.get_one(name);
                    if (value) {
                        formattedHeaders[name] = value;
                        foundAny = true;
                    }
                }

                if (foundAny) {
                    return formattedHeaders;
                }

                // If all else fails, try to use foreach if available
                if (typeof headers.foreach === 'function') {
                    headers.foreach((name, value) => {
                        formattedHeaders[name] = value;
                    });
                    return formattedHeaders;
                }

                return 'Could not extract headers';
            } catch (error) {
                return `Error extracting headers: ${error.message}`;
            }
        }

        _sendToOpenAI(text) {
            const apiToken = this._getApiToken();
            if (!apiToken) return;

            // Create a session
            const session = new Soup.Session();

            // Get API URL from settings
            const apiUrl = this.settings.get_string('openai-api-url');
            // Create a message with a properly formatted URL
            const message = Soup.Message.new('POST', this._formatApiUrl(apiUrl, 'chat/completions'));

            // Check if a message was created successfully
            if (!message) {
                const errorMsg = 'Error: Could not create HTTP request';
                this._showNotification(errorMsg, true);
                this._logApiError(errorMsg, { url: this._formatApiUrl(apiUrl, 'chat/completions') });
                return;
            }

            // Set headers
            message.request_headers.append('Authorization', `Bearer ${apiToken}`);
            message.request_headers.append('Content-Type', 'application/json');

            // Set body
            const model = this.settings.get_string('openai-model');
            const body = JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'user',
                        content: text
                    }
                ]
            });

            // Convert string to bytes more efficiently using TextEncoder
            const encoder = new TextEncoder();
            const uint8Array = encoder.encode(body);
            const bytes = GLib.Bytes.new(uint8Array);
            message.set_request_body_from_bytes('application/json', bytes);

            // Send the request
            session.send_and_read_async(message, Soup.MessagePriority.NORMAL, null, (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);

                    // Check HTTP status code
                    const statusCode = message.status_code;
                    if (statusCode !== 200) {
                        // Try to extract more information from the response body for better error reporting
                        let errorDetails = '';
                        let responseData = null;

                        if (bytes) {
                            const data = bytes.get_data();
                            if (data && data.length > 0) {
                                try {
                                    const responseText = new TextDecoder().decode(data);
                                    responseData = JSON.parse(responseText);
                                    if (responseData && responseData.error) {
                                        errorDetails = `: ${responseData.error.message || responseData.error.type || 'Unknown error'}`;
                                    } else if (responseData && (responseData.detail || responseData.title)) {
                                        // Handle alternative error format (like the one in the issue with title, detail, status, type)
                                        errorDetails = `: ${responseData.detail || responseData.title || 'Unknown error'}`;
                                    }
                                } catch (e) {
                                    // Ignore parsing errors, we'll just use the status code
                                }
                            }
                        }

                        const errorMsg = `Error: HTTP status ${statusCode}: ${responseData && responseData.detail ? responseData.detail : 'Unknown error'}`;
                        this._showNotification(errorMsg, true);
                        this._logApiError(errorMsg, {
                            statusCode: statusCode,
                            url: this._formatApiUrl(apiUrl, 'chat/completions'),
                            responseHeaders: message.response_headers ? this._formatHeaders(message.response_headers) : 'No headers',
                            responseData: responseData
                        });
                        return;
                    }

                    if (bytes) {
                        const data = bytes.get_data();
                        if (!data || data.length === 0) {
                            const errorMsg = 'Error: Empty response from OpenAI';
                            this._showNotification(errorMsg, true);
                            this._logApiError(errorMsg, {
                                statusCode: statusCode,
                                url: this._formatApiUrl(apiUrl, 'chat/completions')
                            });
                            return;
                        }

                        const responseText = new TextDecoder().decode(data);
                        let response;

                        try {
                            response = JSON.parse(responseText);
                        } catch (parseError) {
                            const errorMsg = `Error parsing response: ${parseError.message}`;
                            this._showNotification(errorMsg, true);
                            this._logApiError(errorMsg, {
                                error: parseError.toString(),
                                responseText: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')
                            });
                            return;
                        }

                        if (response.error) {
                            const errorMsg = `API Error: ${response.error.message || 'Unknown error'}`;
                            this._showNotification(errorMsg, true);
                            this._logApiError(errorMsg, {
                                error: response.error,
                                model: model,
                                requestLength: text.length
                            });
                            return;
                        }

                        // Handle different response structures (standard and nested)
                        let content = null;

                        // Check for standard OpenAI API response structure
                        if (response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
                            content = response.choices[0].message.content;
                        }
                        // Check for nested response structure (seen with GPT-4.1)
                        else if (response.response && response.response.choices &&
                                 response.response.choices.length > 0 &&
                                 response.response.choices[0].message &&
                                 response.response.choices[0].message.content) {
                            content = response.response.choices[0].message.content;
                        }

                        if (content) {
                            // Copy the response to clipboard
                            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, content);
                            this._showNotification('Response copied to clipboard');
                            // TODO: debug
                            this._showNotification(content);
                        } else {
                            const errorMsg = 'Error: No valid response content from OpenAI';
                            this._showNotification(errorMsg, true);
                            this._logApiError(errorMsg, {
                                response: response,
                                model: model
                            });
                        }
                    } else {
                        const errorMsg = 'Error: No response data from OpenAI';
                        this._showNotification(errorMsg, true);
                        this._logApiError(errorMsg, {
                            statusCode: statusCode,
                            url: this._formatApiUrl(apiUrl, 'chat/completions')
                        });
                    }
                } catch (error) {
                    const errorMsg = `Error: ${error.message}`;
                    this._showNotification(errorMsg, true);
                    this._logApiError(errorMsg, {
                        error: error.toString(),
                        stack: error.stack,
                        model: model,
                        url: this._formatApiUrl(apiUrl, 'chat/completions')
                    });
                }
            });
        }
    });

export default class OpenAIShortcutsExtension extends Extension {
    enable() {
        console.log(`enabling ${this.metadata.name}`);

        // Initialize settings
        this.settings = this.getSettings();

        // Create indicator
        this.openAIShortcutsIndicator = new OpenAIShortcutsIndicator({
            extension: this,
            metadata: this.metadata,
            settings: this.settings
        });

        const positionIndex = 1;
        // Add to panel
        Main.panel.addToStatusArea('openai-shortcuts', this.openAIShortcutsIndicator, positionIndex);

        // Add keyboard shortcuts
        this._addKeybindings();
    }

    disable() {
        // Remove keyboard shortcuts
        this._removeKeybindings();

        // Disconnect settings signal if it exists
        if (this.openAIShortcutsIndicator && this.openAIShortcutsIndicator.settingsChangedId) {
            this.settings.disconnect(this.openAIShortcutsIndicator.settingsChangedId);
            this.openAIShortcutsIndicator.settingsChangedId = 0;
        }

        this.openAIShortcutsIndicator?.destroy();
        this.openAIShortcutsIndicator = null;
    }

    /**
     * Get the shortcuts from settings
     * @returns {Array} - Array of shortcut objects
     */
    _getShortcuts() {
        const shortcutsStrings = this.settings.get_strv('custom-shortcuts');
        return shortcutsStrings.map(shortcutString => {
            try {
                return JSON.parse(shortcutString);
            } catch (e) {
                console.error(`Error parsing shortcut: ${shortcutString}`, e);
                return null;
            }
        }).filter(shortcut => shortcut !== null);
    }

    /**
     * Add a keybinding for a shortcut
     * @param {Object} shortcut - The shortcut object
     * @param {number} index - The index of the shortcut
     */
    _addKeybinding(shortcut, index) {
        if (!shortcut.keybinding || shortcut.keybinding === '') {
            return;
        }

        // Create a unique name for the keybinding
        const bindingName = `custom-shortcut-${index}`;

        // Set the keybinding value in the settings
        this.settings.set_strv(bindingName, [shortcut.keybinding]);

        // Add the keybinding
        Main.wm.addKeybinding(
            bindingName,
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => {
                this.openAIShortcutsIndicator._sendClipboardWithPrefix(shortcut);
            }
        );

        // Store the binding name for later removal
        if (!this._customBindingNames) {
            this._customBindingNames = [];
        }
        this._customBindingNames.push(bindingName);
    }

    _addKeybindings() {
        const shortcuts = this._getShortcuts();
        shortcuts.forEach((shortcut, index) => {
            this._addKeybinding(shortcut, index);
        });
    }

    /**
     * Remove a keybinding
     * @param {string} bindingName - The name of the keybinding to remove
     */
    _removeKeybinding(bindingName) {
        try {
            Main.wm.removeKeybinding(bindingName);
        } catch (e) {
            console.error(`Error removing keybinding: ${bindingName}`, e);
        }
    }

    _removeKeybindings() {
        if (this._customBindingNames) {
            this._customBindingNames.forEach(bindingName => {
                this._removeKeybinding(bindingName);
            });
            this._customBindingNames = [];
        }
    }
}
