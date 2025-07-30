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
        page.add(this._loggingSettings(settings));

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
        // OpenAI API URL row
        const apiUrlRow = this._createSettingsRow({
            title: 'OpenAI API URL',
            subtitle: 'Base URL for OpenAI API requests',
            defaultValue: settings.get_string('openai-api-url'),
            isPassword: false,
            onChanged: newValue => settings.set_string('openai-api-url', newValue)
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
        generalGroup.add(apiUrlRow);
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

        // Set accessibility properties for the row
        row.accessible_role = Gtk.AccessibleRole.ROW;
        row.accessible_name = `Shortcut: ${shortcut.name}`;
        row.accessible_description = `Custom shortcut with prefix "${shortcut.prefix}"`;

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
        // Set accessibility properties for the label
        nameLabel.accessible_role = Gtk.AccessibleRole.LABEL;
        nameLabel.accessible_name = 'Name';

        nameBox.append(nameLabel);

        const nameEntry = new Gtk.Entry({
            text: shortcut.name,
            hexpand: true,
        });
        // Set accessibility properties for the entry
        nameEntry.accessible_role = Gtk.AccessibleRole.TEXT_BOX;
        nameEntry.accessible_name = 'Shortcut name';
        nameEntry.accessible_description = 'Enter a name for this shortcut';

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
        // Set accessibility properties for the label
        prefixLabel.accessible_role = Gtk.AccessibleRole.LABEL;
        prefixLabel.accessible_name = 'Prefix';

        controlsBox.append(prefixLabel);

        const prefixEntry = new Gtk.Entry({
            text: shortcut.prefix,
            width_request: 100,
        });
        // Set accessibility properties for the entry
        prefixEntry.accessible_role = Gtk.AccessibleRole.TEXT_BOX;
        prefixEntry.accessible_name = 'Shortcut prefix';
        prefixEntry.accessible_description = 'Enter a prefix for this shortcut';

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
        // Set accessibility properties for the label
        shortcutLabel.accessible_role = Gtk.AccessibleRole.LABEL;
        shortcutLabel.accessible_name = 'Shortcut';

        controlsBox.append(shortcutLabel);

        const button = new Gtk.Button({
            label: this._getAcceleratorLabel(shortcut.keybinding),
            width_request: 120,
        });
        // Set accessibility properties for the button
        button.accessible_role = Gtk.AccessibleRole.BUTTON;
        button.accessible_name = 'Set keyboard shortcut';
        button.accessible_description = 'Click to set a keyboard shortcut for this action';

        button.connect('clicked', () => {
            this._showCustomShortcutDialog(settings, index, button);
        });
        controlsBox.append(button);

        // Create a remove button
        const removeButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            css_classes: ['destructive-action'],
        });
        // Set accessibility properties for the button
        removeButton.accessible_role = Gtk.AccessibleRole.BUTTON;
        removeButton.accessible_name = 'Remove shortcut';
        removeButton.accessible_description = 'Remove this shortcut';

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
        const dialog = this._createShortcutDialog();
        const {label, keyState} = this._setupShortcutDialogUI(dialog);
        this._setupShortcutEventHandlers(dialog, label, keyState);
        this._handleShortcutDialogResponse(dialog, settings, index, button, keyState);

        dialog.show();
    }

    /**
     * Create and configure the shortcut dialog
     * @returns {Gtk.Dialog} The configured dialog
     */
    _createShortcutDialog() {
        const dialog = new Gtk.Dialog({
            title: 'Set Keyboard Shortcut',
            use_header_bar: true,
            modal: true,
            resizable: false,
        });

        // Set accessibility properties for the dialog
        dialog.accessible_role = Gtk.AccessibleRole.DIALOG;
        dialog.accessible_name = 'Set Keyboard Shortcut';
        dialog.accessible_description = 'Dialog to set a keyboard shortcut for this custom action';

        const cancelButton = dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        const setButton = dialog.add_button('Set', Gtk.ResponseType.OK);
        dialog.set_default_response(Gtk.ResponseType.OK);

        // Set accessibility properties for the buttons
        this._setButtonAccessibility(cancelButton, 'Cancel', 'Cancel setting the keyboard shortcut');
        this._setButtonAccessibility(setButton, 'Set', 'Apply the keyboard shortcut');

        return dialog;
    }

    /**
     * Set accessibility properties for a button
     * @param {Gtk.Button} button - The button to configure
     * @param {string} name - The accessible name
     * @param {string} description - The accessible description
     */
    _setButtonAccessibility(button, name, description) {
        button.accessible_role = Gtk.AccessibleRole.BUTTON;
        button.accessible_name = name;
        button.accessible_description = description;
    }

    /**
     * Setup the UI elements for the shortcut dialog
     * @param {Gtk.Dialog} dialog - The dialog to setup
     * @returns {Object} Object containing the label and keyState
     */
    _setupShortcutDialogUI(dialog) {
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

        // Set accessibility properties for the label
        label.accessible_role = Gtk.AccessibleRole.LABEL;
        label.accessible_name = 'Press a key combination to set as shortcut';

        contentArea.append(label);

        // Create key state object to track captured keys
        const keyState = {
            keyval: 0,
            mask: 0
        };

        return {label, keyState};
    }

    /**
     * Setup event handlers for the shortcut dialog
     * @param {Gtk.Dialog} dialog - The dialog
     * @param {Gtk.Label} label - The instruction label
     * @param {Object} keyState - Object to store key state
     */
    _setupShortcutEventHandlers(dialog, label, keyState) {
        // Create both EventControllerKey and EventControllerFocus for better X11 compatibility
        const controller = new Gtk.EventControllerKey();
        dialog.add_controller(controller);

        // Add a focus controller to ensure the dialog can receive key events on X11
        const focusController = new Gtk.EventControllerFocus();
        dialog.add_controller(focusController);

        // Ensure the dialog is focused and can receive key events
        dialog.connect('show', () => {
            // Give the dialog focus after it's shown
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                dialog.grab_focus();
                return GLib.SOURCE_REMOVE;
            });
        });

        // Enhanced key-pressed handler with better X11 support
        controller.connect('key-pressed', (controller, keyval, keycode, state) => {
            return this._handleKeyPressed(keyval, state, label, keyState);
        });

        // Add key-released handler for better compatibility
        controller.connect('key-released', () => {
            // This helps ensure the dialog stays responsive on X11
            return false;
        });
    }

    /**
     * Handle key press events in the shortcut dialog
     * @param {number} keyval - The key value
     * @param {number} state - The modifier state
     * @param {Gtk.Label} label - The instruction label
     * @param {Object} keyState - Object to store key state
     * @returns {boolean} Whether the event was handled
     */
    _handleKeyPressed(keyval, state, label, keyState) {
        keyState.keyval = keyval;
        keyState.mask = state;

        // Validate the key input
        const validation = this._validateKeyInput(keyval);
        if (!validation) {
            return false;
        }

        // Clean the modifier mask
        const cleanMask = this._cleanModifierMask(state);

        // Create accelerator string with cleaned mask
        const accelerator = Gtk.accelerator_name(keyval, cleanMask);

        // Final validation of the accelerator
        if (accelerator && accelerator !== '' && cleanMask !== 0) {
            label.set_text(`Shortcut: ${accelerator}`);
            keyState.mask = cleanMask; // Update mask with cleaned version
            return true;
        } else {
            label.set_text('Press a key combination with modifier keys (Ctrl, Alt, Super)');
            return false;
        }
    }

    /**
     * Validates the provided key input to determine whether it should be processed.
     *
     * @param {number} keyval - The key value to be validated, typically from a key event.
     * @return {boolean} Returns true if the key input is valid and should be processed,
     *                   otherwise false for ignored or unwanted keys.
     */
    _validateKeyInput(keyval) {
        // Ignore modifier keys on their own
        const modifierKeys = [
            Gdk.KEY_Control_L, Gdk.KEY_Control_R,
            Gdk.KEY_Shift_L, Gdk.KEY_Shift_R,
            Gdk.KEY_Alt_L, Gdk.KEY_Alt_R,
            Gdk.KEY_Super_L, Gdk.KEY_Super_R,
            Gdk.KEY_Meta_L, Gdk.KEY_Meta_R,
            Gdk.KEY_Hyper_L, Gdk.KEY_Hyper_R
        ];

        if (modifierKeys.includes(keyval)) {
            return false;
        }

        // Filter out unwanted keys
        const unwantedKeys = [
            Gdk.KEY_Escape, Gdk.KEY_Tab,
            Gdk.KEY_Return, Gdk.KEY_KP_Enter,
            Gdk.KEY_BackSpace, Gdk.KEY_Delete
        ];
        return !(unwantedKeys.includes(keyval));
    }

    /**
     * Clean modifier mask to remove unwanted modifiers
     * @param {number} state - The raw modifier state
     * @returns {number} The cleaned modifier mask
     */
    _cleanModifierMask(state) {
        // Remove lock keys and other non-essential modifiers
        return state & (Gdk.ModifierType.SHIFT_MASK |
            Gdk.ModifierType.CONTROL_MASK |
            Gdk.ModifierType.ALT_MASK |
            Gdk.ModifierType.SUPER_MASK |
            Gdk.ModifierType.META_MASK);
    }

    /**
     * Handle dialog response and update settings
     * @param {Gtk.Dialog} dialog - The dialog
     * @param {Gio.Settings} settings - The settings object
     * @param {number} index - The shortcut index
     * @param {Gtk.Button} button - The button to update
     * @param {Object} keyState - The captured key state
     */
    _handleShortcutDialogResponse(dialog, settings, index, button, keyState) {
        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.OK && keyState.keyval !== 0) {
                const accelerator = Gtk.accelerator_name(keyState.keyval, keyState.mask);

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
    }

    _notificationSettings(settings) {
        //// Notification Settings group
        const notificationGroup = new Adw.PreferencesGroup({
            title: this.gettext('Notification Settings'),
        });

        // Set accessibility properties for the group
        notificationGroup.accessible_role = Gtk.AccessibleRole.GROUP;
        notificationGroup.accessible_name = this.gettext('Notification Settings');
        notificationGroup.accessible_description = this.gettext('Configure notification preferences');

        // Enable the Notifications switch
        const enableNotificationsRow = new Adw.ActionRow({
            title: this.gettext('Enable Notifications'),
            subtitle: this.gettext('Show notifications for OpenAI operations'),
        });

        // Set accessibility properties for the row
        enableNotificationsRow.accessible_role = Gtk.AccessibleRole.ROW;
        enableNotificationsRow.accessible_name = this.gettext('Enable Notifications');
        enableNotificationsRow.accessible_description = this.gettext('Show notifications for OpenAI operations');

        const enableNotificationsSwitch = new Gtk.Switch({
            active: settings.get_boolean('enable-notifications'),
            valign: Gtk.Align.CENTER,
        });

        // Set accessibility properties for the switch
        enableNotificationsSwitch.accessible_role = Gtk.AccessibleRole.SWITCH;
        enableNotificationsSwitch.accessible_name = this.gettext('Enable Notifications');
        enableNotificationsSwitch.accessible_description = this.gettext('Toggle to enable or disable notifications');

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

    _loggingSettings(settings) {
        //// Logging Settings group
        const loggingGroup = new Adw.PreferencesGroup({
            title: this.gettext('API Error Logging'),
        });

        // Set accessibility properties for the group
        loggingGroup.accessible_role = Gtk.AccessibleRole.GROUP;
        loggingGroup.accessible_name = this.gettext('API Error Logging');
        loggingGroup.accessible_description = this.gettext('Configure API error logging preferences');

        // Enable API Error Logging switch
        const enableLoggingRow = new Adw.ActionRow({
            title: this.gettext('Enable API Error Logging'),
            subtitle: this.gettext('Log API errors for debugging purposes'),
        });

        // Set accessibility properties for the row
        enableLoggingRow.accessible_role = Gtk.AccessibleRole.ROW;
        enableLoggingRow.accessible_name = this.gettext('Enable API Error Logging');
        enableLoggingRow.accessible_description = this.gettext('Log API errors for debugging purposes');

        const enableLoggingSwitch = new Gtk.Switch({
            active: settings.get_boolean('enable-api-error-logging'),
            valign: Gtk.Align.CENTER,
        });

        // Set accessibility properties for the switch
        enableLoggingSwitch.accessible_role = Gtk.AccessibleRole.SWITCH;
        enableLoggingSwitch.accessible_name = this.gettext('Enable API Error Logging');
        enableLoggingSwitch.accessible_description = this.gettext('Toggle to enable or disable API error logging');

        enableLoggingSwitch.connect('notify::active', widget => {
            settings.set_boolean('enable-api-error-logging', widget.get_active());
        });

        enableLoggingRow.add_suffix(enableLoggingSwitch);
        enableLoggingRow.activatable_widget = enableLoggingSwitch;
        loggingGroup.add(enableLoggingRow);

        // Log Level dropdown
        const logLevelRow = new Adw.ActionRow({
            title: this.gettext('Log Level'),
            subtitle: this.gettext('The level of detail for API error logs'),
        });

        // Set accessibility properties for the row
        logLevelRow.accessible_role = Gtk.AccessibleRole.ROW;
        logLevelRow.accessible_name = this.gettext('Log Level');
        logLevelRow.accessible_description = this.gettext('The level of detail for API error logs');

        // Create a dropdown for log level
        const logLevelModel = new Gtk.StringList();
        logLevelModel.append('error');
        logLevelModel.append('info');
        logLevelModel.append('debug');

        const logLevelDropdown = new Gtk.DropDown({
            model: logLevelModel,
            valign: Gtk.Align.CENTER,
        });

        // Set accessibility properties for the dropdown
        logLevelDropdown.accessible_role = Gtk.AccessibleRole.COMBO_BOX;
        logLevelDropdown.accessible_name = this.gettext('Log Level');
        logLevelDropdown.accessible_description = this.gettext('Select the level of detail for API error logs');

        // Set the active item based on the current setting
        const currentLogLevel = settings.get_string('api-error-log-level');
        switch (currentLogLevel) {
            case 'debug':
                logLevelDropdown.set_selected(2);
                break;
            case 'info':
                logLevelDropdown.set_selected(1);
                break;
            case 'error':
            default:
                logLevelDropdown.set_selected(0);
                break;
        }

        // Connect the signal to update the setting when changed
        logLevelDropdown.connect('notify::selected', widget => {
            const selected = widget.get_selected();
            let logLevel = 'error';
            switch (selected) {
                case 0:
                    logLevel = 'error';
                    break;
                case 1:
                    logLevel = 'info';
                    break;
                case 2:
                    logLevel = 'debug';
                    break;
            }
            settings.set_string('api-error-log-level', logLevel);
        });

        logLevelRow.add_suffix(logLevelDropdown);
        loggingGroup.add(logLevelRow);

        return loggingGroup;
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

        // Set accessibility properties for the row
        row.accessible_role = Gtk.AccessibleRole.GROUP;
        row.accessible_name = this.gettext(title);
        row.accessible_description = this.gettext(subtitle);

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

        // Set accessibility properties for the entry
        entry.accessible_role = Gtk.AccessibleRole.TEXT_BOX;
        entry.accessible_name = this.gettext(title);
        entry.accessible_description = this.gettext(subtitle);

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

        // Set accessibility properties for the dialog
        dialog.accessible_role = Gtk.AccessibleRole.DIALOG;
        dialog.accessible_name = 'Set Keyboard Shortcut';
        dialog.accessible_description = 'Dialog to set a keyboard shortcut for this action';

        const cancelButton = dialog.add_button('Cancel', Gtk.ResponseType.CANCEL);
        const setButton = dialog.add_button('Set', Gtk.ResponseType.OK);
        dialog.set_default_response(Gtk.ResponseType.OK);

        // Set accessibility properties for the buttons
        cancelButton.accessible_role = Gtk.AccessibleRole.BUTTON;
        cancelButton.accessible_name = 'Cancel';
        cancelButton.accessible_description = 'Cancel setting the keyboard shortcut';

        setButton.accessible_role = Gtk.AccessibleRole.BUTTON;
        setButton.accessible_name = 'Set';
        setButton.accessible_description = 'Apply the keyboard shortcut';

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

        // Set accessibility properties for the label
        label.accessible_role = Gtk.AccessibleRole.LABEL;
        label.accessible_name = 'Press a key combination to set as shortcut';

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
