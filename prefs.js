'use strict';

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GObject from 'gi://GObject';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class OpenAIShortcutsPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Use the same gettext domain as the extension
        const gettext = this.gettext.bind(this);

        // Create a preference page and group
        const page = new Adw.PreferencesPage();
        const generalGroup = new Adw.PreferencesGroup({
            title: gettext('General Settings'),
        });
        page.add(generalGroup);

        // ChatGPT URL setting
        const chatgptUrlRow = new Adw.ActionRow({
            title: gettext('ChatGPT URL'),
            subtitle: gettext('URL to open when clicking on the ChatGPT menu item'),
        });
        generalGroup.add(chatgptUrlRow);

        // Create settings
        const settings = this.getSettings();

        // Create entry for ChatGPT URL
        const chatgptUrlEntry = new Gtk.Entry({
            text: settings.get_string('chatgpt-url'),
            valign: Gtk.Align.CENTER,
            hexpand: true,
        });
        chatgptUrlRow.add_suffix(chatgptUrlEntry);
        chatgptUrlRow.activatable_widget = chatgptUrlEntry;

        // Connect to changes
        chatgptUrlEntry.connect('changed', entry => {
            settings.set_string('chatgpt-url', entry.get_text());
        });


        // Add the page to the window
        window.add(page);
    }
}
