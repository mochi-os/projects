# Mochi Projects app Makefile

APP = $(notdir $(CURDIR))
VERSION = $(shell grep -m1 '"version"' app.json | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
RELEASE = ../../release

all: web/dist/index.html

clean:
	rm -rf web/dist

web/dist/index.html: $(shell find web/src ../../lib/web/src -type f 2>/dev/null)
	cd web && pnpm run build

release: web/dist/index.html
	rm -f $(RELEASE)/$(APP)_*.zip
	zip -r $(RELEASE)/$(APP)_$(VERSION).zip app.json *.star labels templates web/dist

deploy:
	../../test/claude/deploy.sh $(APP)

commit:
	git add -A && git commit -m "$(VERSION)" || true

android:
	cd android && ./gradlew assembleDebug

android-release:
	cd android && ./gradlew assembleRelease

android-install:
	cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk

android-clean:
	cd android && ./gradlew clean

push:
	git push --follow-tags
