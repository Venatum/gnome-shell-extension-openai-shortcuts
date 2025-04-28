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

        _buildMenu() {
            // Open ChatGPT
            let menuItem = new PopupMenu.PopupMenuItem("Open ChatGPT");
            menuItem.connect("activate", () => this._openChatGPT());
            this.menu.addMenuItem(menuItem);

            // Add clipboard to OpenAI menu item
            let clipboardMenuItem = new PopupMenu.PopupMenuItem("Send Clipboard to OpenAI");
            clipboardMenuItem.insert_child_at_index(
                new St.Icon({
                    icon_name: 'edit-paste-symbolic',
                    style_class: 'clipboard-menu-icon',
                    y_align: Clutter.ActorAlign.CENTER
                }),
                0
            );
            clipboardMenuItem.connect("activate", () => this._sendClipboardToOpenAI());
            this.menu.addMenuItem(clipboardMenuItem);

            // Add separator
            this.historySeparator = new PopupMenu.PopupSeparatorMenuItem();
            this.menu.addMenuItem(this.historySeparator);

            // Add 'Settings' menu item to open settings
            // this.settingsMenuItem = new PopupMenu.PopupMenuItem(_('Settings'));
            this.settingsMenuItem = new PopupMenu.PopupMenuItem('Settings');
            this.settingsMenuItem.insert_child_at_index(
                new St.Icon({
                    icon_name: 'preferences-system-symbolic',
                    style_class: 'clipboard-menu-icon',
                    y_align: Clutter.ActorAlign.CENTER
                }),
                0
            );
            this.menu.addMenuItem(this.settingsMenuItem);
            this.settingsMenuItem.connect('activate', this._openSettings.bind(this));

            // Add 'Exit' menu item to close the menu
            this.exitMenuItem = new PopupMenu.PopupMenuItem('Exit');
            this.exitMenuItem.insert_child_at_index(
                new St.Icon({
                    icon_name: 'window-close-symbolic',
                    style_class: 'clipboard-menu-icon',
                    y_align: Clutter.ActorAlign.CENTER
                }),
                0
            );
            this.menu.addMenuItem(this.exitMenuItem);
            this.exitMenuItem.connect('activate', this._exitMenu.bind(this));
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

        _openSettings () {
            this.extension.openPreferences();
        }

        _exitMenu() {
            this.extension.disable();
        }

        _sendClipboardToOpenAI() {
            // Get clipboard content
            const clipboard = St.Clipboard.get_default();
            clipboard.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
                if (!text) {
                    this._showNotification('Clipboard is empty');
                    return;
                }

                // Get API token from settings
                const apiToken = this.settings.get_string('openai-api-token');
                if (!apiToken) {
                    this._showNotification('OpenAI API token is not set. Please set it in the extension settings.');
                    return;
                }

                // Send to OpenAI API
                // TODO
                this._showNotification(`Sending to OpenAI...${text}`);
                // this._sendToOpenAI(text, apiToken);
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

            // Set headers
            message.request_headers.append('Authorization', `Bearer ${apiToken}`);
            message.request_headers.append('Content-Type', 'application/json');

            // Set body
            const body = JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: text
                    }
                ]
            });

            const bytes = GLib.Bytes.new(Array.from(body).map(c => c.charCodeAt(0)));
            message.set_request_body_from_bytes('application/json', bytes);

            // Send the request
            session.send_and_read_async(message, Soup.MessagePriority.NORMAL, null, (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    if (bytes) {
                        const data = bytes.get_data();
                        const responseText = String.fromCharCode.apply(null, data);
                        const response = JSON.parse(responseText);

                        if (response.choices && response.choices.length > 0) {
                            const content = response.choices[0].message.content;
                            // Copy the response to clipboard
                            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, content);
                            this._showNotification('Response copied to clipboard');
                        } else {
                            this._showNotification('Error: No response from OpenAI');
                        }
                    } else {
                        this._showNotification('Error: No response from OpenAI');
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
    }

    disable() {
        // this.openAIShortcutsIndicator?.quickSettingsItems.forEach(item => item.destroy());
        this.openAIShortcutsIndicator?.destroy();
        this.openAIShortcutsIndicator = null;
    }
}
