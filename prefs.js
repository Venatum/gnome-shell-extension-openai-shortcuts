'use strict';

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class OpenAIShortcutsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Use the same gettext domain as the extension
        this.gettext = this.gettext.bind(this);
        const settings = this.getSettings();

        // Create a preference page and group
        const page = new Adw.PreferencesPage();

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
        page.add(generalGroup);

        //// Notification Settings group
        const notificationGroup = new Adw.PreferencesGroup({
            title: this.gettext('Notification Settings'),
        });

        // Enable Notifications switch
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
        page.add(notificationGroup);

        //// Shortcuts group
        const shortcutsGroup = new Adw.PreferencesGroup({
            title: this.gettext('Shortcuts'),
        });
        page.add(shortcutsGroup);

        // Add the page to the window
        window.add(page);
    }

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

}
