'use strict';

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';
import Gdk from 'gi://Gdk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class OpenAIShortcutsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Use the same gettext domain as the extension
        this.gettext = this.gettext.bind(this);
        const settings = this.getSettings();

        // Create a preference page and group
        const page = new Adw.PreferencesPage();
        page.add(this._generalSettings(settings));
        page.add(this._shortcutsSettings(settings));
        page.add(this._notificationSettings(settings));

        // Add the page to the window
        window.add(page);
    }

    _generalSettings(settings) {
        //// General Settings group
        const generalGroup = new Adw.PreferencesGroup({
            title: this.gettext('General Settings'),
        });
        // ChatGPT URL row
        const chatgptUrlRow = this._createSettingsRow({
            title: 'ChatGPT URL',
            subtitle: 'URL to open when clicking on the ChatGPT menu item',
            defaultValue: settings.get_string('chatgpt-url'),
            isPassword: false,
            onChanged: newValue => settings.set_string('chatgpt-url', newValue)
        });
        // OpenAI API Token row
        const apiTokenRow = this._createSettingsRow({
            title: 'OpenAI API Token',
            subtitle: 'API token for accessing OpenAI services',
            defaultValue: settings.get_string('openai-api-token'),
            isPassword: true,
            onChanged: newValue => settings.set_string('openai-api-token', newValue)
        });
        // OpenAI Model row
        const modelRow = this._createSettingsRow({
            title: 'OpenAI Model',
            subtitle: 'The OpenAI model to use for API requests (e.g., gpt-3.5-turbo, gpt-4)',
            defaultValue: settings.get_string('openai-model'),
            isPassword: false,
            onChanged: newValue => settings.set_string('openai-model', newValue)
        });
        // Add rows to group and group to the page
        generalGroup.add(chatgptUrlRow);
        generalGroup.add(apiTokenRow);
        generalGroup.add(modelRow);
        return generalGroup;
    }

    _shortcutsSettings(settings) {
        //// Shortcuts group
        const shortcutsGroup = new Adw.PreferencesGroup({
            title: this.gettext('Shortcuts'),
        });

        // Shortcut 1 Prefix row
        const shortcut1PrefixRow = this._createSettingsRow({
            title: 'Shortcut 1 Prefix',
            subtitle: 'Prefix to add to the API call for Shortcut 1 (default: translate: )',
            defaultValue: settings.get_string('shortcut1-prefix'),
            isPassword: false,
            onChanged: newValue => settings.set_string('shortcut1-prefix', newValue)
        });
        shortcutsGroup.add(shortcut1PrefixRow);

        // Shortcut 2 Prefix row
        const shortcut2PrefixRow = this._createSettingsRow({
            title: 'Shortcut 2 Prefix',
            subtitle: 'Prefix to add to the API call for Shortcut 2 (default: improve: )',
            defaultValue: settings.get_string('shortcut2-prefix'),
            isPassword: false,
            onChanged: newValue => settings.set_string('shortcut2-prefix', newValue)
        });
        shortcutsGroup.add(shortcut2PrefixRow);

        // Create keybinding rows
        const shortcut1KeybindingRow = this._createKeybindingRow({
            settings: settings,
            title: 'Shortcut 1 Keybinding',
            subtitle: 'Keyboard shortcut for Shortcut 1 (translate)',
            settingName: 'shortcut1-keybinding'
        });
        shortcutsGroup.add(shortcut1KeybindingRow);

        const shortcut2KeybindingRow = this._createKeybindingRow({
            settings: settings,
            title: 'Shortcut 2 Keybinding',
            subtitle: 'Keyboard shortcut for Shortcut 2 (improve)',
            settingName: 'shortcut2-keybinding'
        });
        shortcutsGroup.add(shortcut2KeybindingRow);
        return shortcutsGroup;
    }

    _notificationSettings(settings) {
        //// Notification Settings group
        const notificationGroup = new Adw.PreferencesGroup({
            title: this.gettext('Notification Settings'),
        });

        // Enable the Notifications switch
        const enableNotificationsRow = new Adw.ActionRow({
            title: this.gettext('Enable Notifications'),
            subtitle: this.gettext('Show notifications for OpenAI operations'),
        });

        const enableNotificationsSwitch = new Gtk.Switch({
            active: settings.get_boolean('enable-notifications'),
            valign: Gtk.Align.CENTER,
        });

        enableNotificationsSwitch.connect('notify::active', widget => {
            settings.set_boolean('enable-notifications', widget.get_active());
        });

        enableNotificationsRow.add_suffix(enableNotificationsSwitch);
        enableNotificationsRow.activatable_widget = enableNotificationsSwitch;
        notificationGroup.add(enableNotificationsRow);

        // Notification Title row
        const notificationTitleRow = this._createSettingsRow({
            title: 'Notification Title',
            subtitle: 'The title to use for notifications',
            defaultValue: settings.get_string('notification-title'),
            isPassword: false,
            onChanged: newValue => settings.set_string('notification-title', newValue)
        });
        notificationGroup.add(notificationTitleRow);
        return notificationGroup;
    }

    /**
     * Create a settings row with a text entry
     * @param {Object} options - Options for the row
     * @param {string} options.title - The title of the row
     * @param {string} options.subtitle - The subtitle of the row
     * @param {string} options.defaultValue - The default value of the entry
     * @param {boolean} options.isPassword - Whether the entry is a password entry
     * @param {Function} options.onChanged - The function to call when the entry changes
     * @returns {Adw.ActionRow} - The created row
     */
    _createSettingsRow({title, subtitle, defaultValue, isPassword = false, onChanged}) {
        const row = new Adw.ActionRow({
            title: this.gettext(title),
            subtitle: this.gettext(subtitle),
        });

        const entry = isPassword
            ? new Gtk.PasswordEntry({
                text: defaultValue,
                valign: Gtk.Align.CENTER,
                hexpand: true,
                show_peek_icon: true,
            })
            : new Gtk.Entry({
                text: defaultValue,
                valign: Gtk.Align.CENTER,
                hexpand: true,
            });

        row.add_suffix(entry);
        row.activatable_widget = entry;

        entry.connect('changed', widget => {
            onChanged(widget.get_text());
        });
        return row;
    };

    /**
     * Create a keybinding row with a button to set the shortcut
     * @param {Object} options - Options for the row
     * @param {Gio.Settings} options.settings - The settings object
     * @param {string} options.title - The title of the row
     * @param {string} options.subtitle - The subtitle of the row
     * @param {string} options.settingName - The name of the setting containing the keybinding
     * @returns {Adw.ActionRow} - The created row
     */
    _createKeybindingRow({settings, title, subtitle, settingName}) {
        const row = new Adw.ActionRow({
            title: this.gettext(title),
            subtitle: this.gettext(subtitle),
        });

        const button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            label: this._getAcceleratorLabel(settings.get_strv(settingName)[0] || ''),
        });

        button.connect('clicked', () => {
            this._showShortcutDialog(settings, settingName, button);
        });

        row.add_suffix(button);
        row.activatable_widget = button;

        return row;
    };

    /**
     * Get a human-readable label for an accelerator
     * @param {string} accelerator - The accelerator string
     * @returns {string} - A human-readable label
     */
    _getAcceleratorLabel(accelerator) {
        if (!accelerator || accelerator === '')
            return 'Click to set shortcut';

        return accelerator;
    }

    /**
     * Show a dialog to set a keyboard shortcut
     * @param {Gio.Settings} settings - The settings object
     * @param {string} settingName - The name of the setting containing the keybinding
     * @param {Gtk.Button} button - The button that was clicked to open the dialog
     */
    _showShortcutDialog(settings, settingName, button) {
        const dialog = new Gtk.Dialog({
            title: 'Set Keyboard Shortcut',
            use_header_bar: true,
            modal: true,
            resizable: false,
        });

        dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        dialog.add_button('Set', Gtk.ResponseType.OK);
        dialog.set_default_response(Gtk.ResponseType.OK);

        const contentArea = dialog.get_content_area();
        contentArea.spacing = 10;
        contentArea.margin_top = 10;
        contentArea.margin_bottom = 10;
        contentArea.margin_start = 10;
        contentArea.margin_end = 10;

        const label = new Gtk.Label({
            label: 'Press a key combination to set as shortcut',
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            hexpand: true,
            vexpand: true,
        });
        contentArea.append(label);

        let keyval = 0;
        let mask = 0;

        const controller = new Gtk.EventControllerKey();
        dialog.add_controller(controller);

        controller.connect('key-pressed', (controller, keyval_, keycode, state) => {
            keyval = keyval_;
            mask = state;

            // Ignore modifier keys on their own
            if (keyval === Gdk.KEY_Control_L || keyval === Gdk.KEY_Control_R ||
                keyval === Gdk.KEY_Shift_L || keyval === Gdk.KEY_Shift_R ||
                keyval === Gdk.KEY_Alt_L || keyval === Gdk.KEY_Alt_R ||
                keyval === Gdk.KEY_Super_L || keyval === Gdk.KEY_Super_R)
                return false;

            // Create accelerator string
            const accelerator = Gtk.accelerator_name(keyval, mask);
            label.set_text(`Shortcut: ${accelerator}`);

            return true;
        });

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK && keyval !== 0) {
                const accelerator = Gtk.accelerator_name(keyval, mask);
                settings.set_strv(settingName, [accelerator]);
                button.set_label(this._getAcceleratorLabel(accelerator));
            }
            dialog.destroy();
        });

        dialog.show();
    }
}
