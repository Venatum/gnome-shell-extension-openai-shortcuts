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

            this.add_child(icon);
            this._buildMenu()
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

            if (iconName) {
                menuItem.insert_child_at_index(
                    new St.Icon({
                        icon_name: iconName,
                        style_class: 'clipboard-menu-icon',
                        y_align: Clutter.ActorAlign.CENTER
                    }),
                    0
                );
            }
            if (callback) {
                menuItem.connect('activate', callback);
            }
            return menuItem;
        }

        /**
         * Create a shortcut menu item
         * @param {number} shortcutNumber - The shortcut number (1 or 2)
         * @param {string} iconName - The icon name for the menu item
         * @returns {PopupMenu.PopupMenuItem} - The created menu item
         */
        _createShortcutMenuItem(shortcutNumber, iconName) {
            const prefix = this._getShortcutPrefix(shortcutNumber);
            return this._createMenuItem(
                `Shortcut ${shortcutNumber}: ${prefix}`,
                iconName,
                () => this._sendClipboardWithPrefix(shortcutNumber)
            );
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

            // Add Shortcut menu items
            const shortcut1MenuItem = this._createShortcutMenuItem(1, 'accessories-dictionary-symbolic');
            this.menu.addMenuItem(shortcut1MenuItem);

            const shortcut2MenuItem = this._createShortcutMenuItem(2, 'document-edit-symbolic');
            this.menu.addMenuItem(shortcut2MenuItem);

            // Add separator
            this.historySeparator = new PopupMenu.PopupSeparatorMenuItem();
            this.menu.addMenuItem(this.historySeparator);

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
         * Get the API token from settings and validate it
         * @returns {string|null} - The API token or null if not set
         */
        _getApiToken() {
            const apiToken = this.settings.get_string('openai-api-token');
            if (!apiToken) {
                this._showNotification('OpenAI API token is not set. Please set it in the extension settings.');
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
                    this._showNotification('Clipboard is empty');
                    return;
                }
                callback(text);
            });
        }

        _sendClipboardToOpenAI() {
            this._getClipboardContent(text => {
                const apiToken = this._getApiToken();
                if (!apiToken) return;

                this._sendToOpenAI(text, apiToken);
            });
        }

        /**
         * Get the prefix for a shortcut number
         * @param {number} shortcutNumber - The shortcut number (1 or 2)
         * @returns {string} - The prefix for the shortcut
         */
        _getShortcutPrefix(shortcutNumber) {
            const settingKey = `shortcut${shortcutNumber}-prefix`;
            return this.settings.get_string(settingKey);
        }

        _sendClipboardWithPrefix(shortcutNumber) {
            this._getClipboardContent(text => {
                const apiToken = this._getApiToken();
                if (!apiToken) return;

                // Get the appropriate prefix from settings
                const prefix = this._getShortcutPrefix(shortcutNumber);

                // Prefix the text and send to OpenAI
                const prefixedText = prefix + text;
                this._showNotification(`Sending to OpenAI with prefix: ${prefix}`);
                this._sendToOpenAI(prefixedText, apiToken);
            });
        }

        _showNotification(message) {
            // Check if notifications are enabled
            if (!this.settings.get_boolean('enable-notifications')) {
                return;
            }

            // Get notification title from settings
            const title = this.settings.get_string('notification-title');
            Main.notify(title, message);
        }

        _sendToOpenAI(text, apiToken) {
            // Create a session
            const session = new Soup.Session();

            // Create a message
            const message = Soup.Message.new('POST', 'https://api.openai.com/v1/chat/completions');

            // Check if message was created successfully
            if (!message) {
                this._showNotification('Error: Could not create HTTP request');
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
                        this._showNotification(`Error: HTTP status ${statusCode}`);
                        return;
                    }

                    if (bytes) {
                        const data = bytes.get_data();
                        if (!data || data.length === 0) {
                            this._showNotification('Error: Empty response from OpenAI');
                            return;
                        }

                        const responseText = new TextDecoder().decode(data);
                        let response;

                        try {
                            response = JSON.parse(responseText);
                        } catch (parseError) {
                            this._showNotification(`Error parsing response: ${parseError.message}`);
                            return;
                        }

                        if (response.error) {
                            this._showNotification(`API Error: ${response.error.message || 'Unknown error'}`);
                            return;
                        }

                        if (response.choices && response.choices.length > 0) {
                            const content = response.choices[0].message.content;
                            // Copy the response to clipboard
                            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, content);
                            this._showNotification('Response copied to clipboard');
                        } else {
                            this._showNotification('Error: No valid response content from OpenAI');
                        }
                    } else {
                        this._showNotification('Error: No response data from OpenAI');
                    }
                } catch (error) {
                    this._showNotification(`Error: ${error.message}`);
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

        this.openAIShortcutsIndicator?.destroy();
        this.openAIShortcutsIndicator = null;
    }

    /**
     * Add a keybinding for a shortcut
     * @param {number} shortcutNumber - The shortcut number (1 or 2)
     */
    _addKeybinding(shortcutNumber) {
        const settingName = `shortcut${shortcutNumber}-keybinding`;
        Main.wm.addKeybinding(
            settingName,
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            () => {
                this.openAIShortcutsIndicator._sendClipboardWithPrefix(shortcutNumber);
            }
        );
    }

    _addKeybindings() {
        this._addKeybinding(1);
        this._addKeybinding(2);
    }

    /**
     * Remove a keybinding for a shortcut
     * @param {number} shortcutNumber - The shortcut number (1 or 2)
     */
    _removeKeybinding(shortcutNumber) {
        const settingName = `shortcut${shortcutNumber}-keybinding`;
        Main.wm.removeKeybinding(settingName);
    }

    _removeKeybindings() {
        this._removeKeybinding(1);
        this._removeKeybinding(2);
    }
}
