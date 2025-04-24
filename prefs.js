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
        // Add rows to group and group to the page
        generalGroup.add(chatgptUrlRow);
        generalGroup.add(apiTokenRow);
        page.add(generalGroup);

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
