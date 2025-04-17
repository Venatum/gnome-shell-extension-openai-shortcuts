EXTENSION_UUID=$(shell jq -r '.uuid' metadata.json)
EXTENSION_NAME=$(shell jq -r '.uuid' metadata.json | cut -d '@' -f1)
EXTENSION_DIR=~/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)

SRC=metadata.json *.js stylesheet.css icons schemas

# Commandes
GNOME_EXTENSIONS=gnome-extensions
GJS=gjs

compile-schemas:
	@echo "🔄 Compiling schemas..."
	@glib-compile-schemas schemas/

#install: uninstall
install: compile-schemas
	@echo "📂 Installing GNOME extension..."
	@mkdir -p $(EXTENSION_DIR)
	@cp -r $(SRC) $(EXTENSION_DIR)/
	@glib-compile-schemas $(EXTENSION_DIR)/schemas/
	@$(GNOME_EXTENSIONS) disable $(EXTENSION_UUID) || true
	@$(GNOME_EXTENSIONS) enable $(EXTENSION_UUID)
	@echo "✅ Extension installed and enabled!"

uninstall:
	@echo "🗑️ Removing the extension..."
	@$(GNOME_EXTENSIONS) disable $(EXTENSION_UUID) || true
	@rm -rf $(EXTENSION_DIR)
	@echo "✅ Extension removed!"

#reload:
#	@echo "🔄 Reloading GNOME Shell..."
#	@killall -3 gnome-shell || true
#	@echo "✅ GNOME Shell reloaded!"

debug:
	@echo "📜 Displaying GNOME Shell logs..."
	@journalctl -f -o cat /usr/bin/gnome-shell

package:
	@echo "📦 Creating ZIP package..."
	@zip -r $(EXTENSION_UUID).zip $(SRC)
	@echo "✅ Package ready: $(EXTENSION_UUID).zip"

test:
	@echo "🧪 Test de l'extension avec GJS..."
	@cd $(EXTENSION_DIR)
	@$(GJS) extension.js
	@cd -
	@echo "✅ Test terminé !"

wayland:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=1920x1080 dbus-run-session -- gnome-shell --nested --wayland

.PHONY: install uninstall reload debug package test compile-schemas
