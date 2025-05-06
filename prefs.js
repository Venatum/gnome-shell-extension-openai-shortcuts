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

        // Get the current shortcuts
        const shortcuts = this._getShortcuts(settings);

        // Create a box to hold the shortcuts list and buttons
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            margin_top: 10,
            margin_bottom: 10,
        });

        // Create a list box to hold the shortcuts
        this.shortcutsListBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            css_classes: ['boxed-list'],
        });

        // Add each shortcut to the list
        shortcuts.forEach((shortcut, index) => {
            const shortcutRow = this._createShortcutRow(settings, shortcut, index);
            this.shortcutsListBox.append(shortcutRow);
        });

        // Add the list box to the box
        box.append(this.shortcutsListBox);

        // Create a button box for add/remove buttons
        const buttonBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
            halign: Gtk.Align.END,
            margin_top: 10,
        });

        // Add button
        const addButton = new Gtk.Button({
            label: 'Add Shortcut',
            css_classes: ['suggested-action'],
        });
        addButton.connect('clicked', () => {
            this._addShortcut(settings);
        });
        buttonBox.append(addButton);

        // Add the button box to the box
        box.append(buttonBox);

        // Add the box to the group
        const row = new Adw.ActionRow();
        row.add_suffix(box);
        shortcutsGroup.add(row);

        return shortcutsGroup;
    }

    /**
     * Get the shortcuts from settings
     * @param {Gio.Settings} settings - The settings object
     * @returns {Array} - Array of shortcut objects
     */
    _getShortcuts(settings) {
        const shortcutsStrings = settings.get_strv('custom-shortcuts');
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
     * Save the shortcuts to settings
     * @param {Gio.Settings} settings - The settings object
     * @param {Array} shortcuts - Array of shortcut objects
     */
    _saveShortcuts(settings, shortcuts) {
        const shortcutsStrings = shortcuts.map(shortcut => JSON.stringify(shortcut));
        settings.set_strv('custom-shortcuts', shortcutsStrings);
    }

    /**
     * Add a new shortcut
     * @param {Gio.Settings} settings - The settings object
     */
    _addShortcut(settings) {
        const shortcuts = this._getShortcuts(settings);

        // Create a new shortcut with default values
        const newShortcut = {
            name: `Shortcut ${shortcuts.length + 1}`,
            prefix: 'custom: ',
            keybinding: ''
        };

        shortcuts.push(newShortcut);
        this._saveShortcuts(settings, shortcuts);

        // Clear the individual keybinding setting for the new shortcut
        const bindingName = `custom-shortcut-${shortcuts.length - 1}`;
        settings.set_strv(bindingName, []);

        // Add the new shortcut to the list
        const shortcutRow = this._createShortcutRow(settings, newShortcut, shortcuts.length - 1);
        this.shortcutsListBox.append(shortcutRow);
    }

    /**
     * Remove a shortcut
     * @param {Gio.Settings} settings - The settings object
     * @param {number} index - The index of the shortcut to remove
     */
    _removeShortcut(settings, index) {
        const shortcuts = this._getShortcuts(settings);

        // Clear the individual keybinding setting
        const bindingName = `custom-shortcut-${index}`;
        settings.set_strv(bindingName, []);

        // Remove the shortcut
        shortcuts.splice(index, 1);
        this._saveShortcuts(settings, shortcuts);

        // Update the individual keybinding settings for all shortcuts after the removed one
        for (let i = index; i < shortcuts.length; i++) {
            const newBindingName = `custom-shortcut-${i}`;
            const nextBindingName = `custom-shortcut-${i + 1}`;

            // If the shortcut has a keybinding, update the setting
            if (shortcuts[i].keybinding && shortcuts[i].keybinding !== '') {
                settings.set_strv(newBindingName, [shortcuts[i].keybinding]);
            }

            // Clear the next binding if it exists (to avoid duplicates)
            if (i === shortcuts.length - 1) {
                settings.set_strv(nextBindingName, []);
            }
        }

        // Rebuild the list
        this.shortcutsListBox.remove_all();
        shortcuts.forEach((shortcut, index) => {
            const shortcutRow = this._createShortcutRow(settings, shortcut, index);
            this.shortcutsListBox.append(shortcutRow);
        });
    }

    /**
     * Create a row for a shortcut
     * @param {Gio.Settings} settings - The settings object
     * @param {Object} shortcut - The shortcut object
     * @param {number} index - The index of the shortcut
     * @returns {Gtk.ListBoxRow} - The created row
     */
    _createShortcutRow(settings, shortcut, index) {
        const row = new Gtk.ListBoxRow();

        // Create a vertical box for the row content
        const rowBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 10,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
        });

        // First row: Name
        const nameBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
        });

        const nameLabel = new Gtk.Label({
            label: 'Name:',
            width_request: 60,
            halign: Gtk.Align.START,
        });
        nameBox.append(nameLabel);

        const nameEntry = new Gtk.Entry({
            text: shortcut.name,
            hexpand: true,
        });
        nameEntry.connect('changed', widget => {
            const shortcuts = this._getShortcuts(settings);
            shortcuts[index].name = widget.get_text();
            this._saveShortcuts(settings, shortcuts);
        });
        nameBox.append(nameEntry);

        // Add the name box to the row
        rowBox.append(nameBox);

        // Second row: Prefix, Shortcut, and Remove button
        const controlsBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 10,
        });

        // Create a prefix entry
        const prefixLabel = new Gtk.Label({
            label: 'Prefix:',
            width_request: 60,
            halign: Gtk.Align.START,
        });
        controlsBox.append(prefixLabel);

        const prefixEntry = new Gtk.Entry({
            text: shortcut.prefix,
            width_request: 100,
        });
        prefixEntry.connect('changed', widget => {
            const shortcuts = this._getShortcuts(settings);
            shortcuts[index].prefix = widget.get_text();
            this._saveShortcuts(settings, shortcuts);
        });
        controlsBox.append(prefixEntry);

        // Create a keybinding button
        const shortcutLabel = new Gtk.Label({
            label: 'Shortcut:',
            width_request: 70,
            halign: Gtk.Align.START,
        });
        controlsBox.append(shortcutLabel);

        const button = new Gtk.Button({
            label: this._getAcceleratorLabel(shortcut.keybinding),
            width_request: 120,
        });
        button.connect('clicked', () => {
            this._showCustomShortcutDialog(settings, index, button);
        });
        controlsBox.append(button);

        // Create a remove button
        const removeButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            css_classes: ['destructive-action'],
        });
        removeButton.connect('clicked', () => {
            this._removeShortcut(settings, index);
        });
        controlsBox.append(removeButton);

        // Add the controls box to the row
        rowBox.append(controlsBox);

        row.set_child(rowBox);
        return row;
    }

    /**
     * Show a dialog to set a keyboard shortcut for a custom shortcut
     * @param {Gio.Settings} settings - The settings object
     * @param {number} index - The index of the shortcut
     * @param {Gtk.Button} button - The button that was clicked to open the dialog
     */
    _showCustomShortcutDialog(settings, index, button) {
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

                // Update the shortcut in the custom-shortcuts setting
                const shortcuts = this._getShortcuts(settings);
                shortcuts[index].keybinding = accelerator;
                this._saveShortcuts(settings, shortcuts);

                // Update the individual keybinding setting
                const bindingName = `custom-shortcut-${index}`;
                settings.set_strv(bindingName, [accelerator]);

                button.set_label(this._getAcceleratorLabel(accelerator));
            }
            dialog.destroy();
        });

        dialog.show();
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
     * Create a keybinding row with a button to set the shortcut and an entry for the prefix
     * @param {Object} options - Options for the row
     * @param {Gio.Settings} options.settings - The settings object
     * @param {string} options.title - The title of the row
     * @param {string} options.subtitle - The subtitle of the row
     * @param {string} options.settingName - The name of the setting containing the keybinding
     * @param {string} options.prefixSettingName - The name of the setting containing the prefix
     * @returns {Adw.ActionRow} - The created row
     */
    _createKeybindingRow({settings, title, subtitle, settingName, prefixSettingName}) {
        const row = new Adw.ActionRow({
            title: this.gettext(title),
            subtitle: this.gettext(subtitle),
        });

        // Create a vertical box to hold the prefix and keybinding
        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 5,
            valign: Gtk.Align.CENTER,
        });

        // Create prefix container
        const prefixBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 5,
            halign: Gtk.Align.END,
        });

        // Create prefix entry
        const prefixEntry = new Gtk.Entry({
            text: settings.get_string(prefixSettingName),
            valign: Gtk.Align.CENTER,
            width_request: 120,
        });

        prefixEntry.connect('changed', widget => {
            settings.set_string(prefixSettingName, widget.get_text());
        });

        // Add prefix label
        const prefixLabel = new Gtk.Label({
            label: 'Prefix:',
            valign: Gtk.Align.CENTER,
            margin_end: 5,
        });

        prefixBox.append(prefixLabel);
        prefixBox.append(prefixEntry);

        // Create keybinding container
        const keybindingBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 5,
            halign: Gtk.Align.END,
        });

        // Create keybinding button
        const button = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            label: this._getAcceleratorLabel(settings.get_strv(settingName)[0] || ''),
        });

        button.connect('clicked', () => {
            this._showShortcutDialog(settings, settingName, button);
        });

        // Add shortcut label
        const shortcutLabel = new Gtk.Label({
            label: 'Shortcut:',
            valign: Gtk.Align.CENTER,
            margin_end: 5,
        });

        keybindingBox.append(shortcutLabel);
        keybindingBox.append(button);

        // Add the prefix and keybinding boxes to the vertical box
        box.append(prefixBox);
        box.append(keybindingBox);

        // Add the vertical box to the row
        row.add_suffix(box);
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
