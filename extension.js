import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';
import Gio from 'gi://Gio';

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
            // Some example
            let menuItem = new PopupMenu.PopupMenuItem("Open ChatGPT");
            menuItem.connect("activate", () => this._openChatGPT());
            this.menu.addMenuItem(menuItem);

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

        _getGIcon(name) {
            let path = `${this.metadata.path}/icons/${name}.svg`;
            let file = Gio.File.new_for_path(path);

            if (!file.query_exists(null)) {
                console.warn("No icon packaged.");
            }
            return Gio.icon_new_for_string(path);
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
